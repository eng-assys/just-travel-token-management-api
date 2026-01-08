import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TokensManagementService } from 'src/tokens-management/tokens-management.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensManagementService: TokensManagementService,
  ) {}

  async run() {
    try {
      await this.prisma.usageHistory.deleteMany();
      await this.prisma.token.deleteMany();

      const currentUserId = '3a2775bb-b388-4595-a1ae-8a5eb6c59605';

      await this.seedTokens();

      for (let index = 0; index < 10; index++) {
        await this.tokensManagementService.claimToken({
          userId: currentUserId,
        });
      }
    } catch (error) {
      console.error('❌ Error running seed:', error);
      process.exit(1);
    }
  }

  private async seedTokens() {
    console.log('🌱 Seeding tokens...');

    const tokensToCreate = Array.from({ length: 100 }).map(() => ({
      status: 'AVAILABLE' as const,
    }));

    const result = await this.prisma.token.createMany({
      data: tokensToCreate,
      skipDuplicates: true,
    });
    console.log(`✅ Success: ${result.count} tokens created in the database.`);
  }
}
