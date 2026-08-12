import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { CredentialsLoginDto } from './dto/credentials-login.dto';
import { VluLoginDto } from './dto/vlu-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/microsoft
  // Frontend gửi accessToken từ MSAL.js → nhận về JWT + user info
  @Post('microsoft')
  async loginWithMicrosoft(@Body() dto: MicrosoftLoginDto) {
    return this.authService.loginWithMicrosoft(dto.accessToken);
  }

  // POST /api/auth/microsoft/code — Frontend gửi authorization code, backend đổi ra token
  // bằng ClientSecret (confidential flow, chạy với redirect loại "Web").
  @Post('microsoft/code')
  async loginWithMicrosoftCode(@Body() body: { code: string; redirectUri: string }) {
    return this.authService.loginWithMicrosoftCode(body.code, body.redirectUri);
  }

  // POST /api/auth/login — Đăng nhập bằng mã số (MSSV/MSGV) + mật khẩu nội bộ
  @Post('login')
  async login(@Body() dto: CredentialsLoginDto) {
    return this.authService.loginWithCredentials(dto.code, dto.password);
  }

  // POST /api/auth/vlu-login — Đăng nhập qua cổng đào tạo VLU (online.vlu.edu.vn)
  @Post('vlu-login')
  async loginWithVlu(@Body() dto: VluLoginDto) {
    return this.authService.loginWithVlu(dto.studentId, dto.password);
  }

  // POST /api/auth/refresh
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  // POST /api/auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  // GET /api/auth/me
  // Lấy thông tin user đang đăng nhập
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }
}
