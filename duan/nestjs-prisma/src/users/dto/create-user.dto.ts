import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Gender, UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsString()
  fullName: string;

  @IsString()
  userId: string;

  @IsString()
  faculty: string;

  @IsOptional()
  @IsString()
  batch?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  phone: string;

  @IsString()
  outlook: string;

  @IsEnum(UserRole)
  role: UserRole;
}
