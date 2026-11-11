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
