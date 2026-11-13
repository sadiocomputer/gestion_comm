import { UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { CancelButton } from '../components/ui/BackLink'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PasswordField } from '../components/ui/PasswordField'
import { useToast } from '../components/ui/useToast'
import { api, getErrorMessage, type PublicUser } from '../lib/api'

export function UserCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Vérifications immédiates (le serveur revérifie tout).
  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 8 || password !== confirmPassword) return

    setSubmitting(true)
    try {
      const { data } = await api.post<PublicUser>('/users', { name, phone, password })
      toast.success(`${data.name} a été ajouté. Choisissez maintenant son rôle.`)
      // On ouvre directement sa fiche pour lui attribuer un rôle.
      navigate(`/users/${data.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nouvel utilisateur"
        description="La personne se connectera avec son numéro de téléphone et ce mot de passe."
        icon={UserPlus}
        tone="violet"
        back={{ to: '/users', label: 'Utilisateurs' }}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardBody className="space-y-5">
            <TextField
              label="Nom complet"
              required
              minLength={2}
              maxLength={120}
              placeholder="Ex. Awa Camara"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Numéro de téléphone"
              type="tel"
              inputMode="tel"
              required
              placeholder="620 00 00 00"
              hint="Il servira d'identifiant de connexion."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField
                label="Mot de passe provisoire"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={tooShort ? '8 caractères minimum' : null}
                hint="8 caractères minimum"
              />
              <PasswordField
                label="Retapez le mot de passe"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={mismatch ? 'Les deux mots de passe sont différents' : null}
              />
            </div>
            <Alert tone="info">Communiquez ce mot de passe à la personne : elle pourra le changer dans « Mon profil ».</Alert>
            {error && <Alert tone="error">{error}</Alert>}
          </CardBody>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <CancelButton to="/users" />
            <Button type="submit" icon={UserPlus} loading={submitting} disabled={tooShort || mismatch}>
              Créer l'utilisateur
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
