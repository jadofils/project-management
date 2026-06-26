import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { seedDatabase } from './database/seeder';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    'http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173',
    'https://project-manager-frontend.vercel.app',
    'https://project-management-nine-roan.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT || 4001);
  console.log(`✅ API running on http://localhost:${process.env.PORT || 4001}/api`);

  // Seed after listen so TypeORM has synced the schema
  try {
    const dataSource = app.get(DataSource);
    await seedDatabase(dataSource);
  } catch (e) {
    console.error('[seeder] Failed:', e);
  }
}
bootstrap();
