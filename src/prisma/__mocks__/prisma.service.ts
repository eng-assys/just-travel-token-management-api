export class PrismaService {
  token = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  usageHistory = {
    findMany: jest.fn(),
  };

  $queryRaw = jest.fn();

  $transaction = jest.fn();
}
