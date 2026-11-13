import axios, { type InternalAxiosRequestConfig } from 'axios'

/**
 * Instance Axios unique pour toute l'application.
 * - baseURL '/api' : passe par le proxy Vite en développement.
 * - withCredentials : le navigateur envoie le cookie refresh_token.
 */
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
})

export type PublicUser = {
  id: number
  name: string
  phone: string
  isActive: boolean
  createdAt: string
}

export type RoleSummary = { id: number; name: string }

/** Utilisateur vu par un gestionnaire : infos publiques + rôles. */
export type UserDetail = PublicUser & { roles: RoleSummary[] }

/** Utilisateur connecté : infos publiques + rôles + permissions. */
export type AuthUser = PublicUser & {
  roles: RoleSummary[]
  permissions: string[]
}

export type Role = {
  id: number
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  userCount: number
}

export type Client = {
  id: number
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Supplier = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ExpenseCategory = {
  id: number
  name: string
  expenseCount: number
}

export type Expense = {
  id: number
  amount: number
  description: string
  /** "AAAA-MM-JJ" */
  expenseDate: string
  method: PaymentMethod
  reference: string | null
  status: 'VALID' | 'CANCELLED'
  createdAt: string
  cancelledAt: string | null
  cancelReason: string | null
  category: { id: number; name: string }
  user: { id: number; name: string }
  cancelledBy: { id: number; name: string } | null
}

export type Unit = {
  id: number
  name: string
  productCount: number
}

export type Category = {
  id: number
  name: string
  description: string | null
  productCount: number
}

export type Product = {
  id: number
  name: string
  sku: string | null
  categoryId: number | null
  category: { id: number; name: string } | null
  unit: string
  /** null si l'utilisateur n'a pas la permission products.read_cost */
  purchasePrice: number | null
  salePrice: number
  quantity: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'SALE_CANCEL'

export type SaleStatus = 'COMPLETED' | 'CANCELLED'
export type PaymentState = 'UNPAID' | 'PARTIAL' | 'PAID'
export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK' | 'OTHER'

type PersonRef = { id: number; name: string }

/** Champs communs aux paiements clients et fournisseurs. */
export type PaymentBase = {
  id: number
  amount: number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  status: 'VALID' | 'CANCELLED'
  createdAt: string
  cancelledAt: string | null
  cancelReason: string | null
  user: PersonRef
  cancelledBy: PersonRef | null
}

export type ClientPayment = PaymentBase & {
  sale: { id: number; number: string | null }
  client: PersonRef | null
}

export type SupplierPayment = PaymentBase & { supplier: PersonRef }

export type Receivable = {
  client: PersonRef & { phone: string | null }
  balance: number
  saleCount: number
  oldestSaleAt: string
}

export type SupplierDebt = {
  supplier: PersonRef & { phone: string | null }
  purchases: number
  paid: number
  balance: number
}

export type ClientAccount = {
  totalSales: number
  totalPaid: number
  balance: number
  unpaidSales: {
    id: number
    number: string | null
    createdAt: string
    total: number
    amountPaid: number
    balance: number
  }[]
  /** Nombre total de factures à encaisser (la liste ci-dessus n'en contient qu'une page). */
  unpaidCount: number
  page: number
  limit: number
}

/** Totaux seulement : l'historique se lit avec /purchases et /payments (paginés). */
export type SupplierAccount = {
  totalPurchases: number
  totalPaid: number
  balance: number
}

export type SupplierPurchase = {
  id: number
  createdAt: string
  product: { id: number; name: string; unit: string }
  quantity: number
  unitCost: number | null
  total: number | null
}

export type SaleSummary = {
  id: number
  number: string
  status: SaleStatus
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balance: number
  paymentStatus: PaymentState
  createdAt: string
  client: { id: number; name: string; phone: string | null } | null
  user: { id: number; name: string }
}

export type SaleDetail = SaleSummary & {
  notes: string | null
  cancelledAt: string | null
  cancelReason: string | null
  cancelledBy: { id: number; name: string } | null
  items: {
    id: number
    productId: number
    productName: string
    unit: string
    quantity: number
    unitPrice: number
    lineTotal: number
    unitCost: number | null
  }[]
  payments: ClientPayment[]
}

export type StockMovement = {
  id: number
  type: MovementType
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  unitCost: number | null
  reason: string | null
  createdAt: string
  product: { id: number; name: string; unit: string }
  supplier: { id: number; name: string } | null
  user: { id: number; name: string }
}

export type Permission = {
  id: number
  code: string
  label: string
  module: string
}

/** Format des listes paginées renvoyées par l'API. */
export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

export type SessionResponse = {
  accessToken: string
  user: AuthUser
}

// --- Access token : en mémoire uniquement (jamais dans localStorage) -------

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// --- Prévenir l'AuthProvider quand la session est perdue -------------------

let sessionExpiredHandler: (() => void) | null = null

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler
}

// --- Renouvellement : une seule requête /auth/refresh à la fois ------------

let refreshPromise: Promise<SessionResponse> | null = null

/**
 * Tous les appelants simultanés reçoivent la même promesse. Sans cela, deux
 * refresh enverraient le même cookie et le backend y verrait un vol de jeton.
 */
export function refreshSession(): Promise<SessionResponse> {
  refreshPromise ??= api
    .post<SessionResponse>('/auth/refresh')
    .then((response) => {
      setAccessToken(response.data.accessToken)
      return response.data
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

// --- Intercepteurs ----------------------------------------------------------

// Avant chaque requête : ajoute "Authorization: Bearer <token>".
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Routes pour lesquelles une 401 ne doit pas déclencher de refresh.
const NO_REFRESH_URLS = ['/auth/login', '/auth/refresh', '/auth/logout']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// Après chaque réponse en erreur : si 401, on renouvelle puis on rejoue une fois.
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error

    const original = error.config as RetriableConfig | undefined
    const shouldRefresh =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retried &&
      !NO_REFRESH_URLS.includes(original.url ?? '')

    if (!shouldRefresh) throw error

    original._retried = true
    try {
      await refreshSession()
    } catch {
      setAccessToken(null)
      sessionExpiredHandler?.()
      throw error
    }
    return api(original)
  },
)

/** Extrait le message d'erreur renvoyé par NestJS (AllExceptionsFilter). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(' ')
    if (message) return message
    if (!error.response) return 'Serveur injoignable. Vérifie ta connexion.'
  }
  return 'Une erreur est survenue.'
}
