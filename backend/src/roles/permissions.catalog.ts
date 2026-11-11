/**
 * Liste de référence des permissions.
 * Pour ajouter une permission : l'ajouter ici, puis lancer "npm run seed".
 * Le rôle Administrateur la reçoit automatiquement.
 */
export const PERMISSIONS = [
  { code: 'users.read', label: 'Voir les utilisateurs', module: 'users' },
  { code: 'users.create', label: 'Créer des utilisateurs', module: 'users' },
  { code: 'users.update', label: 'Modifier les utilisateurs', module: 'users' },
  { code: 'roles.read', label: 'Voir les rôles', module: 'roles' },
  { code: 'roles.create', label: 'Créer des rôles', module: 'roles' },
  { code: 'roles.update', label: 'Modifier les rôles', module: 'roles' },
  { code: 'roles.delete', label: 'Supprimer des rôles', module: 'roles' },
  {
    code: 'roles.assign',
    label: 'Attribuer des rôles aux utilisateurs',
    module: 'roles',
  },
] as const;

/** Type des codes valides : 'users.read' | 'users.create' | ... */
export type PermissionCode = (typeof PERMISSIONS)[number]['code'];

export const ADMIN_ROLE_NAME = 'Administrateur';

/** Rôles créés par le seed s'ils n'existent pas encore (jamais écrasés). */
export const DEFAULT_ROLES: {
  name: string;
  description: string;
  permissions: PermissionCode[];
}[] = [
  {
    name: 'Gestionnaire',
    description: 'Supervise la boutique et consulte le personnel.',
    permissions: ['users.read', 'roles.read'],
  },
  {
    name: 'Vendeur',
    description: 'Enregistre les ventes.',
    permissions: [],
  },
  {
    name: 'Caissier',
    description: 'Encaisse les paiements.',
    permissions: [],
  },
];
