import { useState, type FormEvent } from 'react'
import { api, getErrorMessage, type UserDetail } from '../../lib/api'
import { formatDate, formatPhone } from '../../lib/format'
import { Alert } from '../Alert'
import { TextField } from '../TextField'

type Props = {
  user: UserDetail
  canEdit: boolean
  onSaved: (user: UserDetail) => void
}

export function UserInfoForm({ user, canEdit, onSaved }: Props) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(formatPhone(user.phone))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const { data } = await api.patch<UserDetail>(`/users/${user.id}`, { name, phone })
      onSaved(data)
      setPhone(formatPhone(data.phone))
      setSuccess('Informations enregistrées.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Informations</h2>

      {canEdit ? (
        <form onSubmit={handleSubmit} className="mt-4 max-w-md space-y-4">
          <TextField
            label="Nom complet"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Téléphone"
            type="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-sm text-slate-500">Créé le {formatDate(user.createdAt)}</p>
          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-500">Nom</dt>
            <dd className="font-medium text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Téléphone</dt>
            <dd className="font-medium text-slate-900">{formatPhone(user.phone)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Créé le</dt>
            <dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
