import { Module, OnModuleInit } from '@nestjs/common';
import { TokensManagementService } from './tokens-management.service';
import { TokensManagementController } from './tokens-management.controller';
import { PrismaService } from 'src/prisma.service';
import configuration from 'config/configuration';

@Module({
  controllers: [TokensManagementController],
  providers: [TokensManagementService, PrismaService],
})
export class TokensManagementModule implements OnModuleInit {
  constructor(
    private readonly tokensManagementService: TokensManagementService,
  ) {}

  async onModuleInit() {
    if (configuration().api.runSeedOnStartup) {
      await this.tokensManagementService.seed();
    }
  }
}
