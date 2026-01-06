import { Test, TestingModule } from '@nestjs/testing';
import { TokensManagementService } from './tokens-management.service';

describe('TokensManagementService', () => {
  let service: TokensManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokensManagementService],
    }).compile();

    service = module.get<TokensManagementService>(TokensManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
