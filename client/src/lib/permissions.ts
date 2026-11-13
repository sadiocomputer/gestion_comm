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
  | 'clients.read'
  | 'clients.create'
  | 'clients.update'
  | 'suppliers.read'
  | 'suppliers.create'
  | 'suppliers.update'
  | 'products.read'
  | 'products.read_cost'
  | 'products.create'
  | 'products.update'
  | 'stock.read'
  | 'stock.in'
  | 'stock.out'
  | 'stock.adjust'
  | 'sales.create'
  | 'sales.read'
  | 'sales.discount'
  | 'sales.cancel'
  | 'payments.read'
  | 'payments.create'
  | 'payments.cancel'
  | 'supplier_payments.read'
  | 'supplier_payments.create'
  | 'expenses.read'
  | 'expenses.create'
  | 'expenses.cancel'
  | 'reports.read'
  | 'dashboard.profit'

/** Libellés des groupes de permissions dans l'écran des rôles. */
export const MODULE_LABELS: Record<string, string> = {
  users: 'Utilisateurs',
  roles: 'Rôles et accès',
  clients: 'Clients',
  suppliers: 'Fournisseurs',
  products: 'Produits',
  stock: 'Stock',
  sales: 'Ventes',
  payments: 'Paiements et créances',
  expenses: 'Dépenses',
  reports: 'Rapports',
}
