import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from 'config/configuration';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Tokens Management')
    .setDescription('Tokens Management API description')
    .setVersion('1.0')
    .addTag('tokens-management')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(configuration().api.port ?? 3000);
}
bootstrap();
