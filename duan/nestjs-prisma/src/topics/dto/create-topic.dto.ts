import { IsString, IsOptional, IsDateString, IsInt, IsArray, Min, Max } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  topicId: string;

  @IsString()
  topicName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  projectScope?: string;

  @IsOptional()
  @IsString()
  expectedProduct?: string;

  @IsString()
  year: string;

  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  durationMonths?: number;

  @IsOptional()
  @IsString()
  batchId?: string; // Đợt đề tài (SRS) — GVHD chọn khi lập nhóm

  @IsOptional()
  @IsArray()
  members?: { studentId?: string; fullName?: string; year?: string; batch?: string }[]; // thành viên nhóm (SV đăng ký ý tưởng)
}
