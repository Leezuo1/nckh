import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Tạo access + refresh token cho user
  private async issueTokens(user: any) {
    const payload = {
      sub: user.id,
      outlook: user.outlook,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = randomBytes(48).toString('hex');

    // Lưu refresh token vào DB
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  }

  // Đăng nhập Microsoft kiểu CONFIDENTIAL (backend): FE gửi authorization code,
  // backend đổi code -> access token bằng ClientSecret (chạy được với redirect loại "Web",
  // không cần đăng ký SPA). Rồi tái dùng loginWithMicrosoft() để lấy hồ sơ + tạo phiên.
  async loginWithMicrosoftCode(code: string, redirectUri: string) {
    if (!code) throw new UnauthorizedException('Thiếu mã xác thực Microsoft');
    const tenant = process.env.MS_TENANT_ID || 'organizations';
    const clientId = process.env.MS_CLIENT_ID || '';
    const clientSecret = process.env.MS_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Server chưa cấu hình Microsoft (MS_CLIENT_ID/MS_CLIENT_SECRET)');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email User.Read',
    });

    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const tok = await res.json() as any;
    if (!res.ok || !tok.access_token) {
      throw new UnauthorizedException(tok.error_description || 'Không đổi được mã Microsoft sang token');
    }
    return this.loginWithMicrosoft(tok.access_token);
  }

  async loginWithMicrosoft(accessToken: string) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Token Microsoft không hợp lệ');
    }

    const msUser = await response.json() as any;
    const outlook = msUser.mail || msUser.userPrincipalName;

    if (!outlook) {
      throw new UnauthorizedException('Không lấy được thông tin tài khoản Microsoft');
    }

    let user = await this.prisma.user.findUnique({ where: { outlook } });
    let isNewUser = false;

    // Chưa có → tự tạo (toàn bộ SV/GV trường dùng Microsoft 365, không bắt Admin đăng ký sẵn).
    if (!user) {
      // (Tuỳ chọn) chỉ cho phép email thuộc domain trường — set MS_ALLOWED_DOMAINS trong .env
      // vd: MS_ALLOWED_DOMAINS="vanlanguni.vn,vlu.edu.vn". Để trống = cho mọi domain.
      const allowedDomains = (process.env.MS_ALLOWED_DOMAINS || '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const domain = (outlook.split('@')[1] || '').toLowerCase();
      if (allowedDomains.length && !allowedDomains.includes(domain)) {
        throw new UnauthorizedException('Email không thuộc tổ chức được phép đăng nhập');
      }

      const localPart = outlook.split('@')[0];
      // Email VLU dạng "ten.MSSV" (SV) hoặc "ten.ho" (GV). Có dãy số dài (MSSV) = SV, không có = GV.
      const mssv = (localPart.match(/\d{6,}/) || [])[0];
      const isStudent = !!mssv;
      const adminIds = (process.env.ADMIN_VLU_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const role = (adminIds.includes(localPart) || (mssv && adminIds.includes(mssv)))
        ? 'Admin'
        : isStudent
          ? 'Student'
          : 'Lecturer';

      user = await this.prisma.user.create({
        data: {
          userId: localPart,
          fullName: msUser.displayName || localPart, // tên thật từ Microsoft Graph
          faculty: msUser.department || 'Chưa cập nhật',
          gender: 'Male', // placeholder — user cập nhật sau
          phone: `ms_${localPart}`, // placeholder tránh trùng unique
          outlook,
          role,
          status: 'Active',
        },
      });
      isNewUser = true;
    }

    if (user.status === 'Inactive') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        fullName: user.fullName,
        userId: user.userId,
        faculty: user.faculty,
        batch: user.batch,
        gender: user.gender,
        phone: user.phone,
        outlook: user.outlook,
        role: user.role,
        isNewUser, // FE biết để nhắc cập nhật hồ sơ
      },
    };
  }

  // Refresh access token bằng refresh token
  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Thiếu refresh token');

    const user = await this.prisma.user.findFirst({
      where: { refreshToken },
    });

    if (!user) throw new UnauthorizedException('Refresh token không hợp lệ');
    if (user.status === 'Inactive') throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    // Rotate refresh token (tạo mới để an toàn)
    const tokens = await this.issueTokens(user);
    return tokens;
  }

  // Logout: xóa refresh token
  async logout(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    } catch {
      // User không còn tồn tại (vd: bị xóa hoặc DB re-seed) — vẫn coi như logout thành công
    }
    return { success: true };
  }

  // Đăng nhập bằng mã số (MSSV/MSGV) + mật khẩu
  async loginWithCredentials(code: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { userId: code } });

    if (!user) {
      throw new UnauthorizedException('Mã số không tồn tại trong hệ thống');
    }

    if (user.status === 'Inactive') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Tài khoản chưa được thiết lập mật khẩu. Vui lòng liên hệ Admin.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        fullName: user.fullName,
        userId: user.userId,
        faculty: user.faculty,
        batch: user.batch,
        gender: user.gender,
        phone: user.phone,
        outlook: user.outlook,
        role: user.role,
      },
    };
  }

  // Đăng nhập bằng tài khoản VLU (online.vlu.edu.vn)
  // Mật khẩu VLU KHÔNG được lưu vào database
  async loginWithVlu(studentId: string, password: string) {
    // --- 0. Tài khoản NỘI BỘ (Admin / hội đồng) có mật khẩu → xác thực bằng mật khẩu, KHÔNG qua VLU ---
    // (vd: ADMIN001 / 123456). SV-GV thật không có passwordHash nên sẽ rơi xuống luồng VLU bên dưới.
    const internalUser = await this.prisma.user.findUnique({ where: { userId: studentId } });
    if (internalUser?.passwordHash) {
      return this.loginWithCredentials(studentId, password);
    }

    // --- 1. Forward credentials sang VLU để xác thực ---
    const vluLoginUrl = 'https://online.vlu.edu.vn/Login';
    const formBody = new URLSearchParams({
      txtTaiKhoan: studentId,
      txtMatKhau: password,
    }).toString();

    let vluResponse: Response;
    try {
      console.log('Forwarding credentials to VLU for user:', studentId);
      vluResponse = await fetch(vluLoginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
        body: formBody,
        redirect: 'manual', // QUAN TRỌNG: không auto-follow redirect
      });
    } catch (error) {
      console.error('Error connecting to VLU:', error);
      throw new UnauthorizedException('Không thể kết nối đến hệ thống VLU. Vui lòng thử lại sau.');
    }

    // --- 2. Phân tích kết quả từ VLU ---
    const location = vluResponse.headers.get('location') || '';
    console.log('VLU Response status:', vluResponse.status);
    console.log('VLU Response Location header:', location);

    // Thành công: VLU trả về HTTP 302 redirect đến trang chủ (không phải Error hay Login)
    const isVluSuccess =
      (vluResponse.status === 302 || vluResponse.status === 301) &&
      location !== '' &&
      !location.toLowerCase().includes('error') &&
      !location.toLowerCase().includes('login');

    if (!isVluSuccess) {
      // Đọc HTML response để xác nhận thất bại
      const html = await vluResponse.text();
      const hasError =
        html.includes('kh&#244;ng ch&#237;nh x&#225;c') || // "không chính xác"
        html.includes('kh&ocirc;ng ch&iacute;nh x&aacute;c') ||
        html.includes('Tên đăng nhập') ||
        html.includes('không chính xác') ||
        (html.includes('loginbox-forgot') && html.includes('color:red'));

      if (hasError || vluResponse.status === 200) {
        throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu VLU không chính xác');
      }
      throw new UnauthorizedException('Xác thực VLU thất bại. Vui lòng thử lại.');
    }

    // --- 3. Tìm user trong MongoDB theo MSSV/MSGV ---
    let user = await this.prisma.user.findUnique({ where: { userId: studentId } });
    let isNewUser = false; // true khi user vừa được tạo trong lần đăng nhập này → FE nhắc cập nhật hồ sơ

    // Whitelist Admin: mã số nằm trong ADMIN_VLU_IDS (.env, ngăn cách bằng dấu phẩy)
    // sẽ được cấp/nâng quyền Admin khi đăng nhập bằng tài khoản VLU thật.
    const adminIds = (process.env.ADMIN_VLU_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isWhitelistedAdmin = adminIds.includes(studentId);

    // --- 4. Nếu chưa có → tự động tạo user mới với thông tin tối thiểu ---
    if (!user) {
      // Xác định role: ưu tiên Admin (whitelist) → GV (mã bắt đầu bằng chữ) → SV
      const isLecturer = /^[A-Za-z]/.test(studentId);
      const role = isWhitelistedAdmin ? 'Admin' : isLecturer ? 'Lecturer' : 'Student';

      user = await this.prisma.user.create({
        data: {
          userId: studentId,
          fullName: studentId, // Placeholder — user cần cập nhật profile
          faculty: 'Chưa cập nhật',
          gender: 'Male', // Default placeholder
          phone: `vlu_${studentId}`, // Placeholder để tránh unique constraint
          outlook: `${studentId}@vanlanguni.vn`, // Email VLU theo chuẩn
          role,
          status: 'Active',
        },
      });
      isNewUser = true;
    } else if (isWhitelistedAdmin && user.role !== 'Admin') {
      // Đã có user nhưng nằm trong whitelist → nâng lên Admin
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 'Admin' },
      });
    }

    if (user.status === 'Inactive') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // --- 5. Cấp JWT + Refresh Token nội bộ ---
    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        fullName: user.fullName,
        userId: user.userId,
        faculty: user.faculty,
        batch: user.batch,
        gender: user.gender,
        phone: user.phone,
        outlook: user.outlook,
        role: user.role,
        isNewUser, // Flag để frontend biết cần cập nhật profile (chính xác: vừa tạo trong lần login này)
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        userId: true,
        faculty: true,
        batch: true,
        gender: true,
        phone: true,
        outlook: true,
        role: true,
        status: true,
        created: true,
      },
    });

    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    return user;
  }
}
