import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { TopicStatus } from '@prisma/client';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  topicName?: string;

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

  @IsOptional()
  @IsEnum(TopicStatus)
  status?: TopicStatus;

  @IsOptional()
  @IsInt()
  progress?: number;

  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @IsOptional()
  @IsBoolean()
  isAssigned?: boolean;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
