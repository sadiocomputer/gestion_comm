import { CalendarDays, IdCard, KeyRound, LogOut, Phone, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { InfoList } from '../components/ui/InfoList'
import { PasswordField } from '../components/ui/PasswordField'
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

  // Vérifications immédiates (le serveur revérifie tout).
  const tooShort = newPassword.length > 0 && newPassword.length < 8
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (newPassword.length < 8 || newPassword !== confirmPassword) return

    setSubmitting(true)
    try {
      await api.patch('/auth/password', { currentPassword, newPassword })
      // Le serveur a fermé toutes les sessions : on se déconnecte aussi ici.
      await auth.logout('Mot de passe modifié. Connectez-vous avec le nouveau.')
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{user.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {user.roles.length > 0 ? (
              user.roles.map((r) => (
                <Badge key={r.id} tone="violet" icon={ShieldCheck}>
                  {r.name}
                </Badge>
              ))
            ) : (
              <Badge tone="orange">Aucun rôle</Badge>
            )}
          </div>
        </div>
        <Button variant="secondary" icon={LogOut} className="text-red-700" onClick={() => void auth.logout()}>
          Se déconnecter
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader icon={IdCard} title="Mes informations" />
          <CardBody>
            <InfoList
              items={[
                { icon: Phone, label: 'Téléphone (identifiant)', value: formatPhone(user.phone) },
                { icon: CalendarDays, label: 'Membre depuis', value: formatDate(user.createdAt) },
                {
                  icon: ShieldCheck,
                  label: 'Rôle',
                  value: user.roles.map((r) => r.name).join(', '),
                  wide: true,
                },
              ]}
            />
            <p className="mt-5 text-sm text-slate-500">
              Pour changer votre nom ou votre numéro, demandez à l'administrateur.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={KeyRound}
            tone="orange"
            title="Changer mon mot de passe"
            description="Vous serez déconnecté de tous vos appareils."
          />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordField
                label="Mot de passe actuel"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <PasswordField
                label="Nouveau mot de passe"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={tooShort ? '8 caractères minimum' : null}
                hint="8 caractères minimum"
              />
              <PasswordField
                label="Retapez le nouveau mot de passe"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={mismatch ? 'Les deux mots de passe sont différents' : null}
              />
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" icon={KeyRound} loading={submitting} disabled={tooShort || mismatch}>
                Changer le mot de passe
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
