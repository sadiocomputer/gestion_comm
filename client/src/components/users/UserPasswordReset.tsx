import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, getErrorMessage } from '../../lib/api'
import { Alert } from '../Alert'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { PasswordField } from '../ui/PasswordField'
import { useToast } from '../ui/useToast'

/** Réinitialisation du mot de passe d'un autre utilisateur (oubli). */
export function UserPasswordReset({ userId }: { userId: number }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  function close() {
    setOpen(false)
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8 || password !== confirmPassword) return
    setSubmitting(true)
    setError(null)
    try {
      await api.patch(`/users/${userId}/password`, { newPassword: password })
      toast.success('Nouveau mot de passe enregistré. Communiquez-le à la personne.')
      close()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={KeyRound} tone="orange" title="Mot de passe oublié ?" description="Donnez-lui un nouveau mot de passe." />
      <CardBody>
        <Button variant="secondary" icon={KeyRound} onClick={() => setOpen(true)}>
          Définir un nouveau mot de passe
        </Button>
      </CardBody>

      <Modal open={open} onClose={close} title="Nouveau mot de passe">
        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField
            label="Nouveau mot de passe"
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
          <Alert tone="info">La personne sera déconnectée de tous ses appareils.</Alert>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" icon={KeyRound} fullWidth size="lg" loading={submitting} disabled={tooShort || mismatch}>
            Enregistrer le mot de passe
          </Button>
        </form>
      </Modal>
    </Card>
  )
}
