import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Thiếu JWT_SECRET → dừng app ngay, KHÔNG fallback sang secret cứng (ai cũng đoán được → giả mạo token)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Thiếu biến môi trường JWT_SECRET trong .env');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET!,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      outlook: payload.outlook,
      role: payload.role,
      fullName: payload.fullName,
    };
  }
}
