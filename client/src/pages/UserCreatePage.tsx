import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { api, getErrorMessage, type PublicUser } from '../lib/api'

export function UserCreatePage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('La confirmation ne correspond pas au mot de passe.')
      return
    }

    setSubmitting(true)
    try {
      // Le téléphone est envoyé tel quel : le backend le normalise et le valide.
      const { data } = await api.post<PublicUser>('/users', { name, phone, password })
      navigate('/users', {
        state: { notice: `Utilisateur « ${data.name} » créé.` },
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nouvel utilisateur</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <TextField
          label="Nom complet"
          autoComplete="off"
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
          autoComplete="off"
          required
          placeholder="620 00 00 00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Mot de passe provisoire (8 caractères minimum)"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Création…' : 'Créer'}
          </button>
          <Link
            to="/users"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
