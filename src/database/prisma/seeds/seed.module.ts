import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PrismaService } from '../prisma.service';
import { TokensManagementService } from 'src/tokens-management/tokens-management.service';

@Module({
  providers: [SeedService, PrismaService, TokensManagementService],
})
export class SeedModule {}
