import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    'http://localhost:3000', 'http://localhost:4000',
    'https://project-manager-frontend.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 4001);
  console.log(`✅ Task Manager API running on http://localhost:${process.env.PORT || 4001}/api`);
}
bootstrap();
