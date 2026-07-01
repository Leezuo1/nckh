import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // JWT_SECRET bắt buộc phải có (đã kiểm tra & throw ở jwt.strategy.ts nếu thiếu)
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' }, // access token; refresh token tự quản riêng trong AuthService
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
