import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Warehouse } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, getErrorMessage, type Paginated, type Product, type Supplier } from '../../lib/api'
import { formatQuantity } from '../../lib/format'
import { Alert } from '../Alert'
import { TextField } from '../TextField'
import { Button, type ButtonVariant } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Chips, type ChipOption } from '../ui/Chips'
import { SelectField } from '../ui/Fields'
import type { PermissionCode } from '../../lib/permissions'

type Action = 'in' | 'out' | 'adjust'

const ACTIONS: (ChipOption<Action> & { permission: PermissionCode; variant: ButtonVariant; submit: string })[] = [
  { value: 'in', label: 'Entrée', icon: ArrowDownToLine, permission: 'stock.in', variant: 'success', submit: 'Ajouter au stock' },
  { value: 'out', label: 'Sortie', icon: ArrowUpFromLine, permission: 'stock.out', variant: 'danger', submit: 'Retirer du stock' },
  { value: 'adjust', label: 'Inventaire', icon: ClipboardCheck, permission: 'stock.adjust', variant: 'warning', submit: 'Corriger le stock' },
]

const HELP: Record<Action, string> = {
  in: 'Marchandise reçue (livraison, achat).',
  out: 'Marchandise perdue, cassée ou utilisée (hors vente).',
  adjust: 'Après avoir compté : indiquez la quantité réellement présente.',
}

type Props = {
  product: Product
  /** Appelé après un mouvement réussi (recharger produit + historique). */
  onDone: (message: string) => void
}

/** Entrée / Sortie / Inventaire, selon les permissions. */
export function StockActions({ product, onDone }: Props) {
  const auth = useAuth()
  const available = ACTIONS.filter((a) => auth.can(a.permission))

  const [action, setAction] = useState<Action | undefined>(available[0]?.value)
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [reason, setReason] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSeeCost = auth.can('products.read_cost')
  const canPickSupplier = auth.can('suppliers.read')

  useEffect(() => {
    if (!canPickSupplier) return
    api
      .get<Paginated<Supplier>>('/suppliers', { params: { status: 'active', limit: 100 } })
      .then(({ data }) => setSuppliers(data.data))
      .catch(() => setSuppliers([]))
  }, [canPickSupplier])

  if (!action) return null
  const current = ACTIONS.find((a) => a.value === action)!

  function reset() {
    setQuantity('')
    setUnitCost('')
    setSupplierId('')
    setReason('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const qty = Number(quantity.replace(',', '.'))
    if (!Number.isFinite(qty) || qty < 0 || (action !== 'adjust' && qty === 0)) {
      setError('Indiquez une quantité valide.')
      return
    }

    setSubmitting(true)
    try {
      if (action === 'in') {
        await api.post(`/products/${product.id}/stock/in`, {
          quantity: qty,
          unitCost: unitCost ? Number(unitCost) : undefined,
          supplierId: supplierId ? Number(supplierId) : undefined,
          reason: reason.trim() || null,
        })
        onDone(`${formatQuantity(qty, product.unit)} ajouté(s) au stock`)
      } else if (action === 'out') {
        await api.post(`/products/${product.id}/stock/out`, { quantity: qty, reason })
        onDone(`${formatQuantity(qty, product.unit)} retiré(s) du stock`)
      } else {
        await api.post(`/products/${product.id}/stock/adjust`, { countedQuantity: qty, reason })
        onDone(`Stock corrigé : ${formatQuantity(qty, product.unit)}`)
      }
      reset()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={Warehouse} title="Mettre à jour le stock" description={HELP[action]} />
      <CardBody className="space-y-5">
        {available.length > 1 && (
          <Chips
            label="Type de mouvement"
            size="lg"
            options={available}
            value={action}
            onChange={(v) => {
              setAction(v)
              reset()
            }}
          />
        )}

        <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={action === 'adjust' ? `Quantité comptée (${product.unit})` : `Quantité (${product.unit})`}
            inputMode="decimal"
            required
            placeholder="Ex. 10"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            hint={action === 'adjust' ? `Stock enregistré : ${formatQuantity(product.quantity, product.unit)}` : undefined}
          />

          {action === 'in' && canSeeCost && (
            <TextField
              label={`Prix d'achat par ${product.unit} (GNF)`}
              inputMode="numeric"
              hint="Facultatif — sert à calculer vos dettes fournisseurs."
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value.replace(/\D/g, ''))}
            />
          )}

          {action === 'in' && canPickSupplier && (
            <SelectField label="Fournisseur" hint="Facultatif" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Aucun —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          )}

          <TextField
            label={action === 'in' ? 'Commentaire' : 'Motif'}
            required={action !== 'in'}
            hint={action === 'in' ? 'Facultatif' : undefined}
            placeholder={action === 'out' ? 'Ex. sac déchiré, périmé' : action === 'adjust' ? 'Ex. comptage du soir' : 'Ex. livraison du lundi'}
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && (
            <div className="sm:col-span-2">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <div className="sm:col-span-2">
            <Button
              type="submit"
              variant={current.variant}
              size="lg"
              icon={current.icon}
              loading={submitting}
              disabled={!product.isActive}
            >
              {current.submit}
            </Button>
            {!product.isActive && <p className="mt-2 text-sm text-slate-500">Produit archivé : réactivez-le d'abord.</p>}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
