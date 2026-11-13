import { CalendarDays, IdCard, Phone, Save, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, getErrorMessage, type UserDetail } from '../../lib/api'
import { formatDate, formatPhone } from '../../lib/format'
import { Alert } from '../Alert'
import { TextField } from '../TextField'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { InfoList } from '../ui/InfoList'
import { useToast } from '../ui/useToast'

type Props = {
  user: UserDetail
  canEdit: boolean
  onSaved: (user: UserDetail) => void
}

/** Nom et téléphone de l'utilisateur (modifiables avec users.update). */
export function UserInfoForm({ user, canEdit, onSaved }: Props) {
  const toast = useToast()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(formatPhone(user.phone))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.patch<UserDetail>(`/users/${user.id}`, { name, phone })
      onSaved(data)
      setPhone(formatPhone(data.phone))
      toast.success('Informations enregistrées')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={IdCard} title="Informations" />
      <CardBody>
        {canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <TextField label="Nom complet" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label="Numéro de téléphone"
              type="tel"
              inputMode="tel"
              required
              hint="C'est son identifiant de connexion."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" variant="secondary" icon={Save} loading={submitting}>
              Enregistrer
            </Button>
          </form>
        ) : (
          <InfoList
            items={[
              { icon: UserRound, label: 'Nom', value: user.name },
              { icon: Phone, label: 'Téléphone', value: formatPhone(user.phone) },
              { icon: CalendarDays, label: 'Créé le', value: formatDate(user.createdAt) },
            ]}
          />
        )}
      </CardBody>
    </Card>
  )
}
