/**
 * Copie des codes du catalogue backend (roles/permissions.catalog.ts).
 * Le type empêche les fautes de frappe : can('user.read') ne compile pas.
 * À compléter à chaque nouvelle permission ajoutée au backend.
 */
export type PermissionCode =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'roles.read'
  | 'roles.create'
  | 'roles.update'
  | 'roles.delete'
  | 'roles.assign'

/** Libellés des groupes de permissions dans l'écran des rôles. */
export const MODULE_LABELS: Record<string, string> = {
  users: 'Utilisateurs',
  roles: 'Rôles et accès',
}
