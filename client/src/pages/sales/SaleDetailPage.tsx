import {
  Ban,
  CircleCheck,
  FileText,
  HandCoins,
  MessageCircle,
  Plus,
  Printer,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { PaymentForm, PaymentList, PaymentStateBadge } from '../../components/payments/PaymentWidgets'
import { SaleStatusBadge } from '../../components/sales/SaleBadges'
import { TextField } from '../../components/TextField'
import { BackLink } from '../../components/ui/BackLink'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { LoadingState } from '../../components/ui/Loading'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type SaleDetail } from '../../lib/api'
import { formatDateTime, formatMoney, formatPhone, formatQuantity } from '../../lib/format'
import { SHOP } from '../../lib/shop'

/** Texte envoyé par WhatsApp / partage. */
function shareText(sale: SaleDetail): string {
  const lines = [
    `${SHOP.name} — Facture ${sale.number}`,
    `Date : ${formatDateTime(sale.createdAt)}`,
    ...sale.items.map((i) => `• ${i.productName} × ${formatQuantity(i.quantity, i.unit)} = ${formatMoney(i.lineTotal)}`),
    `Total : ${formatMoney(sale.total)}`,
  ]
  if (sale.status === 'COMPLETED') {
    lines.push(`Payé : ${formatMoney(sale.amountPaid)}`)
    if (sale.balance > 0) lines.push(`Reste à payer : ${formatMoney(sale.balance)}`)
  }
  lines.push('Merci pour votre achat.')
  return lines.join('\n')
}

