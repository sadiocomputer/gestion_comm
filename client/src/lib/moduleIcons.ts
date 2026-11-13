import {
  BanknoteArrowUp,
  ChartNoAxesCombined,
  KeyRound,
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

/** Icône de chaque groupe de permissions (écran des rôles). */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  users: UserCog,
  roles: ShieldCheck,
  clients: Users,
  suppliers: Truck,
  products: Package,
  stock: Warehouse,
  sales: ShoppingCart,
  payments: Wallet,
  expenses: BanknoteArrowUp,
  reports: ChartNoAxesCombined,
}

export const DEFAULT_MODULE_ICON: LucideIcon = KeyRound
