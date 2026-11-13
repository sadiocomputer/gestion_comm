import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  RotateCcw,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'
import type { MovementType, StockMovement } from '../../lib/api'
import { formatDateTime, formatMoney, formatQuantity } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { DataList } from '../ui/DataList'
import { IconBubble, type Tone } from '../ui/IconBubble'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: 'Entrée',
  OUT: 'Sortie',
  ADJUSTMENT: 'Inventaire',
  SALE: 'Vente',
  SALE_CANCEL: 'Vente annulée',
}

export const MOVEMENT_STYLE: Record<MovementType, [LucideIcon, Tone]> = {
  IN: [ArrowDownToLine, 'green'],
  OUT: [ArrowUpFromLine, 'red'],
  ADJUSTMENT: [ClipboardCheck, 'orange'],
  SALE: [ShoppingCart, 'blue'],
  SALE_CANCEL: [RotateCcw, 'slate'],
}

function TypeBadge({ type }: { type: MovementType }) {
  const [icon, tone] = MOVEMENT_STYLE[type]
  return <Badge tone={tone} icon={icon}>{MOVEMENT_LABELS[type]}</Badge>
}

function Change({ m }: { m: StockMovement }) {
  return (
    <span className={`font-bold ${m.quantityChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
      {m.quantityChange > 0 ? '+' : ''}
      {formatQuantity(m.quantityChange, m.product.unit)}
    </span>
  )
}

function details(m: StockMovement): string {
  return (
    [m.supplier?.name, m.unitCost != null ? `${formatMoney(m.unitCost)} / ${m.product.unit}` : null, m.reason]
      .filter(Boolean)
      .join(' · ') || '—'
  )
}

type Props = {
  movements: StockMovement[]
  /** Affiche le produit (historique global). */
  showProduct?: boolean
}

/** Historique des mouvements : tableau sur ordinateur, cartes sur téléphone. */
export function MovementsTable({ movements, showProduct = false }: Props) {
  return (
    <DataList
      rows={movements}
      rowKey={(m) => m.id}
      rowHref={showProduct ? (m) => `/products/${m.product.id}` : undefined}
      columns={[
        { header: 'Date', cell: (m) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(m.createdAt)}</span> },
        ...(showProduct
          ? [{ header: 'Produit', cell: (m: StockMovement) => <span className="font-semibold text-slate-900">{m.product.name}</span> }]
          : []),
        { header: 'Type', cell: (m) => <TypeBadge type={m.type} /> },
        { header: 'Quantité', align: 'right', cell: (m) => <Change m={m} /> },
        { header: 'Stock après', align: 'right', cell: (m) => formatQuantity(m.quantityAfter, m.product.unit), hideOnTablet: true },
        { header: 'Détail', cell: (m) => <span className="text-slate-600">{details(m)}</span>, hideOnTablet: true },
        { header: 'Par', cell: (m) => <span className="text-slate-600">{m.user.name}</span>, hideOnTablet: true },
      ]}
      mobileCard={(m) => {
        const [icon, tone] = MOVEMENT_STYLE[m.type]
        return (
          <div className="flex items-center gap-3">
            <IconBubble icon={icon} tone={tone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {showProduct ? m.product.name : MOVEMENT_LABELS[m.type]}
              </p>
              <p className="truncate text-sm text-slate-500">
                {formatDateTime(m.createdAt)} · {m.user.name}
              </p>
              {m.reason && <p className="truncate text-sm text-slate-500">{m.reason}</p>}
            </div>
            <div className="shrink-0 text-right">
              <Change m={m} />
              <p className="text-xs text-slate-500">reste {formatQuantity(m.quantityAfter, m.product.unit)}</p>
            </div>
          </div>
        )
      }}
    />
  )
}
