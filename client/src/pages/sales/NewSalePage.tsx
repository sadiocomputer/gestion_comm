import {
  CircleCheck,
  NotebookPen,
  Package,
  PackageX,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { METHOD_OPTIONS } from '../../components/payments/PaymentWidgets'
import { ClientPickerModal } from '../../components/sales/ClientPickerModal'
import { QuantityStepper } from '../../components/sales/QuantityStepper'
import { TextField } from '../../components/TextField'
import { CancelButton } from '../../components/ui/BackLink'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Chips } from '../../components/ui/Chips'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput, TextAreaField } from '../../components/ui/Fields'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/useToast'
import {
  api,
  getErrorMessage,
  type Client,
  type Paginated,
  type PaymentMethod,
  type Product,
  type SaleDetail,
} from '../../lib/api'
import { formatMoney, formatPhone, formatQuantity } from '../../lib/format'

type CartLine = {
  product: Product
  quantity: string // texte saisi ("2,5")
  unitPrice: string
}

function parseQty(value: string): number {
  const n = Number(value.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function parseMoney(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0
}

export function NewSalePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const canDiscount = auth.can('sales.discount')
  const canCollect = auth.can('payments.create')
  const canPickClient = auth.can('clients.read')

  // --- Produits ------------------------------------------------------------
  const [term, setTerm] = useState('')
  const [products, setProducts] = useState<Product[] | null>(null)
  const [lines, setLines] = useState<CartLine[]>([])

  // Sans recherche : les premiers produits du catalogue, en tuiles.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .get<Paginated<Product>>('/products', {
          params: { search: term.trim() || undefined, status: 'active', limit: 12 },
        })
        .then(({ data }) => {
          if (!cancelled) setProducts(data.data)
        })
        .catch(() => {
          if (!cancelled) setProducts([])
        })
    }, term ? 250 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  // --- Client et paiement --------------------------------------------------
  const [client, setClient] = useState<Client | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [discount, setDiscount] = useState('')
  // given = null : « montant exact » (suit le total automatiquement).
  const [given, setGiven] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function addProduct(product: Product) {
    setLines((current) => {
      const existing = current.find((l) => l.product.id === product.id)
      if (existing) {
        return current.map((l) =>
          l.product.id === product.id ? { ...l, quantity: String(parseQty(l.quantity) + 1) } : l,
        )
      }
      return [...current, { product, quantity: '1', unitPrice: String(product.salePrice) }]
    })
    setError(null)
  }

  function updateLine(productId: number, changes: Partial<CartLine>) {
    setLines((current) => current.map((l) => (l.product.id === productId ? { ...l, ...changes } : l)))
  }

  // --- Calculs (affichage ; le serveur refait tout et fait foi) -------------
  const lineTotal = (l: CartLine) =>
    Math.round(parseQty(l.quantity) * (canDiscount ? parseMoney(l.unitPrice) : l.product.salePrice))
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const discountValue = canDiscount ? Math.min(parseMoney(discount), subtotal) : 0
  const total = subtotal - discountValue
  const givenValue = given === null ? total : parseMoney(given)
  const recorded = Math.min(givenValue, total) // ce qui est enregistré comme payé
  const change = Math.max(0, givenValue - total) // monnaie à rendre
  const remaining = total - recorded // crédit
  const itemCount = lines.length

  // Erreur affichée dans la carte ET en notification (visible même si la
  // carte est hors de l'écran sur téléphone).
  function fail(message: string) {
    setError(message)
    toast.error(message)
  }

  async function submit() {
    setError(null)
    if (lines.length === 0) {
      fail('Ajoutez au moins un produit.')
      return
    }
    if (lines.some((l) => parseQty(l.quantity) <= 0)) {
      fail('Chaque quantité doit être supérieure à 0.')
      return
    }
    if (canCollect && remaining > 0 && !client) {
      fail('Le client ne paie pas tout : choisissez son nom pour suivre ce qu’il doit.')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post<SaleDetail>('/sales', {
        clientId: client?.id ?? null,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: parseQty(l.quantity),
          unitPrice: canDiscount ? parseMoney(l.unitPrice) : undefined,
        })),
        discount: canDiscount ? discountValue : undefined,
        notes: notes.trim() || null,
        payment: canCollect ? { amount: recorded, method, reference: reference.trim() || null } : undefined,
      })
      toast.success(`Vente ${data.number} enregistrée`)
      navigate(`/sales/${data.id}`)
    } catch (err) {
      fail(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const inCart = new Map(lines.map((l) => [l.product.id, parseQty(l.quantity)]))

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Nouvelle vente"
        description="Touchez les produits pour les ajouter au panier."
        icon={ShoppingCart}
        actions={<CancelButton to="/sales" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* ================= Colonne gauche : produits + panier ================= */}
        <div className="space-y-6">
          <Card>
            <CardHeader icon={Package} title="1. Choisir les produits" />
            <CardBody className="space-y-4">
              <SearchInput value={term} onChange={setTerm} placeholder="Nom ou référence du produit…" />

              {products === null && <LoadingState />}
              {products?.length === 0 && (
                <EmptyState
                  icon={PackageX}
                  tone="slate"
                  title={term ? 'Aucun produit trouvé' : 'Aucun produit en vente'}
                  description={term ? `Rien ne correspond à « ${term} ».` : 'Ajoutez des produits dans le catalogue.'}
                />
              )}

              {products && products.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {products.map((p) => {
                    const out = p.quantity <= 0
                    const low = !out && p.minStock > 0 && p.quantity <= p.minStock
                    const qty = inCart.get(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={out}
                        onClick={() => addProduct(p)}
                        className={`relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          qty ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {qty !== undefined && (
                          <span className="absolute top-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 px-2 text-sm font-bold text-white">
                            {formatQuantity(qty)}
                          </span>
                        )}
                        <span className="line-clamp-2 pr-8 font-semibold text-slate-900">{p.name}</span>
                        <span className="text-base font-bold text-slate-900">{formatMoney(p.salePrice)}</span>
                        {out ? (
                          <Badge tone="red" icon={PackageX}>Rupture</Badge>
                        ) : (
                          <Badge tone={low ? 'orange' : 'slate'}>
                            Stock : {formatQuantity(p.quantity, p.unit)}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={ShoppingBasket}
              tone="violet"
              title="Panier"
              description={itemCount ? `${itemCount} produit${itemCount > 1 ? 's' : ''}` : undefined}
            />
            <CardBody>
              {lines.length === 0 ? (
                <p className="py-6 text-center text-[15px] text-slate-500">
                  Le panier est vide. Touchez un produit ci-dessus.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lines.map((l) => {
                    const qty = parseQty(l.quantity)
                    const tooMuch = qty > l.product.quantity
                    return (
                      <li key={l.product.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="font-semibold text-slate-900">{l.product.name}</p>
                          {canDiscount ? (
                            <label className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              Prix
                              <input
                                inputMode="numeric"
                                value={l.unitPrice}
                                onChange={(e) => updateLine(l.product.id, { unitPrice: e.target.value.replace(/\D/g, '') })}
                                className="h-9 w-28 rounded-lg border border-slate-300 px-2 text-slate-900"
                              />
                              / {l.product.unit}
                            </label>
                          ) : (
                            <p className="text-sm text-slate-500">
                              {formatMoney(l.product.salePrice)} / {l.product.unit}
                            </p>
                          )}
                          {tooMuch && (
                            <p className="mt-1 text-sm font-medium text-red-700">
                              Stock insuffisant : {formatQuantity(l.product.quantity, l.product.unit)}
                            </p>
                          )}
                        </div>
                        <QuantityStepper
                          label={l.product.name}
                          value={l.quantity}
                          onChange={(v) => updateLine(l.product.id, { quantity: v })}
                        />
                        <p className="w-32 text-right text-base font-bold text-slate-900">{formatMoney(lineTotal(l))}</p>
                        <button
                          type="button"
                          onClick={() => setLines((c) => c.filter((x) => x.product.id !== l.product.id))}
                          aria-label={`Retirer ${l.product.name} du panier`}
                          className="rounded-xl p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={20} aria-hidden />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ================= Colonne droite : client + paiement ================= */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <Card>
            <CardHeader icon={UserRound} title="2. Client" />
            <CardBody>
              <div className="flex items-center gap-3">
                <IconBubble icon={client ? UserRound : Users} tone={client ? 'blue' : 'slate'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{client?.name ?? 'Client de passage'}</p>
                  <p className="text-sm text-slate-500">
                    {client ? (client.phone ? formatPhone(client.phone) : 'Pas de téléphone') : 'Sans nom'}
                  </p>
                </div>
                {canPickClient && (
                  <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                    {client ? 'Changer' : 'Choisir'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Wallet} tone="green" title="3. Paiement" />
            <CardBody className="space-y-5">
              <div className="space-y-2 text-[15px]">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {canDiscount && (
                  <div className="flex items-center justify-between gap-3 text-slate-600">
                    <label htmlFor="discount">Remise</label>
                    <input
                      id="discount"
                      inputMode="numeric"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))}
                      className="h-10 w-32 rounded-lg border border-slate-300 px-3 text-right"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
                <p className="text-sm text-slate-300">Total à payer</p>
                <p className="text-3xl font-bold tracking-tight">{formatMoney(total)}</p>
              </div>

              {canCollect ? (
                <>
                  <div>
                    <TextField
                      label="Le client donne"
                      inputMode="numeric"
                      value={given ?? String(total)}
                      onChange={(e) => setGiven(e.target.value.replace(/\D/g, ''))}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant={given === null ? 'primary' : 'secondary'} size="sm" onClick={() => setGiven(null)}>
                        Montant exact
                      </Button>
                      <Button variant={given === '0' ? 'warning' : 'secondary'} size="sm" onClick={() => setGiven('0')}>
                        À crédit
                      </Button>
                    </div>
                  </div>

                  {change > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
                      <span className="font-medium">Monnaie à rendre</span>
                      <span className="text-xl font-bold">{formatMoney(change)}</span>
                    </div>
                  )}
                  {remaining > 0 && total > 0 && (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Reste à payer (crédit)</span>
                        <span className="text-xl font-bold">{formatMoney(remaining)}</span>
                      </div>
                      {!client && <p className="mt-1 text-sm">Choisissez le client pour suivre sa dette.</p>}
                    </div>
                  )}

                  {recorded > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Mode de paiement</p>
                      <Chips label="Mode de paiement" options={METHOD_OPTIONS} value={method} onChange={setMethod} />
                      {method !== 'CASH' && (
                        <div className="mt-3">
                          <TextField
                            label="Numéro de transaction (facultatif)"
                            maxLength={100}
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Alert tone="info">La vente sera enregistrée « non payée ». Le paiement se fait à la caisse.</Alert>
              )}

              {showNotes ? (
                <TextAreaField label="Note" rows={2} maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  <NotebookPen size={16} aria-hidden /> Ajouter une note
                </button>
              )}

              {error && <Alert tone="error">{error}</Alert>}

              <Button
                variant="success"
                size="lg"
                icon={CircleCheck}
                fullWidth
                loading={submitting}
                disabled={lines.length === 0}
                onClick={() => void submit()}
                className="hidden lg:inline-flex"
              >
                Valider la vente
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Téléphone : total + validation toujours visibles au-dessus de la barre du bas */}
      <div className="fixed inset-x-0 bottom-[72px] z-10 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">Total · {itemCount} produit{itemCount > 1 ? 's' : ''}</p>
          <p className="truncate text-xl font-bold text-slate-900">{formatMoney(total)}</p>
        </div>
        <Button
          variant="success"
          icon={CircleCheck}
          loading={submitting}
          disabled={lines.length === 0}
          onClick={() => void submit()}
        >
          Valider
        </Button>
      </div>

      <ClientPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setClient} />
    </div>
  )
}
