import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Gender } from '@prisma/client';

// User chỉ được sửa các field này — KHÔNG cho sửa role, status, userId, outlook, faculty
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  batch?: string;
}
