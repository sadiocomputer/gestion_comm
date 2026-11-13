import {
  BanknoteArrowUp,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import type { PermissionCode } from '../../lib/permissions'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Visible si l'utilisateur a AU MOINS UNE de ces permissions. */
  permissions?: PermissionCode[]
  /** Règle « lien actif » (par défaut : l'URL commence par `to`). */
  isActive?: (pathname: string) => boolean
}

export type NavGroup = { label: string; items: NavItem[] }

export const SELL_ITEM: NavItem = {
  to: '/sales/new',
  label: 'Vendre',
  icon: ShoppingCart,
  permissions: ['sales.create'],
}

/** Menu principal, organisé du plus utilisé au moins utilisé. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Au quotidien',
    items: [
      { to: '/', label: 'Accueil', icon: LayoutDashboard, isActive: (p) => p === '/' },
      SELL_ITEM,
      {
        to: '/sales',
        label: 'Factures',
        icon: FileText,
        permissions: ['sales.create', 'sales.read'],
        // /sales et /sales/12, mais pas /sales/new (c'est « Vendre »).
        isActive: (p) => p.startsWith('/sales') && !p.startsWith('/sales/new'),
      },
      {
        to: '/finance',
        label: 'Paiements',
        icon: Wallet,
        permissions: ['payments.read', 'supplier_payments.read'],
      },
      { to: '/expenses', label: 'Dépenses', icon: BanknoteArrowUp, permissions: ['expenses.read'] },
      { to: '/reports', label: 'Rapports', icon: ChartNoAxesCombined, permissions: ['reports.read'] },
    ],
  },
  {
    label: 'Mon commerce',
    items: [
      { to: '/clients', label: 'Clients', icon: Users, permissions: ['clients.read'] },
      { to: '/products', label: 'Produits', icon: Package, permissions: ['products.read'] },
      { to: '/stock', label: 'Stock', icon: Warehouse, permissions: ['stock.read'] },
      { to: '/suppliers', label: 'Fournisseurs', icon: Truck, permissions: ['suppliers.read'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', label: 'Utilisateurs', icon: UserCog, permissions: ['users.read'] },
      { to: '/roles', label: 'Rôles', icon: ShieldCheck, permissions: ['roles.read'] },
    ],
  },
]

export function isItemActive(item: NavItem, pathname: string): boolean {
  return item.isActive ? item.isActive(pathname) : pathname.startsWith(item.to)
}

export function canSee(item: NavItem, can: (p: PermissionCode) => boolean): boolean {
  return !item.permissions || item.permissions.some(can)
}
