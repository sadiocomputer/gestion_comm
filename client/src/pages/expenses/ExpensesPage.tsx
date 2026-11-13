import { Ban, BanknoteArrowUp, ChartPie, Plus, Tags, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { ExpenseForm } from '../../components/expenses/ExpenseForm'
import { METHOD_ICONS, METHOD_LABELS } from '../../components/payments/PaymentWidgets'
import { TextField } from '../../components/TextField'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Chips, type ChipOption } from '../../components/ui/Chips'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProportionList } from '../../components/ui/ProportionList'
import { Pagination } from '../../components/ui/Pagination'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type Expense, type ExpenseCategory, type Paginated } from '../../lib/api'
import { daysAgoISO, formatDayISO, formatMoney, lastMonthRangeISO, monthStartISO, todayISO } from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

type Period = 'today' | 'week' | 'month' | 'lastMonth'

const PERIODS: ChipOption<Period>[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
]

const PERIOD_TITLES: Record<Period, string> = {
  today: "Dépensé aujourd'hui",
  week: 'Dépensé ces 7 derniers jours',
  month: 'Dépensé ce mois',
  lastMonth: 'Dépensé le mois dernier',
}

function periodRange(period: Period): { from: string; to: string } {
  if (period === 'today') return { from: todayISO(), to: todayISO() }
  if (period === 'week') return { from: daysAgoISO(6), to: todayISO() }
  if (period === 'lastMonth') return lastMonthRangeISO()
  return { from: monthStartISO(), to: todayISO() }
}

type ExpensesResult = Paginated<Expense> & {
  validTotal: number
  byCategory: { id: number; name: string; total: number }[]
}

