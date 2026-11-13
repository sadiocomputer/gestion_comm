import { CircleCheck, HandCoins, Truck, Users, Wallet, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { METHOD_ICONS, METHOD_LABELS } from '../../components/payments/PaymentWidgets'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Chips, type ChipOption } from '../../components/ui/Chips'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { StatCard } from '../../components/ui/StatCard'
import {
  api,
  getErrorMessage,
  type ClientPayment,
  type Paginated,
  type Receivable,
  type SupplierDebt,
} from '../../lib/api'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '../../lib/format'
import { periodRange, type PeriodKey } from '../../lib/period'
import { useListParams } from '../../lib/useListParams'
import { usePeriodFilter } from '../../lib/usePeriodFilter'

type Tab = 'receivables' | 'payments' | 'debts'

// --- Créances clients ----------------------------------------------------------

type ReceivablesResult = Paginated<Receivable> & { totalBalance: number; walkInBalance: number }

function ReceivablesTab() {
  // Page rangée dans l'adresse : on la retrouve en revenant d'une fiche client.
  const { page, setPage } = useListParams()
  const [result, setResult] = useState<ReceivablesResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<ReceivablesResult>('/receivables', { params: { page, limit: 20 } })
      .then(({ data }) => setResult(data))
      .catch((err: unknown) => setError(getErrorMessage(err)))
  }, [page])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!result) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Les clients me doivent"
          value={formatMoney(result.totalBalance)}
          icon={Users}
          tone={result.totalBalance > 0 ? 'red' : 'green'}
          hint={`${result.total} client${result.total > 1 ? 's' : ''} avec une dette`}
        />
        {result.walkInBalance > 0 && (
          <StatCard
            label="Ventes sans client non soldées"
            value={formatMoney(result.walkInBalance)}
            icon={HandCoins}
            tone="orange"
            hint="À encaisser depuis les factures"
            to="/sales?pay=UNPAID"
          />
        )}
      </div>

      {result.data.length === 0 ? (
        <Card>
          <EmptyState icon={CircleCheck} tone="green" title="Personne ne vous doit d'argent" description="Tous vos clients sont à jour de leurs paiements." />
        </Card>
      ) : (
        <>
          <DataList
            rows={result.data}
            rowKey={(r) => r.client.id}
            rowHref={(r) => `/clients/${r.client.id}`}
            columns={[
              { header: 'Client', cell: (r) => <span className="font-semibold text-slate-900">{r.client.name}</span> },
              { header: 'Téléphone', cell: (r) => (r.client.phone ? formatPhone(r.client.phone) : '—') },
              { header: 'Factures', cell: (r) => `${r.saleCount} non soldée${r.saleCount > 1 ? 's' : ''}` },
              { header: 'Depuis le', cell: (r) => formatDate(r.oldestSaleAt), hideOnTablet: true },
              { header: 'Doit', align: 'right', cell: (r) => <span className="font-bold text-red-700">{formatMoney(r.balance)}</span> },
            ]}
            mobileCard={(r) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{r.client.name}</p>
                  <p className="text-sm text-slate-500">
                    {r.saleCount} facture{r.saleCount > 1 ? 's' : ''} · depuis le {formatDate(r.oldestSaleAt)}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-red-700">{formatMoney(r.balance)}</p>
              </div>
            )}
          />
          <Pagination page={page} total={result.total} limit={result.limit} itemLabel={['client', 'clients']} onPage={setPage} />
        </>
      )}
    </div>
  )
}

// --- Encaissements --------------------------------------------------------------

type PaymentsResult = Paginated<ClientPayment> & { validTotal: number }

/** « Aujourd'hui » par défaut : c'est la question de la caisse en fin de journée. */
const PERIODS: PeriodKey[] = ['today', 'week', 'month', 'lastMonth', 'custom']

