jest.mock('../prisma/prisma.service');

import { Test, TestingModule } from '@nestjs/testing';
import { TokensManagementService } from './tokens-management.service';
import { TokenStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NoTokenAvailableException } from './errors/no-token-available-bad-request.error';

describe('TokensManagementService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let service: TokensManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokensManagementService, PrismaService],
    }).compile();

    service = module.get<TokensManagementService>(TokensManagementService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
  });

  it('should claim an available token', async () => {
    const userId = '56096914-1613-4de3-9a01-a4c75758e9f3';
    const tokenId = '718d3b2e-3c3b-4fe0-9723-4218f67f7287';

    const token = { id: tokenId, status: TokenStatus.AVAILABLE };

    prisma.token.findFirst = jest.fn().mockResolvedValue(token);
    prisma.token.update = jest.fn().mockResolvedValue({
      ...token,
      status: TokenStatus.ACTIVE,
      currentUserId: userId,
    });

    const result = await service.claimToken({
      userId: userId,
    });

    expect(prisma.token.findFirst).toHaveBeenCalledWith({
      where: { status: TokenStatus.AVAILABLE },
    });

    expect(prisma.token.update).toHaveBeenCalledWith({
      where: { id: tokenId },
      data: {
        status: TokenStatus.ACTIVE,
        currentUserId: userId,
      },
    });

    expect(result.status).toBe(TokenStatus.ACTIVE);
  });

  it('should throw error if no token is available', async () => {
    const userId = '8a33101c-d7b2-4b6d-8340-788a3701af44';
    prisma.token.findFirst = jest.fn().mockResolvedValue(null);

    await expect(service.claimToken({ userId: userId })).rejects.toThrow(
      NoTokenAvailableException,
    );
  });
});
