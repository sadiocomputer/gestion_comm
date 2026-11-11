import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getErrorMessage } from '../lib/api'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const notice = auth.status === 'anonymous' ? auth.notice : undefined

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (auth.status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await auth.login(phone, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>

        <label className="block">
          <span className="text-sm text-slate-700">Téléphone</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="username"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="620 00 00 00"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-700">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none"
          />
        </label>

        {notice && !error && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || auth.status === 'loading'}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
