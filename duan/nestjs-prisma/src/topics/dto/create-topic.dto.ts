import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

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
}
