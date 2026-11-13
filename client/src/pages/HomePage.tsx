import {
  ArrowRight,
  BanknoteArrowUp,
  ChartColumn,
  FileText,
  HandCoins,
  Package,
  PackageCheck,
  PackagePlus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { StockBadge } from '../components/stock/StockBadge'
import { BarChart, SERIES_COLORS, type ChartSeries } from '../components/ui/BarChart'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { IconBubble, type Tone } from '../components/ui/IconBubble'
import { SkeletonLines } from '../components/ui/Loading'
import { PeriodFilter } from '../components/ui/PeriodFilter'
import { StatCard } from '../components/ui/StatCard'
import { api, getErrorMessage } from '../lib/api'
import { formatDayISO, formatMoney } from '../lib/format'
import { bucketLabels, periodRange, periodSearch, type PeriodKey } from '../lib/period'
import type { PermissionCode } from '../lib/permissions'
import { useListParams } from '../lib/useListParams'
import { usePeriodFilter } from '../lib/usePeriodFilter'

type Amount = { total: number; count: number }

type Dashboard = {
  period: { from: string; to: string; days: number }
  // Activité de la période choisie
  sales: Amount | null
  cash: number | null
  expenses: number | null
  profit: { revenue: number; costOfGoodsSold: number; expenses: number; netProfit: number } | null
  chart: {
    from: string
    to: string
    granularity: 'day' | 'month'
    points: { bucket: string; sales: number | null; salesCount: number | null; expenses: number | null }[]
  } | null
  // Situation actuelle
  receivables: number | null
  supplierDebts: number | null
  stock: {
    activeProducts: number
    lowStock: number
    outOfStock: number
    alerts: { id: number; name: string; quantity: number; minStock: number; unit: string }[]
  } | null
}

type QuickAction = {
  to: string
  label: string
  icon: LucideIcon
  tone: Tone
  permission: PermissionCode
}

/** Les gestes du quotidien, en raccourcis reconnaissables. */
const ACTIONS: QuickAction[] = [
  { to: '/sales/new', label: 'Vendre', icon: ShoppingCart, tone: 'blue', permission: 'sales.create' },
  { to: '/sales?pay=UNPAID', label: 'Encaisser', icon: HandCoins, tone: 'green', permission: 'payments.create' },
  { to: '/sales', label: 'Factures', icon: FileText, tone: 'violet', permission: 'sales.read' },
  { to: '/expenses', label: 'Dépense', icon: BanknoteArrowUp, tone: 'orange', permission: 'expenses.create' },
  { to: '/products?low=1', label: 'Stock bas', icon: TriangleAlert, tone: 'orange', permission: 'products.read' },
  { to: '/products/new', label: 'Nouveau produit', icon: PackagePlus, tone: 'slate', permission: 'products.create' },
  { to: '/clients/new', label: 'Nouveau client', icon: UserPlus, tone: 'slate', permission: 'clients.create' },
]

function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
}

/** Périodes proposées sur le tableau de bord ; « Aujourd'hui » par défaut. */
const PERIODS: PeriodKey[] = ['today', 'week', 'month', 'lastMonth', 'custom']

/** Petit titre de section (« Sur la période », « En ce moment »). */
function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{children}</h2>
}

