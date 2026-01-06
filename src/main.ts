import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from 'config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(configuration().api.port ?? 3000);
}
bootstrap();
