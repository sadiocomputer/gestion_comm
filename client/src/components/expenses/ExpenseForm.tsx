import { CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, getErrorMessage, type ExpenseCategory, type PaymentMethod } from '../../lib/api'
import { formatMoney, todayISO } from '../../lib/format'
import { Alert } from '../Alert'
import { METHOD_OPTIONS } from '../payments/PaymentWidgets'
import { TextField } from '../TextField'
import { Button } from '../ui/Button'
import { Chips } from '../ui/Chips'

/** Saisie d'une dépense : montant, catégorie, description, date, mode. */
export function ExpenseForm({
  categories,
  onDone,
}: {
  categories: ExpenseCategory[]
  onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const value = Number(amount) || 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (value <= 0) {
      setError('Indiquez le montant.')
      return
    }
    if (!categoryId) {
      setError('Choisissez une catégorie.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/expenses', {
        amount: value,
        categoryId: Number(categoryId),
        description,
        expenseDate,
        method,
        reference: reference.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextField
        label="Montant (GNF)"
        inputMode="numeric"
        required
        autoFocus
        placeholder="Ex. 150000"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
        hint={value > 0 ? formatMoney(value) : undefined}
      />

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Pour quoi ?</p>
        <Chips
          label="Catégorie"
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          value={categoryId}
          onChange={setCategoryId}
        />
      </div>

      <TextField
        label="Description"
        required
        minLength={2}
        maxLength={255}
        placeholder="Ex. Facture EDG de novembre"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Date"
          type="date"
          required
          max={todayISO()}
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
        {method !== 'CASH' && (
          <TextField
            label="Référence (facultatif)"
            maxLength={100}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Payé en</p>
        <Chips label="Mode de paiement" options={METHOD_OPTIONS} value={method} onChange={setMethod} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Button type="submit" size="lg" icon={CircleCheck} fullWidth loading={submitting}>
        Enregistrer la dépense
      </Button>
    </form>
  )
}