function PaymentsTab() {
  const list = useListParams()
  const page = list.page
  const filter = usePeriodFilter(list, PERIODS, 'today')
  const { from, to } = filter.range ?? periodRange('today')
  const [result, setResult] = useState<PaymentsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<PaymentsResult>('/payments', { params: { page, limit: 20, from, to } })
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
  }, [page, from, to])

  return (
    <div className="space-y-6">
      <PeriodFilter filter={filter} />
      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}
      {result && (
        <>
          <StatCard label={`Encaissé ${filter.phrase}`} value={formatMoney(result.validTotal)} icon={Wallet} tone="green" />
          {result.data.length === 0 ? (
            <Card>
              <EmptyState icon={Wallet} tone="slate" title="Aucun encaissement sur cette période" />
            </Card>
          ) : (
            <>
              <DataList
                rows={result.data}
                rowKey={(p) => p.id}
                rowHref={(p) => `/sales/${p.sale.id}`}
                isMuted={(p) => p.status === 'CANCELLED'}
                columns={[
                  { header: 'Date', cell: (p) => formatDateTime(p.createdAt) },
                  { header: 'Client', cell: (p) => p.client?.name ?? <span className="text-slate-400">Client de passage</span> },
                  { header: 'Facture', cell: (p) => p.sale.number, hideOnTablet: true },
                  {
                    header: 'Mode',
                    cell: (p) => {
                      const Icon = METHOD_ICONS[p.method]
                      return (
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Icon size={16} aria-hidden /> {METHOD_LABELS[p.method]}
                        </span>
                      )
                    },
                  },
                  { header: 'Par', cell: (p) => p.user.name, hideOnTablet: true },
                  {
                    header: 'Montant',
                    align: 'right',
                    cell: (p) =>
                      p.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="line-through">{formatMoney(p.amount)}</span>
                          <Badge tone="red">Annulé</Badge>
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700">+ {formatMoney(p.amount)}</span>
                      ),
                  },
                ]}
                mobileCard={(p) => (
                  <div className="flex items-center gap-3">
                    <IconBubble icon={METHOD_ICONS[p.method]} tone={p.status === 'CANCELLED' ? 'slate' : 'green'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{p.client?.name ?? 'Client de passage'}</p>
                      <p className="text-sm text-slate-500">
                        {METHOD_LABELS[p.method]} · {formatDateTime(p.createdAt)}
                      </p>
                    </div>
                    <p className={`shrink-0 font-bold ${p.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>
                      {formatMoney(p.amount)}
                    </p>
                  </div>
                )}
              />
              <Pagination page={page} total={result.total} limit={result.limit} itemLabel={['paiement', 'paiements']} onPage={list.setPage} />
            </>
          )}
        </>
      )}
    </div>
  )
}

// --- Dettes fournisseurs ----------------------------------------------------------

type DebtsResult = Paginated<SupplierDebt> & { totalBalance: number }

function DebtsTab() {
  const { page, setPage } = useListParams()
  const [result, setResult] = useState<DebtsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<DebtsResult>('/supplier-debts', { params: { page, limit: 20 } })
      .then(({ data }) => setResult(data))
      .catch((err: unknown) => setError(getErrorMessage(err)))
  }, [page])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!result) return <LoadingState />

  return (
    <div className="space-y-6">
      <StatCard
        label="Je dois aux fournisseurs"
        value={formatMoney(result.totalBalance)}
        icon={Truck}
        tone={result.totalBalance > 0 ? 'red' : 'green'}
        hint={`${result.total} fournisseur${result.total > 1 ? 's' : ''} à payer`}
      />
      {result.data.length === 0 ? (
        <Card>
          <EmptyState icon={CircleCheck} tone="green" title="Aucune dette fournisseur" description="Vous ne devez rien à vos fournisseurs." />
        </Card>
      ) : (
        <>
          <DataList
            rows={result.data}
            rowKey={(d) => d.supplier.id}
            rowHref={(d) => `/suppliers/${d.supplier.id}`}
            columns={[
              { header: 'Fournisseur', cell: (d) => <span className="font-semibold text-slate-900">{d.supplier.name}</span> },
              { header: 'Achats', align: 'right', cell: (d) => formatMoney(d.purchases) },
              { header: 'Déjà payé', align: 'right', cell: (d) => formatMoney(d.paid) },
              { header: 'Je dois', align: 'right', cell: (d) => <span className="font-bold text-red-700">{formatMoney(d.balance)}</span> },
            ]}
            mobileCard={(d) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{d.supplier.name}</p>
                  <p className="text-sm text-slate-500">Payé {formatMoney(d.paid)} sur {formatMoney(d.purchases)}</p>
                </div>
                <p className="shrink-0 text-lg font-bold text-red-700">{formatMoney(d.balance)}</p>
              </div>
            )}
          />
          <Pagination page={page} total={result.total} limit={result.limit} itemLabel={['fournisseur', 'fournisseurs']} onPage={setPage} />
        </>
      )}
      <p className="text-sm text-slate-500">
        Les achats comptés sont les entrées de stock enregistrées avec un fournisseur et un prix d'achat.
      </p>
    </div>
  )
}

// --- Page -----------------------------------------------------------------------

export function FinancePage() {
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabs: (ChipOption<Tab> & { visible: boolean; icon: LucideIcon })[] = [
    { value: 'receivables', label: 'Les clients me doivent', icon: Users, visible: auth.can('payments.read') },
    { value: 'payments', label: 'Argent reçu', icon: Wallet, visible: auth.can('payments.read') },
    { value: 'debts', label: 'Je dois aux fournisseurs', icon: Truck, visible: auth.can('supplier_payments.read') },
  ]
  const visible = tabs.filter((t) => t.visible)
  const requested = searchParams.get('tab') as Tab | null
  const tab = visible.find((t) => t.value === requested)?.value ?? visible[0]?.value

  return (
    <div>
      <PageHeader title="Paiements" description="Ce que l'on vous doit, ce que vous avez reçu et ce que vous devez." icon={Wallet} tone="green" />
      {visible.length > 1 && tab && (
        <div className="mb-6">
          <Chips label="Rubrique" size="lg" options={visible} value={tab} onChange={(v) => setSearchParams({ tab: v }, { replace: true })} />
        </div>
      )}
      {tab === 'receivables' && <ReceivablesTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'debts' && <DebtsTab />}
      {visible.some((t) => t.value === 'receivables') && tab !== 'receivables' && (
        <p className="mt-6 text-sm text-slate-500">
          Astuce : pour encaisser une facture, ouvrez-la depuis <Link to="/sales?pay=UNPAID" className="font-medium text-blue-700 hover:underline">les factures non payées</Link>.
        </p>
      )}
    </div>
  )
}
