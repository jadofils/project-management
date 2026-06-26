import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { seedDatabase } from './database/seeder';
import { DataSource } from 'typeorm';

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.onrender\.com$/,
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // allow non-browser clients (curl, Postman, server-to-server)
  const extra = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
  return ALLOWED_ORIGINS.some(r => r.test(origin)) || extra.includes(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const handleCorsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    cb(null, isOriginAllowed(origin));
  };

  app.enableCors({
    origin: handleCorsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));

  await app.listen(process.env.PORT || 4001);
  console.log(`✅ API running on port ${process.env.PORT || 4001}`);

  try {
    const dataSource = app.get(DataSource);
    await seedDatabase(dataSource);
  } catch (e) {
    console.error('[seeder] Failed:', e);
  }
}
bootstrap();
