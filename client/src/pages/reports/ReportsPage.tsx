import {
  BanknoteArrowUp,
  Boxes,
  ChartColumn,
  ChartNoAxesCombined,
  Coins,
  Printer,
  Scale,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  Truck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { METHOD_ICONS, METHOD_LABELS } from '../../components/payments/PaymentWidgets'
import { TextField } from '../../components/TextField'
import { BarChart, SERIES_COLORS } from '../../components/ui/BarChart'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Chips, type ChipOption } from '../../components/ui/Chips'
import { DataList } from '../../components/ui/DataList'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProportionList } from '../../components/ui/ProportionList'
import { StatCard } from '../../components/ui/StatCard'
import { api, getErrorMessage, type PaymentMethod } from '../../lib/api'
import {
  formatDayISO,
  formatMoney,
  formatQuantity,
  lastMonthRangeISO,
  monthStartISO,
  todayISO,
  yearStartISO,
} from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

type Report = {
  period: { from: string; to: string; days: number; granularity: 'day' | 'month' }
  result: {
    revenue: number
    salesCount: number
    averageBasket: number
    discounts: number
    costOfGoodsSold: number
    grossMargin: number
    grossMarginRate: number | null
    expenses: number
    netProfit: number
  }
  cash: {
    cashIn: number
    byMethod: { method: PaymentMethod; total: number; count: number }[]
    supplierPaid: number
    expenses: number
    balance: number
  }
  topProducts: { id: number; name: string; unit: string; quantity: number; revenue: number; margin: number }[]
  bySeller: { id: number; name: string; count: number; revenue: number }[]
  expensesByCategory: { id: number; name: string; total: number }[]
  series: { bucket: string; sales: number; expenses: number }[]
  snapshot: {
    receivables: number
    supplierDebts: number
    stockCostValue: number
    stockSaleValue: number
    activeProducts: number
    outOfStock: number
    lowStock: number
  }
}

type Period = 'month' | 'lastMonth' | 'year' | 'custom'

