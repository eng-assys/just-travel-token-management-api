import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimTokenDto } from './dtos/claim-token.dto';
import { TokenStatus } from '../generated/prisma/enums';
import { ListTokenQueryDto } from './dtos/list-token-query.dto';
import { NoTokenAvailableException } from './errors/no-token-available-bad-request.error';

@Injectable()
export class TokensManagementService {
  constructor(private prisma: PrismaService) {}

  async seed() {
    try {
      console.log('🌱 Seeding tokens...');
      await this.prisma.usageHistory.deleteMany();
      await this.prisma.token.deleteMany();

      const tokensToCreate = Array.from({ length: 100 }).map(() => ({
        status: 'AVAILABLE' as const,
      }));

      const result = await this.prisma.token.createMany({
        data: tokensToCreate,
        skipDuplicates: true,
      });

      console.log(
        `✅ Success: ${result.count} tokens created in the database.`,
      );
    } catch (error) {
      console.error('❌ Error running seed:', error);
      process.exit(1);
    }
  }

  async claimToken(body: ClaimTokenDto) {
    const token = await this.prisma.token.findFirst({
      where: {
        status: TokenStatus.AVAILABLE,
      },
    });

    if (!token) {
      throw new NoTokenAvailableException();
    }

    return await this.prisma.token.update({
      where: { id: token.id },
      data: { status: TokenStatus.ACTIVE, currentUserId: body.userId },
    });
  }

  async listTokens(query: ListTokenQueryDto) {
    const whereConditions: any = {};

    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 100;
    const offset = (page - 1) * limit;

    if (query.status) {
      whereConditions.status = query.status;
    }

    const result = await this.prisma.token.findMany({
      where: whereConditions,
      skip: offset,
      take: limit,
    });

    return { items: result, page, limit };
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
    return this.prisma.token.updateMany({
      where: { status: TokenStatus.ACTIVE },
      data: { status: TokenStatus.AVAILABLE },
    });
  }
}
