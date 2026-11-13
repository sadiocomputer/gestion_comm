import { ArrowLeft, Crown, Save, ShieldCheck, ShieldPlus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { CancelButton } from '../components/ui/BackLink'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { CheckTile } from '../components/ui/CheckTile'
import { LoadingState } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/useToast'
import { api, getErrorMessage, type Permission, type Role } from '../lib/api'
import { DEFAULT_MODULE_ICON, MODULE_ICONS } from '../lib/moduleIcons'
import { MODULE_LABELS } from '../lib/permissions'

/**
 * /roles/new (création) et /roles/:id (consultation ou modification).
 * Lecture seule pour le rôle système ou sans permission roles.update.
 */
export function RoleFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [permissions, setPermissions] = useState<Permission[] | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get<Permission[]>('/permissions'), isNew ? Promise.resolve(null) : api.get<Role>(`/roles/${id}`)])
      .then(([permissionsResponse, roleResponse]) => {
        if (cancelled) return
        setPermissions(permissionsResponse.data)
        if (roleResponse) {
          const loaded = roleResponse.data
          setRole(loaded)
          setName(loaded.name)
          setDescription(loaded.description ?? '')
          setSelected(new Set(loaded.permissions))
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  // { users: [...], roles: [...] } dans l'ordre du catalogue.
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions ?? []) map.set(p.module, [...(map.get(p.module) ?? []), p])
    return [...map.entries()]
  }, [permissions])

  const readOnly = isNew ? !auth.can('roles.create') : !auth.can('roles.update') || role?.isSystem === true

  function setMany(codes: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const code of codes) {
        if (checked) next.add(code)
        else next.delete(code)
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const body = { name, description, permissionCodes: [...selected] }
    try {
      if (isNew) await api.post('/roles', body)
      else await api.patch(`/roles/${id}`, body)
      // Si l'utilisateur connecté a ce rôle, ses droits ont pu changer.
      await auth.reloadUser()
      toast.success(`Rôle « ${name.trim()} » ${isNew ? 'créé' : 'enregistré'}`)
      navigate('/roles')
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const title = isNew ? 'Nouveau rôle' : readOnly ? (role?.name ?? 'Rôle') : 'Modifier le rôle'

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={title}
        description={isNew ? 'Donnez un nom au rôle, puis cochez ce qu’il permet de faire.' : undefined}
        icon={role?.isSystem ? Crown : isNew ? ShieldPlus : ShieldCheck}
        tone={role?.isSystem ? 'orange' : 'violet'}
        back={{ to: '/roles', label: 'Rôles' }}
      />

      {!permissions && !error && <LoadingState />}
      {!permissions && error && <Alert tone="error">{error}</Alert>}

      {permissions && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {role?.isSystem && (
            <Alert tone="info">Rôle Administrateur : il a toujours toutes les permissions et ne peut pas être modifié.</Alert>
          )}

          <Card>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Nom du rôle"
                required
                minLength={2}
                maxLength={50}
                placeholder="Ex. Magasinier"
                disabled={readOnly}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="Description"
                hint="Facultatif"
                maxLength={255}
                placeholder="Ex. Reçoit les livraisons"
                disabled={readOnly}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardBody>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Ce que ce rôle permet</h2>
            <span className="text-sm text-slate-500">
              {selected.size} sur {permissions.length} cochée{selected.size > 1 ? 's' : ''}
            </span>
          </div>

          {groups.map(([module, items]) => {
            const codes = items.map((p) => p.code)
            const allChecked = codes.every((c) => selected.has(c))
            return (
              <Card key={module}>
                <CardHeader
                  icon={MODULE_ICONS[module] ?? DEFAULT_MODULE_ICON}
                  tone="violet"
                  title={MODULE_LABELS[module] ?? module}
                  actions={
                    !readOnly && (
                      <Button variant="ghost" size="sm" onClick={() => setMany(codes, !allChecked)}>
                        {allChecked ? 'Tout décocher' : 'Tout cocher'}
                      </Button>
                    )
                  }
                />
                <CardBody className="grid gap-3 sm:grid-cols-2">
                  {items.map((p) => (
                    <CheckTile
                      key={p.code}
                      checked={selected.has(p.code)}
                      onChange={(checked) => setMany([p.code], checked)}
                      disabled={readOnly || submitting}
                      title={p.label}
                    />
                  ))}
                </CardBody>
              </Card>
            )
          })}

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {readOnly ? (
              <CancelButton to="/roles" label="Retour" icon={ArrowLeft} />
            ) : (
              <>
                <CancelButton to="/roles" />
                <Button type="submit" size="lg" icon={Save} loading={submitting}>
                  {isNew ? 'Créer le rôle' : 'Enregistrer'}
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
