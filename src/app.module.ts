import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TokensManagementModule } from './tokens-management/tokens-management.module';
import configuration from 'config/configuration';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TokensManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
