import { IsString } from 'class-validator';

export class MicrosoftLoginDto {
  @IsString()
  accessToken: string;
}
