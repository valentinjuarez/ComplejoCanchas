import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3001', 'https://complejo-canchas.vercel.app'],
    credentials: true,
  });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  console.log('[BOOT] PORT env =', process.env.PORT);
  console.log('[BOOT] Listening on', port);

  await app.listen(port, '0.0.0.0');

  console.log('[BOOT] Server started');
}
bootstrap();
