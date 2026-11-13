import { CircleCheck, PackageX, TriangleAlert } from 'lucide-react'
import { formatQuantity } from '../../lib/format'
import { Badge } from '../ui/Badge'

export function isLowStock(p: { quantity: number; minStock: number }): boolean {
  return p.minStock > 0 && p.quantity <= p.minStock
}

/** Rupture / Stock bas / En stock : texte + icône + couleur. */
export function StockBadge({ quantity, minStock, unit }: { quantity: number; minStock: number; unit: string }) {
  if (quantity <= 0) return <Badge tone="red" icon={PackageX}>Rupture</Badge>
  if (isLowStock({ quantity, minStock })) {
    return <Badge tone="orange" icon={TriangleAlert}>Bas : {formatQuantity(quantity, unit)}</Badge>
  }
  return <Badge tone="green" icon={CircleCheck}>{formatQuantity(quantity, unit)}</Badge>
}
