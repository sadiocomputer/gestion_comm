import { History, SearchX, Warehouse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { MOVEMENT_LABELS, MOVEMENT_STYLE, MovementsTable } from '../../components/stock/MovementsTable'
import { Card } from '../../components/ui/Card'
import { Chips, type ChipOption } from '../../components/ui/Chips'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { PeriodFilter } from '../../components/ui/PeriodFilter'
import { api, getErrorMessage, type MovementType, type Paginated, type StockMovement } from '../../lib/api'
import type { PeriodKey } from '../../lib/period'
import { useListParams } from '../../lib/useListParams'
import { usePeriodFilter } from '../../lib/usePeriodFilter'

const PERIODS: PeriodKey[] = ['all', 'today', 'week', 'month', 'lastMonth', 'custom']

type TypeFilter = 'all' | MovementType

const TYPE_OPTIONS: ChipOption<TypeFilter>[] = [
  { value: 'all', label: 'Tous' },
  ...(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => ({
    value: t,
    label: MOVEMENT_LABELS[t],
    icon: MOVEMENT_STYLE[t][0],
  })),
]

/** Historique de tous les mouvements de stock. */
export function StockMovementsPage() {
  const list = useListParams()
  const type = (list.get('type') ?? 'all') as TypeFilter
  const filter = usePeriodFilter(list, PERIODS, 'all')
  const from = filter.range?.from
  const to = filter.range?.to

  const [result, setResult] = useState<Paginated<StockMovement> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<StockMovement>>('/stock-movements', {
        params: { page: list.page, limit: 20, type: type === 'all' ? undefined : type, from, to },
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
  }, [list.page, type, from, to])

  const filtered = type !== 'all' || filter.period !== 'all'

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Tout ce qui est entré et sorti de votre magasin."
        icon={Warehouse}
        tone="orange"
      />

      <div className="mb-6 space-y-4">
        <PeriodFilter filter={filter} />
        <Chips label="Type de mouvement" options={TYPE_OPTIONS} value={type} onChange={(v) => list.update({ type: v === 'all' ? null : v })} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && result.data.length === 0 && (
        <Card>
          {filtered ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="Aucun mouvement trouvé"
              description="Essayez une autre période ou un autre type de mouvement."
            />
          ) : (
            <EmptyState
              icon={History}
              tone="slate"
              title="Aucun mouvement de stock"
              description="Les entrées, sorties et ventes apparaîtront ici."
            />
          )}
        </Card>
      )}

      {result && result.data.length > 0 && (
        <div className="space-y-4">
          <MovementsTable movements={result.data} showProduct />
          <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['mouvement', 'mouvements']} onPage={list.setPage} />
        </div>
      )}
    </div>
  )
}
