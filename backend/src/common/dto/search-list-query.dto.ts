import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../utils/transforms';

export const ACTIVE_STATUSES = ['active', 'archived', 'all'] as const;
export type ActiveStatusFilter = (typeof ACTIVE_STATUSES)[number];

/**
 * Paramètres communs des listes avec recherche et archivage :
 * ?search=...&status=active|archived|all&page=1&limit=20
 */
export class SearchListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(ACTIVE_STATUSES)
  status: ActiveStatusFilter = 'active';
}
