import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../../roles/permissions.catalog';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Indique les permissions exigées par une route (toutes sont requises).
 * Exemple : @RequirePermissions('users.create')
 * Le décorateur ne fait qu'étiqueter la route ; c'est PermissionsGuard qui
 * lit l'étiquette et bloque la requête.
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
