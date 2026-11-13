import { Ban, CircleCheck } from 'lucide-react'
import type { SaleStatus } from '../../lib/api'
import { Badge } from '../ui/Badge'

/** Validée / Annulée : texte + icône + couleur. */
export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return status === 'COMPLETED' ? (
    <Badge tone="blue" icon={CircleCheck}>Validée</Badge>
  ) : (
    <Badge tone="red" icon={Ban}>Annulée</Badge>
  )
}