const PERIODS: ChipOption<Period>[] = [
  { value: 'month', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Autre période' },
]

function rangeFor(period: Period, from: string | null, to: string | null) {
  if (period === 'lastMonth') return lastMonthRangeISO()
  if (period === 'year') return { from: yearStartISO(), to: todayISO() }
  if (period === 'custom') return { from: from ?? monthStartISO(), to: to ?? todayISO() }
  return { from: monthStartISO(), to: todayISO() }
}

/** "2026-11" ou "2026-11-12" -> libellés courts et longs du graphique. */
function bucketLabels(bucket: string, granularity: 'day' | 'month', days: number) {
  if (granularity === 'month') {
    const date = new Date(`${bucket}-15T12:00:00Z`)
    return {
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      fullLabel: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  }
  const date = new Date(`${bucket}T12:00:00Z`)
  return {
    label: date.toLocaleDateString('fr-FR', days <= 7 ? { weekday: 'short' } : { day: 'numeric' }),
    fullLabel: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

/** Une étape du calcul « CA − coût = marge − dépenses = bénéfice ». */
function Step({ sign, label, value, tone }: { sign?: string; label: string; value: number; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-slate-900'
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="flex items-baseline gap-3 text-[15px] text-slate-600">
        <span className="w-4 text-center font-bold text-slate-400" aria-hidden>
          {sign}
        </span>
        {label}
      </span>
      <span className={`text-lg font-bold whitespace-nowrap ${color}`}>{formatMoney(value)}</span>
    </div>
  )
}

export function ReportsPage() {
  const list = useListParams()
  const period = (list.get('period') ?? 'month') as Period
  const range = rangeFor(period, list.get('from'), list.get('to'))

  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    api
      .get<Report>('/reports', { params: range })
      .then(({ data }) => {
        if (!cancelled) setReport(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to])

  const r = report?.result
  const profitable = (r?.netProfit ?? 0) >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description={`Du ${formatDayISO(range.from)} au ${formatDayISO(range.to)}`}
        icon={ChartNoAxesCombined}
        tone="violet"
        actions={
          <Button variant="secondary" icon={Printer} onClick={() => window.print()} disabled={!report}>
            Imprimer le rapport
          </Button>
        }
      />
      {/* Titre visible uniquement sur papier */}
      <h1 className="hidden text-2xl font-bold print:block">
        Rapport du {formatDayISO(range.from)} au {formatDayISO(range.to)}
      </h1>

      <div className="space-y-3 print:hidden">
        <Chips
          label="Période"
          options={PERIODS}
          value={period}
          onChange={(v) =>
            list.update(v === 'custom' ? { period: v, from: range.from, to: range.to } : { period: v === 'month' ? null : v, from: null, to: null })
          }
        />
        {period === 'custom' && (
          <div className="grid max-w-md grid-cols-2 gap-3">
            <TextField label="Du" type="date" max={range.to} value={range.from} onChange={(e) => e.target.value && list.update({ from: e.target.value })} />
            <TextField label="Au" type="date" min={range.from} max={todayISO()} value={range.to} onChange={(e) => e.target.value && list.update({ to: e.target.value })} />
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!report && !error && <LoadingState label="Calcul du rapport…" />}

      {report && r && (
        <>
          {/* ---------- Est-ce que je gagne de l'argent ? ---------- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Chiffre d'affaires"
              value={formatMoney(r.revenue)}
              icon={ShoppingCart}
              tone="blue"
              hint={`${r.salesCount} vente${r.salesCount > 1 ? 's' : ''} · panier moyen ${formatMoney(r.averageBasket)}`}
            />
            <StatCard
              label="Marge sur les produits"
              value={formatMoney(r.grossMargin)}
              icon={Coins}
              tone={r.grossMargin >= 0 ? 'green' : 'red'}
              hint={r.grossMarginRate !== null ? `${Math.round(r.grossMarginRate * 100)} % du chiffre d'affaires` : undefined}
            />
            <StatCard label="Dépenses" value={formatMoney(r.expenses)} icon={BanknoteArrowUp} tone="orange" />
            <StatCard
              label={profitable ? 'Bénéfice' : 'Perte'}
              value={formatMoney(Math.abs(r.netProfit))}
              icon={profitable ? TrendingUp : TrendingDown}
              tone={profitable ? 'green' : 'red'}
              hint={profitable ? 'Ce que la boutique a gagné' : 'Les dépenses dépassent la marge'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card>
              <CardHeader icon={Scale} tone={profitable ? 'green' : 'red'} title="Comment est calculé le bénéfice" />
              <CardBody className="divide-y divide-slate-100 py-2">
                <Step label="Chiffre d'affaires (ventes)" value={r.revenue} />
                <Step sign="−" label="Prix d'achat des produits vendus" value={r.costOfGoodsSold} />
                <Step sign="=" label="Marge sur les produits" value={r.grossMargin} tone={r.grossMargin >= 0 ? 'green' : 'red'} />
                <Step sign="−" label="Dépenses (loyer, salaires…)" value={r.expenses} />
                <Step sign="=" label={profitable ? 'Bénéfice' : 'Perte'} value={r.netProfit} tone={profitable ? 'green' : 'red'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={Wallet} tone="green" title="Argent reçu et versé" description="Mouvements réels d'argent sur la période." />
              <CardBody className="divide-y divide-slate-100 py-2">
                <Step sign="+" label="Encaissé auprès des clients" value={report.cash.cashIn} tone="green" />
                {report.cash.byMethod.length > 0 && (
                  <ul className="space-y-1 py-2 pl-7 text-sm text-slate-600">
                    {report.cash.byMethod.map((m) => {
                      const Icon = METHOD_ICONS[m.method]
                      return (
                        <li key={m.method} className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <Icon size={15} aria-hidden /> {METHOD_LABELS[m.method]}
                          </span>
                          <span>{formatMoney(m.total)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <Step sign="−" label="Payé aux fournisseurs" value={report.cash.supplierPaid} />
                <Step sign="−" label="Dépenses" value={report.cash.expenses} />
                <Step
                  sign="="
                  label={report.cash.balance >= 0 ? 'Reste dans la caisse' : 'Sorti de la caisse'}
                  value={report.cash.balance}
                  tone={report.cash.balance >= 0 ? 'green' : 'red'}
                />
              </CardBody>
            </Card>
          </div>

          {/* ---------- Évolution ---------- */}
          <Card>
            <CardHeader
              icon={ChartColumn}
              title="Ventes et dépenses"
              description={report.period.granularity === 'day' ? 'Jour par jour' : 'Mois par mois'}
            />
            <CardBody>
              {report.series.every((s) => s.sales === 0 && s.expenses === 0) ? (
                <p className="py-10 text-center text-[15px] text-slate-500">Aucune vente ni dépense sur cette période.</p>
              ) : (
                <BarChart
                  series={[
                    { label: 'Ventes', color: SERIES_COLORS[0] },
                    { label: 'Dépenses', color: SERIES_COLORS[1] },
                  ]}
                  data={report.series.map((s) => ({
                    ...bucketLabels(s.bucket, report.period.granularity, report.period.days),
                    values: [s.sales, s.expenses],
                  }))}
                  formatValue={formatMoney}
                  caption="Ventes et dépenses sur la période"
                />
              )}
            </CardBody>
          </Card>

          {/* ---------- Produits, vendeurs, dépenses ---------- */}
          <Card>
            <CardHeader icon={Trophy} tone="orange" title="Les produits qui rapportent le plus" />
            <CardBody>
              {report.topProducts.length === 0 ? (
                <p className="text-[15px] text-slate-500">Aucune vente sur cette période.</p>
              ) : (
                <DataList
                  rows={report.topProducts}
                  rowKey={(p) => p.id}
                  rowHref={(p) => `/products/${p.id}`}
                  columns={[
                    {
                      header: 'Produit',
                      cell: (p) => (
                        <span className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                            {report.topProducts.indexOf(p) + 1}
                          </span>
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </span>
                      ),
                    },
                    { header: 'Vendu', align: 'right', cell: (p) => formatQuantity(p.quantity, p.unit) },
                    { header: "Chiffre d'affaires", align: 'right', cell: (p) => <span className="font-semibold">{formatMoney(p.revenue)}</span> },
                    {
                      header: 'Marge',
                      align: 'right',
                      cell: (p) => <span className={p.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatMoney(p.margin)}</span>,
                    },
                  ]}
                  mobileCard={(p) => (
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                        {report.topProducts.indexOf(p) + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{p.name}</p>
                        <p className="text-sm text-slate-500">
                          {formatQuantity(p.quantity, p.unit)} · marge {formatMoney(p.margin)}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold text-slate-900">{formatMoney(p.revenue)}</p>
                    </div>
                  )}
                />
              )}
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card>
              <CardHeader icon={UserRound} title="Ventes par vendeur" />
              <CardBody>
                {report.bySeller.length === 0 ? (
                  <p className="text-[15px] text-slate-500">Aucune vente sur cette période.</p>
                ) : (
                  <ProportionList
                    color={SERIES_COLORS[0]}
                    items={report.bySeller.map((s) => ({ key: s.id, label: `${s.name} (${s.count} vente${s.count > 1 ? 's' : ''})`, value: s.revenue }))}
                    formatValue={formatMoney}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={BanknoteArrowUp} tone="orange" title="Dépenses par catégorie" />
              <CardBody>
                {report.expensesByCategory.length === 0 ? (
                  <p className="text-[15px] text-slate-500">Aucune dépense sur cette période.</p>
                ) : (
                  <ProportionList
                    items={report.expensesByCategory.map((c) => ({ key: c.id, label: c.name, value: c.total }))}
                    formatValue={formatMoney}
                  />
                )}
              </CardBody>
            </Card>
          </div>

          {/* ---------- Situation actuelle ---------- */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Situation aujourd'hui</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Les clients me doivent"
                value={formatMoney(report.snapshot.receivables)}
                icon={Users}
                tone={report.snapshot.receivables > 0 ? 'orange' : 'green'}
                to="/finance?tab=receivables"
              />
              <StatCard
                label="Je dois aux fournisseurs"
                value={formatMoney(report.snapshot.supplierDebts)}
                icon={Truck}
                tone={report.snapshot.supplierDebts > 0 ? 'red' : 'green'}
                to="/finance?tab=debts"
              />
              <StatCard
                label="Valeur du stock (prix d'achat)"
                value={formatMoney(report.snapshot.stockCostValue)}
                icon={Boxes}
                tone="blue"
                hint={`Vendu au prix actuel : ${formatMoney(report.snapshot.stockSaleValue)}`}
                to="/products"
              />
              <StatCard
                label="Produits à racheter"
                value={report.snapshot.outOfStock + report.snapshot.lowStock}
                icon={Boxes}
                tone={report.snapshot.outOfStock + report.snapshot.lowStock > 0 ? 'orange' : 'green'}
                hint={`${report.snapshot.outOfStock} en rupture · ${report.snapshot.lowStock} stock bas`}
                to="/products?low=1"
              />
            </div>
          </section>

          <p className="text-sm text-slate-500">
            Les ventes et la marge comptent les ventes validées (hors annulations). La marge utilise le prix d'achat
            enregistré au moment de chaque vente.
          </p>
        </>
      )}
    </div>
  )
}
