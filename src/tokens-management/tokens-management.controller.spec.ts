import { Test, TestingModule } from '@nestjs/testing';
import { TokensManagementController } from './tokens-management.controller';
import { TokensManagementService } from './tokens-management.service';

describe('TokensManagementController', () => {
  let controller: TokensManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensManagementController],
      providers: [TokensManagementService],
    }).compile();

    controller = module.get<TokensManagementController>(TokensManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
