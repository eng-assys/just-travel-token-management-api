import { Module } from '@nestjs/common';
import { TokensManagementService } from './tokens-management.service';
import { TokensManagementController } from './tokens-management.controller';
import { PrismaService } from '../database/prisma/prisma.service';

@Module({
  controllers: [TokensManagementController],
  providers: [TokensManagementService, PrismaService],
})
export class TokensManagementModule {}
