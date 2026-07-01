import { IsString, MinLength } from 'class-validator';

export class VluLoginDto {
  @IsString()
  studentId: string; // MSSV hoặc MSGV

  @IsString()
  @MinLength(6) // thống nhất với /auth/login; mật khẩu VLU mặc định là ngày sinh ddmmyyyy (8 số)
  password: string;
}
