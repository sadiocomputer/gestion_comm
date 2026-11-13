import { LockKeyhole, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { api, getErrorMessage, type UserDetail } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { ConfirmDialog } from '../ui/Modal'
import { useToast } from '../ui/useToast'

type Props = {
  user: UserDetail
  onChanged: (user: UserDetail) => void
}

/** Accès au compte : désactiver (confirmé) ou réactiver. */
export function UserStatusCard({ user, onChanged }: Props) {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function setActive(isActive: boolean) {
    setSubmitting(true)
    try {
      const { data } = await api.patch<UserDetail>(`/users/${user.id}/status`, { isActive })
      onChanged(data)
      toast.success(isActive ? 'Compte réactivé' : 'Compte désactivé')
      setConfirming(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={LockKeyhole}
        tone={user.isActive ? 'slate' : 'red'}
        title="Accès au compte"
        description={
          user.isActive
            ? 'Désactivez le compte si la personne ne travaille plus avec vous.'
            : 'Ce compte est désactivé : la personne ne peut plus se connecter.'
        }
      />
      <CardBody>
        {user.isActive ? (
          <Button variant="secondary" icon={UserX} className="text-red-700" onClick={() => setConfirming(true)}>
            Désactiver le compte
          </Button>
        ) : (
          <Button variant="success" icon={UserCheck} loading={submitting} onClick={() => void setActive(true)}>
            Réactiver le compte
          </Button>
        )}
      </CardBody>
      <ConfirmDialog
        open={confirming}
        title={`Désactiver le compte de ${user.name} ?`}
        message="La personne sera déconnectée immédiatement et ne pourra plus se connecter. Son historique est conservé et vous pourrez la réactiver."
        confirmLabel="Désactiver"
        icon={UserX}
        loading={submitting}
        onConfirm={() => void setActive(false)}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  )
}
