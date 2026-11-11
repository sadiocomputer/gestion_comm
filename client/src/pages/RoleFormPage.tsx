import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { TextField } from '../components/TextField'
import { api, getErrorMessage, type Permission, type Role } from '../lib/api'
import { MODULE_LABELS } from '../lib/permissions'

/**
 * Une seule page pour /roles/new (création) et /roles/:id (consultation ou
 * modification). Lecture seule si rôle système ou sans permission roles.update.
 */
export function RoleFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const auth = useAuth()
  const navigate = useNavigate()

  const [permissions, setPermissions] = useState<Permission[] | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Chargement du catalogue et, en modification, du rôle.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<Permission[]>('/permissions'),
      isNew ? Promise.resolve(null) : api.get<Role>(`/roles/${id}`),
    ])
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

  // Regroupe les permissions par module : { users: [...], roles: [...] }.
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const permission of permissions ?? []) {
      map.set(permission.module, [...(map.get(permission.module) ?? []), permission])
    }
    return [...map.entries()]
  }, [permissions])

  const readOnly = isNew
    ? !auth.can('roles.create')
    : !auth.can('roles.update') || role?.isSystem === true

  function toggle(code: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const body = { name, description, permissionCodes: [...selected] }
    try {
      if (isNew) {
        await api.post('/roles', body)
      } else {
        await api.patch(`/roles/${id}`, body)
      }
      // Si l'utilisateur connecté a ce rôle, ses droits ont pu changer.
      await auth.reloadUser()
      navigate('/roles', {
        state: { notice: `Rôle « ${name.trim()} » ${isNew ? 'créé' : 'modifié'}.` },
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const title = isNew ? 'Nouveau rôle' : readOnly ? `Rôle ${role?.name ?? ''}` : 'Modifier le rôle'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>

      {role?.isSystem && (
        <Alert tone="info">
          Rôle système : il possède toutes les permissions et ne peut pas être modifié.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {!permissions && !error && <p className="text-slate-500">Chargement…</p>}

      {permissions && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
        >
          <fieldset disabled={readOnly || submitting} className="space-y-4">
            <TextField
              label="Nom du rôle"
              required
              minLength={2}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Description (facultatif)"
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700">Permissions</p>
              {groups.map(([module, items]) => (
                <div key={module} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-900">
                    {MODULE_LABELS[module] ?? module}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((permission) => (
                      <label
                        key={permission.code}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(permission.code)}
                          onChange={() => toggle(permission.code)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3">
            {!readOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
            <Link
              to="/roles"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              {readOnly ? 'Retour' : 'Annuler'}
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
