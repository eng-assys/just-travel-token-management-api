import { Module } from '@nestjs/common';
import { TokensManagementService } from './tokens-management.service';
import { TokensManagementController } from './tokens-management.controller';

@Module({
  controllers: [TokensManagementController],
  providers: [TokensManagementService],
})
export class TokensManagementModule {}
