import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [SeedService, PrismaService],
})
export class SeedModule {}
