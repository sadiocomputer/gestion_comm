import { Building2, Plus, SearchX, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/Fields'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { StatusChips, type ActiveFilter } from '../../components/ui/StatusChips'
import { api, getErrorMessage, type Paginated, type Supplier } from '../../lib/api'
import { formatPhone } from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

export function SuppliersPage() {
  const auth = useAuth()
  const list = useListParams()
  const status = (list.get('status') ?? 'active') as ActiveFilter

  const [result, setResult] = useState<Paginated<Supplier> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<Supplier>>('/suppliers', {
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

  const canCreate = auth.can('suppliers.create')
  const filtered = Boolean(list.search) || status !== 'active'

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Ceux qui vous livrent la marchandise."
        icon={Truck}
        tone="orange"
        actions={
          canCreate && (
            <ButtonLink to="/suppliers/new" icon={Plus}>
              Nouveau fournisseur
            </ButtonLink>
          )
        }
      />

      <div className="mb-6 space-y-3">
        <SearchInput value={list.input} onChange={list.setInput} placeholder="Nom, contact ou téléphone…" />
        <StatusChips value={status} onChange={(v) => list.update({ status: v === 'active' ? null : v })} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && result.data.length === 0 && (
        <Card>
          {filtered ? (
            <EmptyState icon={SearchX} tone="slate" title="Aucun fournisseur trouvé" />
          ) : (
            <EmptyState
              icon={Truck}
              tone="orange"
              title="Aucun fournisseur enregistré pour le moment"
              description="Enregistrez vos fournisseurs pour suivre vos achats et ce que vous leur devez."
              action={
                canCreate && (
                  <ButtonLink to="/suppliers/new" icon={Plus} size="lg">
                    Ajouter mon premier fournisseur
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
            rowKey={(s) => s.id}
            rowHref={(s) => `/suppliers/${s.id}`}
            isMuted={(s) => !s.isActive}
            columns={[
              {
                header: 'Fournisseur',
                cell: (s) => (
                  <span className="flex items-center gap-3">
                    <IconBubble icon={Building2} tone="orange" size="sm" />
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    {!s.isActive && <Badge>Archivé</Badge>}
                  </span>
                ),
              },
              { header: 'Contact', cell: (s) => s.contactName ?? <span className="text-slate-400">—</span> },
              { header: 'Téléphone', cell: (s) => (s.phone ? formatPhone(s.phone) : <span className="text-slate-400">—</span>) },
            ]}
            mobileCard={(s) => (
              <div className="flex items-center gap-3">
                <IconBubble icon={Building2} tone="orange" size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{s.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[s.contactName, s.phone && formatPhone(s.phone)].filter(Boolean).join(' · ') || 'Aucune coordonnée'}
                  </p>
                  {!s.isActive && <Badge>Archivé</Badge>}
                </div>
              </div>
            )}
          />
          <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['fournisseur', 'fournisseurs']} onPage={list.setPage} />
        </div>
      )}
    </div>
  )
}
