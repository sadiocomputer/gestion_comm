import { CircleCheck, CircleSlash, UserCog, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { DataList } from '../components/ui/DataList'
import { LoadingState } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { api, getErrorMessage, type Paginated, type UserDetail } from '../lib/api'
import { formatPhone } from '../lib/format'
import { useListParams } from '../lib/useListParams'

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="green" icon={CircleCheck}>Actif</Badge>
  ) : (
    <Badge tone="slate" icon={CircleSlash}>Désactivé</Badge>
  )
}

function RoleBadges({ user }: { user: UserDetail }) {
  if (user.roles.length === 0) return <Badge tone="orange">Aucun rôle</Badge>
  return (
    <span className="flex flex-wrap gap-1.5">
      {user.roles.map((r) => (
        <Badge key={r.id} tone="violet">{r.name}</Badge>
      ))}
    </span>
  )
}

export function UsersPage() {
  const auth = useAuth()
  const list = useListParams()
  const [result, setResult] = useState<Paginated<UserDetail> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<UserDetail>>('/users', { params: { page: list.page, limit: 20 } })
      .then(({ data }) => {
        if (cancelled) return
        setResult(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [list.page])

  const myId = auth.status === 'authenticated' ? auth.user.id : null

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Les personnes qui utilisent l'application et leur rôle."
        icon={UserCog}
        tone="violet"
        actions={
          auth.can('users.create') && (
            <ButtonLink to="/users/new" icon={UserPlus}>
              Nouvel utilisateur
            </ButtonLink>
          )
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && (
        <div className="space-y-4">
          <DataList
            rows={result.data}
            rowKey={(u) => u.id}
            rowHref={(u) => `/users/${u.id}`}
            isMuted={(u) => !u.isActive}
            columns={[
              {
                header: 'Utilisateur',
                cell: (u) => (
                  <span className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        {u.name}
                        {u.id === myId && <span className="ml-2 text-sm font-normal text-slate-500">(vous)</span>}
                      </span>
                      <span className="block text-sm text-slate-500">{formatPhone(u.phone)}</span>
                    </span>
                  </span>
                ),
              },
              { header: 'Rôle', cell: (u) => <RoleBadges user={u} /> },
              { header: 'Statut', cell: (u) => <StatusBadge active={u.isActive} /> },
            ]}
            mobileCard={(u) => (
              <div className="flex items-center gap-3">
                <Avatar name={u.name} />
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate font-semibold text-slate-900">
                    {u.name}
                    {u.id === myId && <span className="ml-1.5 text-sm font-normal text-slate-500">(vous)</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <RoleBadges user={u} />
                    {!u.isActive && <StatusBadge active={false} />}
                  </div>
                </div>
              </div>
            )}
          />
          <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['utilisateur', 'utilisateurs']} onPage={list.setPage} />
        </div>
      )}
    </div>
  )
}
