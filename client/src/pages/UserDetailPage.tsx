import { CircleCheck, CircleSlash } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Avatar } from '../components/ui/Avatar'
import { BackLink } from '../components/ui/BackLink'
import { Badge } from '../components/ui/Badge'
import { LoadingState } from '../components/ui/Loading'
import { UserInfoForm } from '../components/users/UserInfoForm'
import { UserPasswordReset } from '../components/users/UserPasswordReset'
import { UserRolesForm } from '../components/users/UserRolesForm'
import { UserStatusCard } from '../components/users/UserStatusCard'
import { api, getErrorMessage, type UserDetail } from '../lib/api'
import { formatDate, formatPhone } from '../lib/format'

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

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/users" label="Utilisateurs" />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }
  if (!user) return <LoadingState />

  const isSelf = auth.status === 'authenticated' && user.id === auth.user.id

  function handleUpdated(updated: UserDetail) {
    setUser(updated)
    // Mes propres rôles ou mon nom ont changé : on rafraîchit le menu.
    if (isSelf) void auth.reloadUser()
  }

  return (
    <div className="space-y-6">
      <BackLink to="/users" label="Utilisateurs" />

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{user.name}</h1>
            {user.isActive ? (
              <Badge tone="green" icon={CircleCheck}>Actif</Badge>
            ) : (
              <Badge tone="slate" icon={CircleSlash}>Désactivé</Badge>
            )}
            {isSelf && <Badge tone="blue">Votre compte</Badge>}
          </div>
          <p className="text-[15px] text-slate-500">
            {formatPhone(user.phone)} · depuis le {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* key : remet les formulaires à zéro si on passe à un autre utilisateur. */}
        <UserRolesForm
          key={`roles-${user.id}`}
          user={user}
          canAssign={auth.can('roles.assign') && auth.can('roles.read')}
          onSaved={handleUpdated}
        />
        <UserInfoForm key={`info-${user.id}`} user={user} canEdit={auth.can('users.update')} onSaved={handleUpdated} />
      </div>

      {auth.can('users.update') && !isSelf && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <UserPasswordReset userId={user.id} />
          <UserStatusCard user={user} onChanged={handleUpdated} />
        </div>
      )}
      {isSelf && (
        <p className="text-sm text-slate-500">
          Pour changer votre propre mot de passe, allez dans « Mon profil ».
        </p>
      )}
    </div>
  )
}
