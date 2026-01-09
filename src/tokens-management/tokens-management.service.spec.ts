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

  describe('listTokens', () => {
    it('should list tokens with pagination meta data', async () => {
      const tokenId1 = 'ffa2040f-c2ff-49ba-8b81-9a3b24058edb';
      const tokenId2 = 'ed400e5b-ebbd-4938-b6d2-7842940cde89';

      // Mocking the individual promises inside the transaction array
      prisma.token.findMany.mockResolvedValue([
        { id: tokenId1 },
        { id: tokenId2 },
      ] as any);
      prisma.token.count.mockResolvedValue(20); // Simulates 20 total

      const result = await service.listTokens({
        page: '1',
        limit: '10',
        status: TokenStatus.AVAILABLE,
      });

      // Checks if findMany was called correctly
      expect(prisma.token.findMany).toHaveBeenCalledWith({
        where: { status: TokenStatus.AVAILABLE },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10,
      });

      // Checks if count was called
      expect(prisma.token.count).toHaveBeenCalledWith({
        where: { status: TokenStatus.AVAILABLE },
      });

      // Checks the new return structure
      expect(result.items.length).toBe(2);
      expect(result.meta).toEqual({
        total: 20,
        page: 1,
        limit: 10,
        lastPage: 2, // 20 / 10 = 2
      });
    });
  });

  describe('tokenDetail & History', () => {
    it('should return token detail', async () => {
      const tokenId = '3756a2ad-e739-47dc-af2d-1d3e96caf72d';
      prisma.token.findUnique.mockResolvedValue({ id: tokenId } as any);

      await service.tokenDetail(tokenId);
      expect(prisma.token.findUnique).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });

    it('should return history', async () => {
      const tokenId = '3756a2ad-e739-47dc-af2d-1d3e96caf72d';
      prisma.usageHistory.findMany.mockResolvedValue([]);

      await service.tokenHistory(tokenId);
      expect(prisma.usageHistory.findMany).toHaveBeenCalledWith({
        where: { tokenId },
        orderBy: { activatedAt: 'desc' },
      });
    });
  });

  describe('clearActiveTokens', () => {
    it('should do nothing if no active tokens found', async () => {
      prisma.token.findMany.mockResolvedValue([]); // None active

      const result = await service.clearActiveTokens();

      expect(result).toEqual({ totalExpired: 0, expiredTokensIds: [] });
      expect(prisma.usageHistory.updateMany).not.toHaveBeenCalled();
    });

    it('should clear active tokens and release history', async () => {
      const activeTokens = [
        { id: '2b71b04a-9596-4608-9a56-e1b630044416' },
        { id: '3b390978-5707-4481-be48-01793bd2581c' },
      ];
      prisma.token.findMany.mockResolvedValue(activeTokens as any);

      // Mocks for operations inside the transaction array
      prisma.usageHistory.updateMany.mockResolvedValue({ count: 2 } as any);
      prisma.token.updateMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.clearActiveTokens();

      expect(prisma.token.findMany).toHaveBeenCalledWith({
        where: { status: TokenStatus.ACTIVE },
        select: { id: true },
      });

      // Checks if updateMany was called for history
      expect(prisma.usageHistory.updateMany).toHaveBeenCalledWith({
        where: {
          tokenId: {
            in: [
              '2b71b04a-9596-4608-9a56-e1b630044416',
              '3b390978-5707-4481-be48-01793bd2581c',
            ],
          },
          releasedAt: null,
        },
        data: { releasedAt: expect.any(Date) },
      });

      // Checks if updateMany was called for tokens
      expect(prisma.token.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [
              '2b71b04a-9596-4608-9a56-e1b630044416',
              '3b390978-5707-4481-be48-01793bd2581c',
            ],
          },
        },
        data: {
          status: TokenStatus.AVAILABLE,
          currentUserId: null,
        },
      });

      expect(result?.totalExpired).toBe(2);
    });
  });

  describe('expireOldActiveTokens (Cron)', () => {
    it('should find expired tokens and run clear logic', async () => {
      const expiredTokens = [{ id: '8f3bc786-2fe2-4def-90b2-47821caf0f6a' }];
      prisma.token.findMany.mockResolvedValue(expiredTokens as any);

      // Simulates success in the internal transaction
      prisma.usageHistory.updateMany.mockResolvedValue({ count: 1 } as any);
      prisma.token.updateMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.expireOldActiveTokens();

      expect(prisma.token.findMany).toHaveBeenCalledWith({
        where: {
          status: TokenStatus.ACTIVE,
          updatedAt: { lt: expect.any(Date) }, // Checks calculated date
        },
        select: { id: true },
      });

      expect(result?.totalExpired).toBe(1);
    });
  });
});
