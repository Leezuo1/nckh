import 'dotenv/config'; // Load .env vào process.env trước khi app khởi động
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép frontend gọi API.
  // Dev: mặc định các port Vite localhost. Production: thêm domain thật qua biến
  // CORS_ORIGINS trong .env (nhiều domain ngăn cách bằng dấu phẩy),
  // vd: CORS_ORIGINS="https://nckh.vlu.edu.vn,https://nckh.vercel.app"
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3001',
  ];
  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [...defaultOrigins, ...envOrigins],
    credentials: true,
  });

  // Validate request body tự động
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Đổi lỗi Prisma "lọt" ra ngoài thành HTTP 4xx sạch (toàn hệ thống)
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Prefix tất cả routes với /api
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running at http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
