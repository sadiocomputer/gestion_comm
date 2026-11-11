import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { UserInfoForm } from '../components/users/UserInfoForm'
import { UserPasswordReset } from '../components/users/UserPasswordReset'
import { UserRolesForm } from '../components/users/UserRolesForm'
import { UserStatusCard } from '../components/users/UserStatusCard'
import { api, getErrorMessage, type UserDetail } from '../lib/api'

/**
 * Fiche d'un utilisateur. Chaque bloc s'affiche selon les permissions ;
 * le backend refuserait de toute façon une action non autorisée.
 */
export function UserDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<UserDetail>(`/users/${id}`)
      setUser(data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const isSelf = auth.status === 'authenticated' && user?.id === auth.user.id

  function handleUpdated(updated: UserDetail) {
    setUser(updated)
    // Mes propres rôles ou mon nom ont changé : on rafraîchit le menu.
    if (isSelf) void auth.reloadUser()
  }

  return (
    <div className="space-y-6">
      <Link to="/users" className="text-sm text-blue-700 underline">
        ← Utilisateurs
      </Link>

      {error && <Alert tone="error">{error}</Alert>}
      {!user && !error && <p className="text-slate-500">Chargement…</p>}

      {user && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{user.name}</h1>
            {user.isActive ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-sm text-green-800">
                Actif
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-600">
                Désactivé
              </span>
            )}
            {isSelf && <span className="text-sm text-slate-500">(ton compte)</span>}
          </div>

          {/* key : remet les formulaires à zéro si on passe à un autre utilisateur. */}
          <UserInfoForm
            key={`info-${user.id}`}
            user={user}
            canEdit={auth.can('users.update')}
            onSaved={handleUpdated}
          />
          <UserRolesForm
            key={`roles-${user.id}`}
            user={user}
            canAssign={auth.can('roles.assign') && auth.can('roles.read')}
            onSaved={handleUpdated}
          />
          {auth.can('users.update') && !isSelf && (
            <>
              <UserStatusCard user={user} onChanged={handleUpdated} />
              <UserPasswordReset userId={user.id} />
            </>
          )}
        </>
      )}
    </div>
  )
}
