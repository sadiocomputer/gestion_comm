import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { api, getErrorMessage } from '../lib/api'
import { formatDate, formatPhone } from '../lib/format'

export function ProfilePage() {
  const auth = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (auth.status !== 'authenticated') return null
  const { user } = auth

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    // Vérification immédiate pour le confort ; le backend revérifie tout.
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }

    setSubmitting(true)
    try {
      await api.patch('/auth/password', { currentPassword, newPassword })
      // Le backend a fermé toutes les sessions : on se déconnecte aussi ici.
      await auth.logout('Mot de passe modifié. Reconnecte-toi avec le nouveau.')
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-500">Nom</dt>
            <dd className="font-medium text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Téléphone</dt>
            <dd className="font-medium text-slate-900">{formatPhone(user.phone)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Membre depuis</dt>
            <dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Changer le mot de passe
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Toutes tes sessions seront fermées, y compris sur tes autres appareils.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <TextField
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="Nouveau mot de passe (8 caractères minimum)"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <Alert tone="error">{error}</Alert>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </section>
    </div>
  )
}
