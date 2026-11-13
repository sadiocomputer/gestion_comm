import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../../roles/permissions.catalog';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const ANY_PERMISSION_KEY = 'anyPermission';

/**
 * Indique les permissions exigées par une route (TOUTES sont requises).
 * Exemple : @RequirePermissions('users.create')
 * Le décorateur ne fait qu'étiqueter la route ; c'est PermissionsGuard qui
 * lit l'étiquette et bloque la requête.
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * L'UNE de ces permissions suffit.
 * Exemple : @RequireAnyPermission('sales.read', 'sales.create')
 */
export const RequireAnyPermission = (...permissions: PermissionCode[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);
