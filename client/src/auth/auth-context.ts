import { createContext } from 'react'
import type { AuthUser } from '../lib/api'
import type { PermissionCode } from '../lib/permissions'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  // notice : message à afficher sur la page de connexion (ex. session expirée).
  | { status: 'anonymous'; notice?: string }

export type AuthContextValue = AuthState & {
  login: (phone: string, password: string) => Promise<void>
  logout: (notice?: string) => Promise<void>
  /** Recharge rôles et permissions depuis /auth/me. */
  reloadUser: () => Promise<void>
  /** Affichage uniquement : le backend revérifie chaque requête. */
  can: (permission: PermissionCode) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
