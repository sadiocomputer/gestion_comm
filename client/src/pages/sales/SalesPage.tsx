import { FileText, Plus, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { PaymentStateBadge } from '../../components/payments/PaymentWidgets'
import { SaleStatusBadge } from '../../components/sales/SaleBadges'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chips, type ChipOption } from '../../components/ui/Chips'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/Fields'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { api, getErrorMessage, type Paginated, type SaleSummary } from '../../lib/api'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { PeriodKey } from '../../lib/period'
import { useListParams } from '../../lib/useListParams'
import { usePeriodFilter } from '../../lib/usePeriodFilter'

type PayFilter = 'all' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED'

/** « Tout » par défaut : toutes les factures, sans limite de date. */
const PERIODS: PeriodKey[] = ['all', 'today', 'week', 'month', 'lastMonth', 'custom']

const PAY_FILTERS: ChipOption<PayFilter>[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'UNPAID', label: 'Non payées' },
  { value: 'PARTIAL', label: 'Partielles' },
  { value: 'PAID', label: 'Payées' },
  { value: 'CANCELLED', label: 'Annulées' },
]

export function SalesPage() {
  const auth = useAuth()
  const list = useListParams()
  const { page, search } = list
  const filter = usePeriodFilter(list, PERIODS, 'all')
  const from = filter.range?.from
  const to = filter.range?.to
  const pay = (list.get('pay') ?? 'all') as PayFilter

  const [result, setResult] = useState<Paginated<SaleSummary> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<SaleSummary>>('/sales', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          from,
          to,
          status: pay === 'CANCELLED' ? 'CANCELLED' : undefined,
          paymentStatus: pay !== 'all' && pay !== 'CANCELLED' ? pay : undefined,
        },
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
  }, [page, search, from, to, pay])

  const filtered = Boolean(search) || filter.period !== 'all' || pay !== 'all'
  const statusBadge = (sale: SaleSummary) =>
    sale.status === 'CANCELLED' ? <SaleStatusBadge status={sale.status} /> : <PaymentStateBadge state={sale.paymentStatus} />

  return (
    <div>
      <PageHeader
        title={auth.can('sales.read') ? 'Factures' : 'Mes factures'}
        description="Toutes les ventes enregistrées."
        icon={FileText}
        tone="violet"
        actions={
          auth.can('sales.create') && (
            <ButtonLink to="/sales/new" icon={Plus}>
              Nouvelle vente
            </ButtonLink>
          )
        }
      />

      <div className="mb-6 space-y-4">
        <SearchInput value={list.input} onChange={list.setInput} placeholder="N° de facture ou nom du client…" />
        <PeriodFilter filter={filter} />
        <Chips label="Paiement" options={PAY_FILTERS} value={pay} onChange={(v) => list.update({ pay: v === 'all' ? null : v })} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && result.data.length === 0 && (
        <Card>
          {filtered ? (
            <EmptyState icon={SearchX} tone="slate" title="Aucune facture trouvée" description="Essayez une autre période ou une autre recherche." />
          ) : (
            <EmptyState
              icon={FileText}
              tone="violet"
              title="Aucune vente pour le moment"
              description="Vos factures apparaîtront ici dès votre première vente."
              action={
                auth.can('sales.create') && (
                  <ButtonLink to="/sales/new" icon={Plus} size="lg">
                    Faire ma première vente
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
            rowHref={(s) => `/sales/${s.id}`}
            isMuted={(s) => s.status === 'CANCELLED'}
            columns={[
              { header: 'Facture', cell: (s) => <span className="font-semibold text-slate-900">{s.number}</span> },
              { header: 'Date', cell: (s) => <span className="text-slate-600">{formatDateTime(s.createdAt)}</span> },
              {
                header: 'Client',
                cell: (s) => s.client?.name ?? <span className="text-slate-400">Client de passage</span>,
              },
              { header: 'Vendeur', cell: (s) => <span className="text-slate-600">{s.user.name}</span>, hideOnTablet: true },
              { header: 'Statut', cell: statusBadge },
              {
                header: 'Total',
                align: 'right',
                cell: (s) => (
                  <span>
                    <span className="font-bold text-slate-900">{formatMoney(s.total)}</span>
                    {s.status === 'COMPLETED' && s.balance > 0 && (
                      <span className="block text-sm font-medium text-red-700">reste {formatMoney(s.balance)}</span>
                    )}
                  </span>
                ),
              },
            ]}
            mobileCard={(s) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{s.client?.name ?? 'Client de passage'}</p>
                    <p className="text-sm text-slate-500">
                      {s.number} · {formatDateTime(s.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-slate-900">{formatMoney(s.total)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(s)}
                  {s.status === 'COMPLETED' && s.balance > 0 && (
                    <span className="text-sm font-medium text-red-700">reste {formatMoney(s.balance)}</span>
                  )}
                </div>
              </div>
            )}
          />
          <Pagination
            page={page}
            total={result.total}
            limit={result.limit}
            itemLabel={['facture', 'factures']}
            onPage={list.setPage}
          />
        </div>
      )}
    </div>
  )
}
