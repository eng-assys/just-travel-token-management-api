import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import configuration from 'config/configuration';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const pool = new Pool({ connectionString: configuration().database.url });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }
}