export function ExpensesPage() {
  const auth = useAuth()
  const toast = useToast()
  const list = useListParams()
  const period = (list.get('period') ?? 'month') as Period
  const categoryId = list.get('category') ?? ''

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [result, setResult] = useState<ExpensesResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [toCancel, setToCancel] = useState<Expense | null>(null)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const canCreate = auth.can('expenses.create')
  const canCancel = auth.can('expenses.cancel')

  const loadCategories = useCallback(() => {
    api
      .get<ExpenseCategory[]>('/expense-categories')
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    let cancelled = false
    const { from, to } = periodRange(period)
    api
      .get<ExpensesResult>('/expenses', {
        params: { page: list.page, limit: 20, from, to, categoryId: categoryId || undefined },
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
  }, [list.page, period, categoryId, reloadKey])

  function handleCreated() {
    setFormOpen(false)
    toast.success('Dépense enregistrée')
    loadCategories()
    setReloadKey((k) => k + 1)
  }

  async function confirmCancel() {
    if (!toCancel) return
    setCancelling(true)
    try {
      await api.post(`/expenses/${toCancel.id}/cancel`, { reason })
      toast.success('Dépense annulée')
      setToCancel(null)
      setReason('')
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  const cancelButton = (e: Expense) =>
    e.status === 'VALID' && canCancel ? (
      <Button
        variant="ghost"
        size="sm"
        icon={Undo2}
        className="text-red-700 hover:bg-red-50"
        onClick={() => setToCancel(e)}
      >
        Annuler
      </Button>
    ) : null

  const amountCell = (e: Expense) =>
    e.status === 'CANCELLED' ? (
      <span className="inline-flex items-center gap-2">
        <span className="line-through">{formatMoney(e.amount)}</span>
        <Badge tone="red" icon={Ban}>Annulée</Badge>
      </span>
    ) : (
      <span className="font-bold text-slate-900">− {formatMoney(e.amount)}</span>
    )

  return (
    <div>
      <PageHeader
        title="Dépenses"
        description="L'argent qui sort de la boutique : loyer, électricité, salaires…"
        icon={BanknoteArrowUp}
        tone="orange"
        actions={
          <>
            <ButtonLink to="/expenses/categories" variant="secondary" icon={Tags}>
              Catégories
            </ButtonLink>
            {canCreate && (
              <Button icon={Plus} onClick={() => setFormOpen(true)}>
                Nouvelle dépense
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Chips label="Période" options={PERIODS} value={period} onChange={(v) => list.update({ period: v === 'month' ? null : v })} />
        {categories.length > 0 && (
          <select
            aria-label="Catégorie"
            value={categoryId}
            onChange={(e) => list.update({ category: e.target.value || null })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
            <StatCard
              label={PERIOD_TITLES[period]}
              value={formatMoney(result.validTotal)}
              icon={BanknoteArrowUp}
              tone="orange"
              hint={`${result.byCategory.length} catégorie${result.byCategory.length > 1 ? 's' : ''}`}
            />

            {result.byCategory.length > 0 && (
              <Card>
                <CardHeader icon={ChartPie} tone="orange" title="Où va l'argent ?" />
                <CardBody>
                  <ProportionList
                    items={result.byCategory.map((c) => ({ key: c.id, label: c.name, value: c.total }))}
                    formatValue={formatMoney}
                  />
                </CardBody>
              </Card>
            )}
          </div>

          {result.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={BanknoteArrowUp}
                tone="orange"
                title="Aucune dépense sur cette période"
                description="Enregistrez vos dépenses pour savoir où va votre argent."
                action={
                  canCreate && (
                    <Button icon={Plus} size="lg" onClick={() => setFormOpen(true)}>
                      Enregistrer une dépense
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <>
              <DataList
                rows={result.data}
                rowKey={(e) => e.id}
                isMuted={(e) => e.status === 'CANCELLED'}
                columns={[
                  { header: 'Date', cell: (e) => <span className="whitespace-nowrap text-slate-600">{formatDayISO(e.expenseDate)}</span> },
                  {
                    header: 'Dépense',
                    cell: (e) => (
                      <span>
                        <span className="block font-semibold text-slate-900">{e.description}</span>
                        <span className="block text-sm text-slate-500">{e.category.name}</span>
                      </span>
                    ),
                  },
                  {
                    header: 'Payé en',
                    hideOnTablet: true,
                    cell: (e) => {
                      const Icon = METHOD_ICONS[e.method]
                      return (
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Icon size={16} aria-hidden /> {METHOD_LABELS[e.method]}
                        </span>
                      )
                    },
                  },
                  { header: 'Par', hideOnTablet: true, cell: (e) => <span className="text-slate-600">{e.user.name}</span> },
                  { header: 'Montant', align: 'right', cell: amountCell },
                  { header: 'Action', align: 'right', cell: (e) => cancelButton(e) },
                ]}
                mobileCard={(e) => (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <IconBubble icon={BanknoteArrowUp} tone={e.status === 'CANCELLED' ? 'slate' : 'orange'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{e.description}</p>
                        <p className="text-sm text-slate-500">
                          {e.category.name} · {formatDayISO(e.expenseDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">{amountCell(e)}</div>
                    </div>
                    {e.status === 'CANCELLED' && e.cancelReason && (
                      <p className="text-sm text-red-700">Motif : {e.cancelReason}</p>
                    )}
                    {cancelButton(e) && <div className="flex justify-end">{cancelButton(e)}</div>}
                  </div>
                )}
              />
              <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['dépense', 'dépenses']} onPage={list.setPage} />
            </>
          )}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nouvelle dépense">
        {categories.length === 0 ? (
          <Alert tone="warning">Aucune catégorie de dépense : créez-en une dans « Catégories ».</Alert>
        ) : (
          <ExpenseForm categories={categories} onDone={handleCreated} />
        )}
      </Modal>

      <ConfirmDialog
        open={toCancel !== null}
        title="Annuler cette dépense ?"
        message={
          toCancel && (
            <>
              La dépense « {toCancel.description} » de <strong>{formatMoney(toCancel.amount)}</strong> ne sera
              plus comptée. Elle reste visible dans l'historique.
            </>
          )
        }
        confirmLabel="Annuler la dépense"
        icon={Undo2}
        loading={cancelling}
        confirmDisabled={reason.trim().length < 2}
        onConfirm={() => void confirmCancel()}
        onCancel={() => {
          setToCancel(null)
          setReason('')
        }}
      >
        <TextField
          label="Motif"
          placeholder="Ex. saisie en double"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={255}
        />
      </ConfirmDialog>
    </div>
  )
}