export function SaleDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const toast = useToast()

  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<SaleDetail>(`/sales/${id}`)
      .then(({ data }) => {
        if (!cancelled) setSale(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  function refresh(message: string) {
    toast.success(message)
    setPayOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function confirmCancel() {
    setCancelling(true)
    setCancelError(null)
    try {
      const { data } = await api.post<SaleDetail>(`/sales/${id}/cancel`, { reason })
      setSale(data)
      setCancelOpen(false)
      setReason('')
      toast.success('Vente annulée. Le stock a été remis.')
    } catch (err) {
      setCancelError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  function shareWhatsApp() {
    if (!sale) return
    const phone = sale.client?.phone && /^\d{9}$/.test(sale.client.phone) ? `224${sale.client.phone}` : ''
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(shareText(sale))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (error && !sale) {
    return (
      <div className="space-y-4">
        <BackLink to="/sales" label="Factures" />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }
  if (!sale) return <LoadingState />

  const completed = sale.status === 'COMPLETED'
  const canSeeCost = auth.can('products.read_cost')
  const margin = canSeeCost
    ? sale.items.reduce((sum, i) => sum + i.lineTotal - Math.round((i.unitCost ?? 0) * i.quantity), 0) - sale.discount
    : null

  return (
    <div className="space-y-6">
      {/* ---------- En-tête (masqué à l'impression) ---------- */}
      <div className="space-y-4 print:hidden">
        <BackLink to="/sales" label="Factures" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Facture {sale.number}</h1>
              {completed ? <PaymentStateBadge state={sale.paymentStatus} /> : <SaleStatusBadge status={sale.status} />}
            </div>
            <p className="mt-1 text-[15px] text-slate-500">
              {formatDateTime(sale.createdAt)} · {sale.client?.name ?? 'Client de passage'}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button icon={Printer} onClick={() => window.print()}>
              Imprimer
            </Button>
            <Button variant="secondary" icon={MessageCircle} onClick={shareWhatsApp}>
              WhatsApp
            </Button>
            {auth.can('sales.create') && (
              <ButtonLink to="/sales/new" variant="secondary" icon={Plus}>
                Nouvelle vente
              </ButtonLink>
            )}
          </div>
        </div>
        {!completed && (
          <Alert tone="error">
            Vente annulée le {sale.cancelledAt ? formatDateTime(sale.cancelledAt) : ''} par {sale.cancelledBy?.name}.
            Motif : {sale.cancelReason}
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start print:block">
        {/* ---------- Facture imprimable ---------- */}
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xl font-bold text-slate-900">{SHOP.name}</p>
              <p className="text-sm text-slate-500">{SHOP.address}</p>
              <p className="text-sm text-slate-500">Tél. {SHOP.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Facture</p>
              <p className="text-lg font-bold text-slate-900">{sale.number}</p>
              <p className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</p>
              {!completed && <p className="mt-1 text-sm font-bold text-red-700 uppercase">Annulée</p>}
            </div>
          </header>

          <div className="grid gap-4 py-6 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Client</p>
              <p className="mt-1 font-semibold text-slate-900">{sale.client?.name ?? 'Client de passage'}</p>
              {sale.client?.phone && <p className="text-slate-500">{formatPhone(sale.client.phone)}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Vendeur</p>
              <p className="mt-1 font-semibold text-slate-900">{sale.user.name}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[15px]">
              <thead className="border-y border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="py-3 pr-3">Désignation</th>
                  <th className="py-3 pr-3 text-right">Qté</th>
                  <th className="py-3 pr-3 text-right">Prix</th>
                  <th className="py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 text-slate-900">{item.productName}</td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap text-slate-600">{formatQuantity(item.quantity, item.unit)}</td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap text-slate-600">{formatMoney(item.unitPrice)}</td>
                    <td className="py-3 text-right font-semibold whitespace-nowrap text-slate-900">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto max-w-xs space-y-2 text-[15px]">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total</span>
              <span>{formatMoney(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Remise</span>
                <span>− {formatMoney(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(sale.total)}</span>
            </div>
            {completed && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Payé</span>
                  <span>{formatMoney(sale.amountPaid)}</span>
                </div>
                {sale.balance > 0 && (
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Reste à payer</span>
                    <span>{formatMoney(sale.balance)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {sale.notes && <p className="mt-6 text-sm text-slate-500">Note : {sale.notes}</p>}
          <p className="mt-8 text-center text-sm text-slate-400">Merci pour votre achat.</p>
        </article>

        {/* ---------- Colonne paiements (masquée à l'impression) ---------- */}
        <div className="space-y-6 print:hidden">
          {completed && (
            <Card>
              <CardHeader icon={Wallet} tone="green" title="Paiements" />
              <CardBody className="space-y-5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-bold text-slate-900">{formatMoney(sale.total)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-700">Payé</p>
                    <p className="font-bold text-emerald-800">{formatMoney(sale.amountPaid)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${sale.balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <p className={`text-xs ${sale.balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Reste</p>
                    <p className={`font-bold ${sale.balance > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                      {formatMoney(sale.balance)}
                    </p>
                  </div>
                </div>

                {sale.balance > 0 ? (
                  auth.can('payments.create') && (
                    <Button variant="success" size="lg" icon={HandCoins} fullWidth onClick={() => setPayOpen(true)}>
                      Encaisser
                    </Button>
                  )
                ) : (
                  <p className="flex items-center justify-center gap-2 font-semibold text-emerald-700">
                    <CircleCheck size={20} aria-hidden /> Facture soldée
                  </p>
                )}

                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Historique</p>
                  <PaymentList payments={sale.payments} cancelBase="/payments" onChanged={refresh} />
                </div>
              </CardBody>
            </Card>
          )}

          {margin !== null && (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">Bénéfice estimé sur cette vente</p>
                <p className={`text-xl font-bold ${margin >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{formatMoney(margin)}</p>
              </CardBody>
            </Card>
          )}

          {completed && auth.can('sales.cancel') && (
            <Card>
              <CardHeader icon={ShieldAlert} tone="red" title="Annuler la vente" description="Les produits sont remis en stock." />
              <CardBody>
                {sale.amountPaid > 0 ? (
                  <p className="text-sm text-slate-600">
                    Cette vente a des paiements. Annulez-les d'abord (remboursement), puis la vente.
                  </p>
                ) : (
                  <Button variant="danger" icon={Ban} fullWidth onClick={() => setCancelOpen(true)}>
                    Annuler cette vente
                  </Button>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* ---------- Fenêtres ---------- */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Encaisser — ${sale.number}`}>
        <PaymentForm
          key={sale.balance}
          endpoint={`/sales/${sale.id}/payments`}
          max={sale.balance}
          submitLabel="Encaisser"
          onDone={refresh}
        />
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Annuler cette vente ?"
        message={
          <>
            La facture <strong>{sale.number}</strong> sera marquée « Annulée » et les produits remis en stock.
            Cette action est définitive.
          </>
        }
        confirmLabel="Confirmer l'annulation"
        icon={FileText}
        loading={cancelling}
        confirmDisabled={reason.trim().length < 2}
        onConfirm={() => void confirmCancel()}
        onCancel={() => {
          setCancelOpen(false)
          setCancelError(null)
        }}
      >
        <TextField
          label="Motif"
          placeholder="Ex. erreur de saisie, client a rendu"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={255}
        />
        {cancelError && <Alert tone="error">{cancelError}</Alert>}
      </ConfirmDialog>
    </div>
  )
}
