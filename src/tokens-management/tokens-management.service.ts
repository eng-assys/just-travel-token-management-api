import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ClaimTokenDto } from './dtos/claim-token.dto';
import { TokenStatus } from '../generated/prisma/enums';
import { ListTokenQueryDto } from './dtos/list-token-query.dto';
import { NoTokenAvailableException } from './errors/no-token-available-bad-request.error';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Token } from 'src/generated/prisma/browser';

@Injectable()
export class TokensManagementService {
  constructor(private prisma: PrismaService) {}

  async claimToken(body: ClaimTokenDto) {
    return await this.prisma.$transaction(
      async (tx) => {
        const availableTokens = await tx.$queryRaw<Token[]>`
          SELECT * FROM "tokens"
          WHERE "status" = ${TokenStatus.AVAILABLE}
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        let token: Token | null = availableTokens[0];
        let isTokenReleasedFromOlderActivation = false;

        if (!token) {
          token = await this.forceExpireAndGetOlderActiveToken(tx);
          isTokenReleasedFromOlderActivation = true;
        }

        if (!token) throw new NoTokenAvailableException();

        const updatedToken = await tx.token.update({
          where: { id: token.id },
          data: {
            status: TokenStatus.ACTIVE,
            currentUserId: body.userId,
          },
        });

        await tx.usageHistory.create({
          data: {
            tokenId: updatedToken.id,
            userId: body.userId,
          },
        });

        return { ...updatedToken, isTokenReleasedFromOlderActivation };
      },
      {
        timeout: 10000,
      },
    );
  }

  private async forceExpireAndGetOlderActiveToken(
    tx: Prisma.TransactionClient,
  ): Promise<Token | null> {
    const olderTokens = await tx.$queryRaw<Token[]>`
      SELECT * FROM "tokens"
      WHERE "status" = ${TokenStatus.ACTIVE}
      ORDER BY "updatedAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    const olderActiveToken = olderTokens[0];

    if (olderActiveToken) {
      await tx.usageHistory.updateMany({
        where: {
          tokenId: olderActiveToken.id,
          releasedAt: null,
        },
        data: { releasedAt: new Date() },
      });

      return olderActiveToken;
    }

    return null;
  }

  async listTokens(query: ListTokenQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 100;
    const offset = (page - 1) * limit;

    const [tokens, total] = await this.prisma.$transaction([
      this.prisma.token.findMany({
        where: {
          status: query.status,
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.token.count({
        where: { status: query.status },
      }),
    ]);

    return {
      items: tokens,
      meta: {
        total,
        page: page || 1,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async tokenDetail(tokenId: string) {
    return this.prisma.token.findUnique({
      where: { id: tokenId },
    });
  }

  async tokenHistory(tokenId: string) {
    return this.prisma.usageHistory.findMany({
      where: { tokenId },
      orderBy: { activatedAt: 'desc' },
    });
  }

  async clearActiveTokens() {
    const activeTokens = await this.prisma.token.findMany({
      where: {
        status: TokenStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activeTokens.length === 0)
      return { totalExpired: 0, expiredTokensIds: [] };

    const tokenIds = activeTokens.map((t) => t.id);

    return await this.expireByTokensIdsAndReleaseTheirUsageHistories(tokenIds);
  }

  private expireByTokensIdsAndReleaseTheirUsageHistories = async (
    tokenIds: string[],
  ) => {
    try {
      await this.prisma.$transaction([
        this.prisma.usageHistory.updateMany({
          where: {
            tokenId: { in: tokenIds },
            releasedAt: null,
          },
          data: { releasedAt: new Date() },
        }),
        this.prisma.token.updateMany({
          where: { id: { in: tokenIds } },
          data: {
            status: TokenStatus.AVAILABLE,
            currentUserId: null,
          },
        }),
      ]);
      console.log(`✅ Expired ${tokenIds.length} tokens.`);
      return { totalExpired: tokenIds.length, expiredTokensIds: tokenIds };
    } catch (error) {
      console.error('❌ Error expiring tokens:', error);
    }
  };

  @Cron(CronExpression.EVERY_10_SECONDS)
  async expireOldActiveTokens() {
    const expirationDate = new Date(Date.now() - 2 * 60 * 1000);

    const expiredTokens = await this.prisma.token.findMany({
      where: {
        status: TokenStatus.ACTIVE,
        updatedAt: { lt: expirationDate },
      },
      select: { id: true },
    });

    if (expiredTokens.length === 0)
      return { totalExpired: 0, expiredTokensIds: [] };

    const tokenIds = expiredTokens.map((t) => t.id);

    return await this.expireByTokensIdsAndReleaseTheirUsageHistories(tokenIds);
  }
}
