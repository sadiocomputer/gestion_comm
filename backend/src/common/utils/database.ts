import { QueryFailedError } from 'typeorm';

/**
 * Neutralise les caractères spéciaux de LIKE (% et _) dans une recherche.
 * Sans cela, chercher "50%" trouverait tout ce qui commence par "50".
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Erreur MySQL levée quand un index UNIQUE est violé. */
export function isDuplicateEntry(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}
