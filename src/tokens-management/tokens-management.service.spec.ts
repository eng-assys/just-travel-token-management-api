jest.mock('../database/prisma/prisma.service');

import { Test, TestingModule } from '@nestjs/testing';
import { TokensManagementService } from './tokens-management.service';
import { TokenStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma/prisma.service';
import { NoTokenAvailableException } from './errors/no-token-available-bad-request.error';

// Mock of the Prisma Client object used INSIDE the transaction (the 'tx')
const mockPrismaTx = {
  $queryRaw: jest.fn(),
  token: {
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  usageHistory: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('TokensManagementService', () => {
  let service: TokensManagementService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensManagementService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            token: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
            usageHistory: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TokensManagementService>(TokensManagementService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();

    // CRITICAL IMPLEMENTATION:
    // Mock $transaction to handle two cases:
    // 1. Array of Promises (used in listTokens and clearActiveTokens)
    // 2. Callback Function (used in claimToken - interactive transaction)
    prisma.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return arg(mockPrismaTx); // Executes the callback passing the transaction mock
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
  });

  describe('claimToken', () => {
    const userId = '56096914-1613-4de3-9a01-a4c75758e9f3';
    const tokenId = '718d3b2e-3c3b-4fe0-9723-4218f67f7287';

    it('should claim an available token via raw query transaction', async () => {
      const availableToken = { id: tokenId, status: TokenStatus.AVAILABLE };

      // Mocking the $queryRaw return INSIDE the transaction
      mockPrismaTx.$queryRaw.mockResolvedValue([availableToken]);

      // Mocking the update INSIDE the transaction
      mockPrismaTx.token.update.mockResolvedValue({
        ...availableToken,
        status: TokenStatus.ACTIVE,
        currentUserId: userId,
      });

      mockPrismaTx.usageHistory.create.mockResolvedValue({} as any);

      const result = await service.claimToken({ userId });

      // Checks if raw query was called
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);

      // Checks update
      expect(mockPrismaTx.token.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: {
          status: TokenStatus.ACTIVE,
          currentUserId: userId,
        },
      });

      // Checks history creation
      expect(mockPrismaTx.usageHistory.create).toHaveBeenCalledWith({
        data: {
          tokenId: tokenId,
          userId: userId,
        },
      });

      expect(result.status).toBe(TokenStatus.ACTIVE);
      expect(result.currentUserId).toBe(userId);
      expect(result.isTokenReleasedFromOlderActivation).toBe(false);
    });

    it('should force expire an older token if none available', async () => {
      const oldActiveToken = { id: 'old-token-id', status: TokenStatus.ACTIVE };

      // First call (search available): returns empty
      // Second call (search older active): returns old token
      mockPrismaTx.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([oldActiveToken]);

      mockPrismaTx.token.update.mockResolvedValue({
        ...oldActiveToken,
        status: TokenStatus.ACTIVE,
        currentUserId: userId,
      });

      const result = await service.claimToken({ userId });

      // Should try to fetch available, fail, and fetch older active
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(2);

      // Should release the history of the old token
      expect(mockPrismaTx.usageHistory.updateMany).toHaveBeenCalledWith({
        where: { tokenId: oldActiveToken.id, releasedAt: null },
        data: { releasedAt: expect.any(Date) },
      });

      // Should update the token for the new user
      expect(mockPrismaTx.token.update).toHaveBeenCalledWith({
        where: { id: oldActiveToken.id },
        data: expect.any(Object),
      });

      expect(result.id).toBe(oldActiveToken.id);
      expect(result.isTokenReleasedFromOlderActivation).toBe(true);
    });

    it('should throw error if absolutely no token is available or active', async () => {
      // Both queries return empty
      mockPrismaTx.$queryRaw.mockResolvedValue([]);

      await expect(service.claimToken({ userId })).rejects.toThrow(
        NoTokenAvailableException,
      );
    });
  });
});
