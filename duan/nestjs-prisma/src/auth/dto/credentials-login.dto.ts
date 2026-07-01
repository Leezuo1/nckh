import { IsString, MinLength } from 'class-validator';

export class CredentialsLoginDto {
  @IsString()
  code: string; // userId (MSSV / MSGV)

  @IsString()
  @MinLength(6)
  password: string;
}
