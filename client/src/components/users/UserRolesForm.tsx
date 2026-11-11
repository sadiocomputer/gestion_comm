import { useEffect, useState } from 'react'
import { api, getErrorMessage, type Role, type RoleSummary, type UserDetail } from '../../lib/api'
import { Alert } from '../Alert'

type Props = {
  user: UserDetail
  canAssign: boolean
  onSaved: (user: UserDetail) => void
}

export function UserRolesForm({ user, canAssign, onSaved }: Props) {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(user.roles.map((role) => role.id)),
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!canAssign) return
    let cancelled = false
    api
      .get<Role[]>('/roles')
      .then((response) => {
        if (!cancelled) setRoles(response.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [canAssign])

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const { data } = await api.put<{ roles: RoleSummary[] }>(`/users/${user.id}/roles`, {
        roleIds: [...selected],
      })
      onSaved({ ...user, roles: data.roles })
      setSuccess('Rôles enregistrés.')
    } catch (err) {
      setError(getErrorMessage(err))
      // On remet les cases dans l'état réel.
      setSelected(new Set(user.roles.map((role) => role.id)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Rôles</h2>

      {!canAssign && (
        <p className="mt-3 text-slate-700">
          {user.roles.length > 0
            ? user.roles.map((role) => role.name).join(', ')
            : 'Aucun rôle attribué.'}
        </p>
      )}

      {canAssign && !roles && !error && <p className="mt-3 text-slate-500">Chargement…</p>}

      {canAssign && roles && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.has(role.id)}
                  onChange={() => toggle(role.id)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="font-medium text-slate-900">{role.name}</span>
                  {role.description && (
                    <span className="block text-slate-500">{role.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {success && <Alert tone="success">{success}</Alert>}
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave()}
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer les rôles'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </section>
  )
}
