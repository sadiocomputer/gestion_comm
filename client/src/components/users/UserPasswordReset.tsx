import { useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../../lib/api'
import { Alert } from '../Alert'
import { TextField } from '../TextField'

export function UserPasswordReset({ userId }: { userId: number }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au mot de passe.')
      return
    }

    setSubmitting(true)
    try {
      await api.patch(`/users/${userId}/password`, { newPassword })
      setSuccess(
        "Mot de passe réinitialisé. Communique-le à l'utilisateur : ses sessions ont été fermées.",
      )
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Réinitialiser le mot de passe</h2>
      <p className="mt-1 text-sm text-slate-600">
        À utiliser quand la personne a oublié son mot de passe.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 max-w-md space-y-4">
        <TextField
          label="Nouveau mot de passe (8 caractères minimum)"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-800 hover:bg-slate-100 disabled:opacity-60"
        >
          {submitting ? 'Enregistrement…' : 'Réinitialiser'}
        </button>
      </form>
    </section>
  )
}
