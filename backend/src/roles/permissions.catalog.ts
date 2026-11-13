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
  { code: 'clients.read', label: 'Voir les clients', module: 'clients' },
  { code: 'clients.create', label: 'Créer des clients', module: 'clients' },
  {
    code: 'clients.update',
    label: 'Modifier et archiver les clients',
    module: 'clients',
  },
  {
    code: 'suppliers.read',
    label: 'Voir les fournisseurs',
    module: 'suppliers',
  },
  {
    code: 'suppliers.create',
    label: 'Créer des fournisseurs',
    module: 'suppliers',
  },
  {
    code: 'suppliers.update',
    label: 'Modifier et archiver les fournisseurs',
    module: 'suppliers',
  },
  { code: 'products.read', label: 'Voir les produits', module: 'products' },
  {
    code: 'products.read_cost',
    label: "Voir les prix d'achat (marges)",
    module: 'products',
  },
  { code: 'products.create', label: 'Créer des produits', module: 'products' },
  {
    code: 'products.update',
    label: 'Modifier et archiver les produits, gérer les catégories',
    module: 'products',
  },
  { code: 'stock.read', label: 'Voir les mouvements de stock', module: 'stock' },
  { code: 'stock.in', label: 'Enregistrer des entrées de stock', module: 'stock' },
  { code: 'stock.out', label: 'Enregistrer des sorties de stock', module: 'stock' },
  {
    code: 'stock.adjust',
    label: 'Corriger le stock (inventaire)',
    module: 'stock',
  },
  { code: 'sales.create', label: 'Enregistrer des ventes', module: 'sales' },
  {
    code: 'sales.read',
    label: 'Voir toutes les ventes (sinon seulement les siennes)',
    module: 'sales',
  },
  {
    code: 'sales.discount',
    label: 'Modifier les prix et accorder des remises',
    module: 'sales',
  },
  { code: 'sales.cancel', label: 'Annuler des ventes', module: 'sales' },
  {
    code: 'payments.read',
    label: 'Voir les encaissements et créances clients',
    module: 'payments',
  },
  {
    code: 'payments.create',
    label: 'Encaisser des paiements clients',
    module: 'payments',
  },
  {
    code: 'payments.cancel',
    label: 'Annuler des paiements (clients et fournisseurs)',
    module: 'payments',
  },
  {
    code: 'supplier_payments.read',
    label: 'Voir les dettes fournisseurs',
    module: 'payments',
  },
  {
    code: 'supplier_payments.create',
    label: 'Payer les fournisseurs',
    module: 'payments',
  },
  { code: 'expenses.read', label: 'Voir les dépenses', module: 'expenses' },
  {
    code: 'expenses.create',
    label: 'Enregistrer des dépenses et gérer leurs catégories',
    module: 'expenses',
  },
  { code: 'expenses.cancel', label: 'Annuler des dépenses', module: 'expenses' },
  {
    code: 'reports.read',
    label: 'Voir les rapports (chiffre d’affaires, marges, bénéfice)',
    module: 'reports',
  },
  {
    // Donnée seulement à l'Administrateur (automatique) : absente des rôles par défaut.
    code: 'dashboard.profit',
    label: 'Voir le bénéfice sur le tableau de bord',
    module: 'reports',
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
    permissions: [
      'users.read',
      'roles.read',
      'clients.read',
      'clients.create',
      'clients.update',
      'suppliers.read',
      'suppliers.create',
      'suppliers.update',
      'products.read',
      'products.read_cost',
      'products.create',
      'products.update',
      'stock.read',
      'stock.in',
      'stock.out',
      'stock.adjust',
      'sales.create',
      'sales.read',
      'sales.discount',
      'sales.cancel',
      'payments.read',
      'payments.create',
      'payments.cancel',
      'supplier_payments.read',
      'supplier_payments.create',
      'expenses.read',
      'expenses.create',
      'expenses.cancel',
      'reports.read',
    ],
  },
  {
    name: 'Vendeur',
    description: 'Enregistre les ventes.',
    permissions: [
      'clients.read',
      'clients.create',
      'products.read',
      'stock.read',
      'sales.create',
    ],
  },
  {
    name: 'Caissier',
    description: 'Encaisse les paiements.',
    permissions: [
      'clients.read',
      'products.read',
      'sales.read',
      'payments.read',
      'payments.create',
    ],
  },
];
