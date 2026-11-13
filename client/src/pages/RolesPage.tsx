import { Crown, Eye, PencilLine, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconBubble } from '../components/ui/IconBubble'
import { LoadingState } from '../components/ui/Loading'
import { ConfirmDialog } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/useToast'
import { api, getErrorMessage, type Role } from '../lib/api'

export function RolesPage() {
  const auth = useAuth()
  const toast = useToast()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Role[]>('/roles')
      setRoles(data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/roles/${toDelete.id}`)
      toast.success(`Rôle « ${toDelete.name} » supprimé`)
      setToDelete(null)
      await load()
      await auth.reloadUser()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Rôles"
        description="Un rôle regroupe ce qu'une personne a le droit de faire."
        icon={ShieldCheck}
        tone="violet"
        actions={
          auth.can('roles.create') && (
            <ButtonLink to="/roles/new" icon={Plus}>
              Nouveau rôle
            </ButtonLink>
          )
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {!roles && !error && <LoadingState />}

      {roles && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const editable = auth.can('roles.update') && !role.isSystem
            return (
              <Card key={role.id} className="flex flex-col">
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <IconBubble icon={role.isSystem ? Crown : ShieldCheck} tone={role.isSystem ? 'orange' : 'violet'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-slate-900">{role.name}</p>
                      {role.isSystem && <Badge tone="orange">Accès complet</Badge>}
                    </div>
                  </div>
                  {role.description && <p className="text-[15px] text-slate-600">{role.description}</p>}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Badge tone="slate" icon={ShieldCheck}>
                      {role.isSystem ? 'Toutes les permissions' : `${role.permissions.length} permission${role.permissions.length > 1 ? 's' : ''}`}
                    </Badge>
                    <Badge tone="slate" icon={Users}>
                      {role.userCount} personne{role.userCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
                  <ButtonLink to={`/roles/${role.id}`} variant="ghost" size="sm" icon={editable ? PencilLine : Eye}>
                    {editable ? 'Modifier' : 'Voir'}
                  </ButtonLink>
                  {auth.can('roles.delete') && !role.isSystem && (
                    <Button variant="ghost" size="sm" icon={Trash2} className="ml-auto text-red-700 hover:bg-red-50" onClick={() => setToDelete(role)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce rôle ?"
        message={
          toDelete && toDelete.userCount > 0
            ? `Le rôle « ${toDelete.name} » est donné à ${toDelete.userCount} personne(s). Retirez-le-leur d'abord.`
            : `Le rôle « ${toDelete?.name ?? ''} » sera supprimé définitivement.`
        }
        confirmLabel="Supprimer"
        icon={Trash2}
        loading={deleting}
        confirmDisabled={Boolean(toDelete && toDelete.userCount > 0)}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
