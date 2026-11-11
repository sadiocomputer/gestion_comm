import { QueryFailedError } from 'typeorm';

/** Erreur MySQL levée quand un index UNIQUE est violé. */
export function isDuplicateEntry(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}
