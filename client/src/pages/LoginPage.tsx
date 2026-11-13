import { LogIn, Package, ShoppingCart, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { Button } from '../components/ui/Button'
import { LogoFull } from '../components/ui/Logo'
import { PasswordField } from '../components/ui/PasswordField'
import { getErrorMessage } from '../lib/api'
import { SHOP } from '../lib/shop'

const BENEFITS = [
  { icon: ShoppingCart, text: 'Vendez et imprimez vos factures en quelques secondes' },
  { icon: Package, text: 'Suivez votre stock, sans cahier' },
  { icon: Wallet, text: 'Sachez qui vous doit de l’argent' },
]

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
    <main className="flex min-h-svh">
      {/* Panneau de présentation (ordinateur) */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-4">
          <LogoFull className="h-24 w-24 rounded-2xl shadow-lg ring-4 ring-white/20" />
          <span className="text-lg font-bold">{SHOP.name}</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl leading-tight font-bold">Votre commerce, simplement.</h2>
          <ul className="mt-8 space-y-5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-lg text-blue-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon size={22} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-blue-200">Gestion commerciale · Nimbasoft</p>
        {/* Formes décoratives */}
        <span className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-white/5" aria-hidden />
        <span className="pointer-events-none absolute top-24 -right-10 h-40 w-40 rounded-full bg-white/5" aria-hidden />
      </section>

      {/* Formulaire */}
      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <LogoFull className="mb-5 h-32 w-32 rounded-3xl shadow-md lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Connexion</h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Entrez votre numéro de téléphone et votre mot de passe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <TextField
              label="Numéro de téléphone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="620 00 00 00"
            />

            <PasswordField
              label="Mot de passe"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {notice && !error && <Alert tone="info">{notice}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}

            <Button
              type="submit"
              size="lg"
              fullWidth
              icon={LogIn}
              loading={submitting}
              disabled={auth.status === 'loading'}
            >
              Se connecter
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
