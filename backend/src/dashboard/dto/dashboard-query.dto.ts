import { IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /dashboard?from=2026-11-01&to=2026-11-12 (bornes incluses).
 * Sans dates : aujourd'hui. Période d'un an au maximum.
 */
export class DashboardQueryDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to?: string;
}
