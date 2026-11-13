import {
  Banknote,
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  HandCoins,
  Landmark,
  Smartphone,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, getErrorMessage, type PaymentBase, type PaymentMethod, type PaymentState } from '../../lib/api'
import { formatDateTime, formatMoney } from '../../lib/format'
import { Alert } from '../Alert'
import { TextField } from '../TextField'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Chips, type ChipOption } from '../ui/Chips'
import { IconBubble } from '../ui/IconBubble'
import { ConfirmDialog } from '../ui/Modal'

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  BANK: 'Banque',
  OTHER: 'Autre',
}

export const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  CASH: Banknote,
  ORANGE_MONEY: Smartphone,
  MTN_MOMO: Smartphone,
  BANK: Landmark,
  OTHER: CreditCard,
}

export const METHODS = Object.keys(METHOD_LABELS) as PaymentMethod[]

export const METHOD_OPTIONS: ChipOption<PaymentMethod>[] = METHODS.map((m) => ({
  value: m,
  label: METHOD_LABELS[m],
  icon: METHOD_ICONS[m],
}))

/** Payée / Partielle / Non payée : texte + icône + couleur. */
export function PaymentStateBadge({ state }: { state: PaymentState }) {
  if (state === 'PAID') return <Badge tone="green" icon={CircleCheck}>Payée</Badge>
  if (state === 'PARTIAL') return <Badge tone="orange" icon={Clock}>Partielle</Badge>
  return <Badge tone="red" icon={CircleAlert}>Non payée</Badge>
}

type PaymentFormProps = {
  /** URL du POST (ex. /sales/12/payments ou /suppliers/3/payments). */
  endpoint: string
  /** Montant maximal (reste à payer ou dette) : pré-rempli. */
  max: number
  submitLabel: string
  onDone: (message: string) => void
}

/** Formulaire d'encaissement (client) ou de paiement (fournisseur). */
export function PaymentForm({ endpoint, max, submitLabel, onDone }: PaymentFormProps) {
  const [amount, setAmount] = useState(String(max))
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const value = Number(amount) || 0
  const tooMuch = value > max

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (value <= 0) {
      setError('Indiquez un montant.')
      return
    }
    if (tooMuch) return
    setSubmitting(true)
    try {
      await api.post(endpoint, {
        amount: value,
        method,
        reference: reference.trim() || null,
      })
      onDone(`Paiement de ${formatMoney(value)} enregistré`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextField
        label="Montant (GNF)"
        inputMode="numeric"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
        error={tooMuch ? `Maximum : ${formatMoney(max)}` : null}
        hint={!tooMuch ? `Reste : ${formatMoney(max)}` : undefined}
      />
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Mode de paiement</p>
        <Chips label="Mode de paiement" options={METHOD_OPTIONS} value={method} onChange={setMethod} />
      </div>
      {method !== 'CASH' && (
        <TextField
          label="Numéro de transaction (facultatif)"
          maxLength={100}
          placeholder="Ex. MP240611.1530.A12345"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" variant="success" size="lg" icon={HandCoins} loading={submitting} fullWidth>
        {submitLabel}
      </Button>
    </form>
  )
}

type PaymentListProps = {
  payments: PaymentBase[]
  /** Préfixe de l'URL d'annulation : /payments ou /supplier-payments. */
  cancelBase: string
  onChanged: (message: string) => void
}

/** Historique des paiements, avec annulation confirmée (motif obligatoire). */
export function PaymentList({ payments, cancelBase, onChanged }: PaymentListProps) {
  const auth = useAuth()
  const [target, setTarget] = useState<PaymentBase | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function close() {
    setTarget(null)
    setReason('')
    setError(null)
  }

  async function confirmCancel() {
    if (!target) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`${cancelBase}/${target.id}/cancel`, { reason })
      close()
      onChanged('Paiement annulé')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (payments.length === 0) {
    return <p className="py-2 text-[15px] text-slate-500">Aucun paiement pour le moment.</p>
  }

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {payments.map((p) => {
          const cancelled = p.status === 'CANCELLED'
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <IconBubble icon={METHOD_ICONS[p.method]} tone={cancelled ? 'slate' : 'green'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold ${cancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatMoney(p.amount)}
                  <span className="ml-2 text-sm font-normal text-slate-500">{METHOD_LABELS[p.method]}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(p.createdAt)} · {p.user.name}
                  {p.reference && ` · réf. ${p.reference}`}
                </p>
                {cancelled && (
                  <p className="mt-0.5 text-sm text-red-700">
                    Annulé par {p.cancelledBy?.name} — {p.cancelReason}
                  </p>
                )}
              </div>
              {!cancelled && auth.can('payments.cancel') && (
                <Button variant="ghost" size="sm" icon={Undo2} className="text-red-700 hover:bg-red-50" onClick={() => setTarget(p)}>
                  Annuler
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={target !== null}
        title="Annuler ce paiement ?"
        message={
          target && (
            <>
              Le paiement de <strong>{formatMoney(target.amount)}</strong> sera annulé et le montant
              redeviendra dû.
            </>
          )
        }
        confirmLabel="Annuler le paiement"
        icon={Undo2}
        loading={submitting}
        confirmDisabled={reason.trim().length < 2}
        onConfirm={() => void confirmCancel()}
        onCancel={close}
      >
        <TextField
          label="Motif"
          placeholder="Ex. remboursement, erreur de saisie"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={255}
        />
        {error && <Alert tone="error">{error}</Alert>}
      </ConfirmDialog>
    </>
  )
}
