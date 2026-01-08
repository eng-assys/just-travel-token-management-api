jest.mock('../prisma/prisma.service');

import { Test, TestingModule } from '@nestjs/testing';
import { TokensManagementService } from './tokens-management.service';
import { TokenStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma/prisma.service';
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
    expect(result.currentUserId).toBe(userId);

    expect(prisma.usageHistory.create).toHaveBeenCalledWith({
      data: {
        tokenId: tokenId,
        activatedAt: expect.any(Date),
        userId: userId,
      },
    });
  });

  it('should throw error if no token is available', async () => {
    const userId = '8a33101c-d7b2-4b6d-8340-788a3701af44';
    prisma.token.findFirst = jest.fn().mockResolvedValue(null);

    await expect(service.claimToken({ userId: userId })).rejects.toThrow(
      NoTokenAvailableException,
    );
  });

  it('should list tokens with pagination and status filter', async () => {
    const tokenId1 = 'f59a4fb5-e7a9-45fe-af7e-114646ae2298';
    const tokenId2 = '9d8d41ca-22cc-426a-8459-6b9269c254cf';

    prisma.token.findMany = jest
      .fn()
      .mockResolvedValue([{ id: tokenId1 }, { id: tokenId2 }]);

    const result = await service.listTokens({
      page: '1',
      limit: '10',
      status: TokenStatus.AVAILABLE,
    });

    expect(prisma.token.findMany).toHaveBeenCalledWith({
      where: { status: TokenStatus.AVAILABLE },
      skip: 0,
      take: 10,
    });

    expect(result.items.length).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should return token detail', async () => {
    const tokenId1 = 'f59a4fb5-e7a9-45fe-af7e-114646ae2298';

    prisma.token.findUnique = jest.fn().mockResolvedValue({
      id: tokenId1,
    });

    const result = await service.tokenDetail(tokenId1);

    expect(prisma.token.findUnique).toHaveBeenCalledWith({
      where: { id: tokenId1 },
    });

    expect(result.id).toBe(tokenId1);
  });

  it('should return token usage history ordered by activatedAt desc', async () => {
    const tokenId1 = 'f59a4fb5-e7a9-45fe-af7e-114646ae2298';
    const usageHistoryId1 = '6236cc75-7a77-4132-886a-8d087d6af891';
    const usageHistoryId2 = 'aefc2fd3-8976-42cd-86ae-b38c4aee53bf';

    prisma.usageHistory.findMany = jest
      .fn()
      .mockResolvedValue([{ id: usageHistoryId1 }, { id: usageHistoryId2 }]);

    const result = await service.tokenHistory(tokenId1);

    expect(prisma.usageHistory.findMany).toHaveBeenCalledWith({
      where: { tokenId: tokenId1 },
      orderBy: { activatedAt: 'desc' },
    });

    expect(result.length).toBe(2);
  });

  it('should clear all active tokens', async () => {
    prisma.token.updateMany = jest.fn().mockResolvedValue({
      count: 3,
    });

    const result = await service.clearActiveTokens();

    expect(prisma.token.updateMany).toHaveBeenCalledWith({
      where: { status: TokenStatus.ACTIVE },
      data: { status: TokenStatus.AVAILABLE },
    });

    expect(result.count).toBe(3);

    expect(prisma.usageHistory.updateMany).toHaveBeenCalledWith({
      where: {
        token: { status: TokenStatus.ACTIVE },
      },
      data: {
        releasedAt: expect.any(Date),
      },
    });
  });
});
