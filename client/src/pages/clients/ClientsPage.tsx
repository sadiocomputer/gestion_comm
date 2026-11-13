import { SearchX, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/Fields'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { StatusChips, type ActiveFilter } from '../../components/ui/StatusChips'
import { api, getErrorMessage, type Client, type Paginated } from '../../lib/api'
import { formatPhone } from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

export function ClientsPage() {
  const auth = useAuth()
  const list = useListParams()
  const status = (list.get('status') ?? 'active') as ActiveFilter

  const [result, setResult] = useState<Paginated<Client> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<Client>>('/clients', {
        params: { page: list.page, limit: 20, status, search: list.search || undefined },
      })
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
  }, [list.page, list.search, status])

  const canCreate = auth.can('clients.create')
  const filtered = Boolean(list.search) || status !== 'active'

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Les personnes qui achètent chez vous."
        icon={Users}
        actions={
          canCreate && (
            <ButtonLink to="/clients/new" icon={UserPlus}>
              Nouveau client
            </ButtonLink>
          )
        }
      />

      <div className="mb-6 space-y-3">
        <SearchInput value={list.input} onChange={list.setInput} placeholder="Nom ou téléphone…" />
        <StatusChips value={status} onChange={(v) => list.update({ status: v === 'active' ? null : v })} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && result.data.length === 0 && (
        <Card>
          {filtered ? (
            <EmptyState icon={SearchX} tone="slate" title="Aucun client trouvé" description="Vérifiez l'orthographe ou essayez un numéro." />
          ) : (
            <EmptyState
              icon={Users}
              title="Aucun client enregistré pour le moment"
              description="Enregistrez vos clients pour suivre leurs achats et ce qu'ils vous doivent."
              action={
                canCreate && (
                  <ButtonLink to="/clients/new" icon={UserPlus} size="lg">
                    Ajouter mon premier client
                  </ButtonLink>
                )
              }
            />
          )}
        </Card>
      )}

      {result && result.data.length > 0 && (
        <div className="space-y-4">
          <DataList
            rows={result.data}
            rowKey={(c) => c.id}
            rowHref={(c) => `/clients/${c.id}`}
            isMuted={(c) => !c.isActive}
            columns={[
              {
                header: 'Client',
                cell: (c) => (
                  <span className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    {!c.isActive && <Badge>Archivé</Badge>}
                  </span>
                ),
              },
              { header: 'Téléphone', cell: (c) => (c.phone ? formatPhone(c.phone) : <span className="text-slate-400">—</span>) },
              { header: 'Adresse', cell: (c) => c.address ?? <span className="text-slate-400">—</span>, hideOnTablet: true },
            ]}
            mobileCard={(c) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[c.phone && formatPhone(c.phone), c.address].filter(Boolean).join(' · ') || 'Aucune coordonnée'}
                  </p>
                  {!c.isActive && <Badge>Archivé</Badge>}
                </div>
              </div>
            )}
          />
          <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['client', 'clients']} onPage={list.setPage} />
        </div>
      )}
    </div>
  )
}
