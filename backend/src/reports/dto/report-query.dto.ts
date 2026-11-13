import { Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** GET /reports?from=2026-11-01&to=2026-11-30 (bornes incluses). */
export class ReportQueryDto {
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from: string;

  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to: string;
}
