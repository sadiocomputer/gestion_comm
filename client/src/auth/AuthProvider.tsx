import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  api,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
  type AuthUser,
  type SessionResponse,
} from '../lib/api'
import type { PermissionCode } from '../lib/permissions'
import { AuthContext, type AuthState } from './auth-context'

/**
 * Détient la session pour toute l'application.
 * Au démarrage, tente de restaurer la session grâce au cookie refresh_token.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setSessionExpiredHandler(() =>
      setState({
        status: 'anonymous',
        notice: 'Ta session a expiré. Reconnecte-toi.',
      }),
    )

    refreshSession()
      .then((session) => {
        if (!cancelled) setState({ status: 'authenticated', user: session.user })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'anonymous' })
      })

    return () => {
      cancelled = true
      setSessionExpiredHandler(null)
    }
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await api.post<SessionResponse>('/auth/login', {
      phone,
      password,
    })
    setAccessToken(data.accessToken)
    setState({ status: 'authenticated', user: data.user })
  }, [])

  const logout = useCallback(async (notice?: string) => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Serveur injoignable : on oublie quand même la session localement.
    }
    setAccessToken(null)
    setState({ status: 'anonymous', notice })
  }, [])

  const reloadUser = useCallback(async () => {
    try {
      const { data } = await api.get<AuthUser>('/auth/me')
      setState({ status: 'authenticated', user: data })
    } catch {
      // Session expirée : l'intercepteur s'en charge déjà.
    }
  }, [])

  const can = useCallback(
    (permission: PermissionCode) =>
      state.status === 'authenticated' && state.user.permissions.includes(permission),
    [state],
  )

  const value = useMemo(
    () => ({ ...state, login, logout, reloadUser, can }),
    [state, login, logout, reloadUser, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
