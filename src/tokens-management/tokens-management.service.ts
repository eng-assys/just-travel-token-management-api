import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

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
}
