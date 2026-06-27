import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { seedDatabase } from './database/seeder';
import { RequestLogInterceptor } from './common/request-log.interceptor';
import { DataSource } from 'typeorm';

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.onrender\.com$/,
  'https://project-management-nine-roan.vercel.app',
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const extra = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
  return ALLOWED_ORIGINS.some(r => (typeof r === 'string' ? r === origin : r.test(origin))) || extra.includes(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }));

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
  app.useGlobalInterceptors(new RequestLogInterceptor());

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