export function HomePage() {
  const auth = useAuth()
  const list = useListParams()
  const filter = usePeriodFilter(list, PERIODS, 'today')
  // « Tout » n'est pas proposé ici : la période a toujours des dates.
  const { from, to } = filter.range ?? periodRange('today')
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Dashboard>('/dashboard', { params: { from, to } })
      .then(({ data: d }) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  if (auth.status !== 'authenticated') return null

  const actions = ACTIONS.filter((a) => auth.can(a.permission))
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const phrase = filter.phrase
  /** Pour ouvrir Factures / Paiements sur la même période. */
  const samePeriod = periodSearch(filter.period, { from, to })
  const canSeeActivity = (['sales.read', 'payments.read', 'expenses.read', 'dashboard.profit'] as const).some((p) =>
    auth.can(p),
  )
  const hasActivity =
    data && (data.sales !== null || data.cash !== null || data.expenses !== null || data.profit !== null)
  const hasSnapshot = data && (data.receivables !== null || data.supplierDebts !== null || data.stock !== null)
  const profitable = (data?.profit?.netProfit ?? 0) >= 0

  // Séries du graphique, dans un ordre fixe : ventes (bleu) puis dépenses (orange).
  const chart = data?.chart ?? null
  const hasSales = chart?.points[0]?.sales != null
  const hasExpenses = chart?.points[0]?.expenses != null
  const chartSeries: ChartSeries[] = [
    ...(hasSales ? [{ label: 'Ventes', color: SERIES_COLORS[0] }] : []),
    ...(hasExpenses ? [{ label: 'Dépenses', color: SERIES_COLORS[1] }] : []),
  ]
  const chartData = (chart?.points ?? []).map((p) => {
    const count = p.salesCount ?? 0
    return {
      ...bucketLabels(p.bucket, chart!.granularity, chart!.points.length),
      values: [...(hasSales ? [p.sales ?? 0] : []), ...(hasExpenses ? [p.expenses ?? 0] : [])],
      detail: hasSales ? (count === 0 ? 'Aucune vente' : `${count} vente${count > 1 ? 's' : ''}`) : undefined,
    }
  })
  const chartIsEmpty = chartData.every((d) => d.values.every((v) => v === 0))
  const chartTitle = hasSales && hasExpenses ? 'Ventes et dépenses' : hasSales ? 'Mes ventes' : 'Mes dépenses'
  // « Aujourd'hui » : le graphique montre quand même les 7 derniers jours.
  const chartPeriod = chart
    ? chart.from === from
      ? phrase
      : `du ${formatDayISO(chart.from)} au ${formatDayISO(chart.to)}`
    : ''

  return (
    <div className="space-y-8">
      {/* ---------- Bienvenue ---------- */}
      <div>
        <p className="text-[15px] font-medium text-slate-500 first-letter:uppercase">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {greeting()}, {auth.user.name.split(' ')[0]}
        </h1>
      </div>

      {/* ---------- Raccourcis ---------- */}
      {actions.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md"
            >
              <IconBubble icon={action.icon} tone={action.tone} />
              <span className="text-sm leading-tight font-semibold text-slate-800">{action.label}</span>
            </Link>
          ))}
        </div>
      ) : (
        <Alert tone="info">
          Aucun rôle ne vous a encore été attribué. Demandez à l'administrateur de vous donner accès aux fonctions
          dont vous avez besoin.
        </Alert>
      )}

      {/* ---------- Période ---------- */}
      {canSeeActivity && <PeriodFilter filter={filter} label="Période du tableau de bord" />}

      {error && <Alert tone="error">{error}</Alert>}

      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <SkeletonLines lines={2} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ---------- Activité de la période ---------- */}
      {hasActivity && data && (
        <section aria-label="Activité de la période">
          <SectionTitle>{`Sur la période : ${phrase}`}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.sales !== null && (
              <StatCard
                label="Ventes"
                value={formatMoney(data.sales.total)}
                icon={ShoppingCart}
                tone="blue"
                hint={`${data.sales.count} vente${data.sales.count > 1 ? 's' : ''}`}
                to={`/sales?${samePeriod}`}
              />
            )}
            {data.cash !== null && (
              <StatCard
                label="Argent reçu"
                value={formatMoney(data.cash)}
                icon={Wallet}
                tone="green"
                hint="Réellement encaissé"
                to={`/finance?tab=payments&${samePeriod}`}
              />
            )}
            {data.expenses !== null && (
              <StatCard
                label="Dépenses"
                value={formatMoney(data.expenses)}
                icon={BanknoteArrowUp}
                tone="orange"
                // L'écran Dépenses n'a pas (encore) de dates libres.
                to={filter.period === 'custom' ? '/expenses' : `/expenses?period=${filter.period}`}
              />
            )}
            {data.profit !== null && (
              <StatCard
                label={profitable ? 'Bénéfice' : 'Perte'}
                value={formatMoney(Math.abs(data.profit.netProfit))}
                icon={profitable ? TrendingUp : TrendingDown}
                tone={profitable ? 'green' : 'red'}
                hint={`Ventes ${formatMoney(data.profit.revenue)} − achats des produits ${formatMoney(
                  data.profit.costOfGoodsSold,
                )} − dépenses ${formatMoney(data.profit.expenses)}`}
                to={auth.can('reports.read') ? `/reports?period=custom&from=${from}&to=${to}` : undefined}
              />
            )}
          </div>
          {data.profit !== null && (
            <p className="mt-3 text-sm text-slate-500">
              Les produits vendus sans prix d'achat comptent pour 0 : le bénéfice paraît alors plus élevé qu'en réalité.
            </p>
          )}
        </section>
      )}

      {/* ---------- Situation actuelle ---------- */}
      {hasSnapshot && data && (
        <section aria-label="Situation actuelle">
          <SectionTitle>En ce moment</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.receivables !== null && (
              <StatCard
                label="Les clients me doivent"
                value={formatMoney(data.receivables)}
                icon={Users}
                tone={data.receivables > 0 ? 'orange' : 'green'}
                hint={data.receivables > 0 ? 'Argent à récupérer' : 'Tout le monde est à jour'}
                to="/finance?tab=receivables"
              />
            )}
            {data.supplierDebts !== null && (
              <StatCard
                label="Je dois aux fournisseurs"
                value={formatMoney(data.supplierDebts)}
                icon={Truck}
                tone={data.supplierDebts > 0 ? 'red' : 'green'}
                hint={data.supplierDebts > 0 ? 'À payer' : 'Aucune dette'}
                to="/finance?tab=debts"
              />
            )}
            {data.stock && (
              <StatCard label="Produits en vente" value={data.stock.activeProducts} icon={PackageCheck} tone="blue" to="/products" />
            )}
            {data.stock && (
              <StatCard
                label="Bientôt en rupture"
                value={data.stock.lowStock + data.stock.outOfStock}
                icon={TriangleAlert}
                tone={data.stock.lowStock + data.stock.outOfStock > 0 ? 'orange' : 'green'}
                hint={
                  data.stock.outOfStock > 0
                    ? `dont ${data.stock.outOfStock} déjà en rupture`
                    : data.stock.lowStock > 0
                      ? 'Pensez à racheter'
                      : 'Stock suffisant partout'
                }
                to="/products?low=1"
              />
            )}
          </div>
        </section>
      )}

      {/* ---------- Graphique + alertes de stock ---------- */}
      {data && (chartSeries.length > 0 || data.stock) && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          {chartSeries.length > 0 && (
            <Card>
              <CardHeader
                icon={ChartColumn}
                title={chartTitle}
                description={`${chart?.granularity === 'month' ? 'Par mois' : 'Par jour'}, ${chartPeriod}`}
              />
              <CardBody>
                {chartIsEmpty ? (
                  <p className="py-12 text-center text-[15px] text-slate-500">
                    Rien sur cette période. Le graphique se remplira avec vos ventes et vos dépenses.
                  </p>
                ) : (
                  <BarChart
                    data={chartData}
                    series={chartSeries}
                    formatValue={formatMoney}
                    caption={`${chartTitle} ${chart?.granularity === 'month' ? 'par mois' : 'par jour'}, ${chartPeriod}`}
                  />
                )}
              </CardBody>
            </Card>
          )}

          {data.stock && (
            <Card>
              <CardHeader icon={Package} tone="orange" title="À racheter" />
              <CardBody>
                {data.stock.alerts.length === 0 ? (
                  <p className="text-[15px] text-slate-500">Aucun produit en stock bas. Tout va bien.</p>
                ) : (
                  <ul className="-my-2 divide-y divide-slate-100">
                    {data.stock.alerts.map((p) => (
                      <li key={p.id}>
                        <Link to={`/products/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.name}</span>
                          <StockBadge quantity={p.quantity} minStock={p.minStock} unit={p.unit} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {data.stock.lowStock + data.stock.outOfStock > data.stock.alerts.length && (
                  <Link
                    to="/products?low=1"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Voir tout <ArrowRight size={16} aria-hidden />
                  </Link>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
