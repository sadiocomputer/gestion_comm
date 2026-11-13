import { Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, getErrorMessage, type Role, type RoleSummary, type UserDetail } from '../../lib/api'
import { Alert } from '../Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { CheckTile } from '../ui/CheckTile'
import { LoadingState } from '../ui/Loading'
import { useToast } from '../ui/useToast'

type Props = {
  user: UserDetail
  canAssign: boolean
  onSaved: (user: UserDetail) => void
}

/** Rôles de l'utilisateur : tuiles à cocher (il peut en avoir plusieurs). */
export function UserRolesForm({ user, canAssign, onSaved }: Props) {
  const toast = useToast()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(() => new Set(user.roles.map((r) => r.id)))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!canAssign) return
    let cancelled = false
    api
      .get<Role[]>('/roles')
      .then(({ data }) => {
        if (!cancelled) setRoles(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [canAssign])

  const initial = new Set(user.roles.map((r) => r.id))
  const changed = selected.size !== initial.size || [...selected].some((id) => !initial.has(id))

  function toggle(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function handleSave() {
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.put<{ roles: RoleSummary[] }>(`/users/${user.id}/roles`, { roleIds: [...selected] })
      onSaved({ ...user, roles: data.roles })
      toast.success('Rôles enregistrés')
    } catch (err) {
      setError(getErrorMessage(err))
      setSelected(new Set(user.roles.map((r) => r.id)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={ShieldCheck} tone="violet" title="Rôle" description="Le rôle décide de ce que la personne peut faire." />
      <CardBody className="space-y-4">
        {!canAssign && (
          <div className="flex flex-wrap gap-2">
            {user.roles.length > 0 ? user.roles.map((r) => <Badge key={r.id} tone="violet">{r.name}</Badge>) : <Badge tone="orange">Aucun rôle</Badge>}
          </div>
        )}

        {canAssign && !roles && !error && <LoadingState />}

        {canAssign && roles && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <CheckTile
                  key={role.id}
                  checked={selected.has(role.id)}
                  onChange={(checked) => toggle(role.id, checked)}
                  disabled={submitting}
                  title={role.name}
                  description={role.description ?? `${role.permissions.length} permission(s)`}
                />
              ))}
            </div>
            {selected.size === 0 && (
              <Alert tone="warning">Sans rôle, la personne pourra se connecter mais ne verra aucune fonction.</Alert>
            )}
            <Button icon={Save} loading={submitting} disabled={!changed} onClick={() => void handleSave()}>
              Enregistrer le rôle
            </Button>
          </>
        )}

        {error && <Alert tone="error">{error}</Alert>}
      </CardBody>
    </Card>
  )
}
