import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { api, getErrorMessage, type Role } from '../lib/api'

export function RolesPage() {
  const auth = useAuth()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  const [roles, setRoles] = useState<Role[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Rôle en attente de confirmation de suppression (pas de confirm() navigateur).
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadRoles = useCallback(async () => {
    try {
      const { data } = await api.get<Role[]>('/roles')
      setRoles(data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  async function handleDelete(role: Role) {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await api.delete(`/roles/${role.id}`)
      setSuccess(`Rôle « ${role.name} » supprimé.`)
      setConfirmingId(null)
      await loadRoles()
      await auth.reloadUser()
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmingId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Rôles</h1>
        {auth.can('roles.create') && (
          <Link
            to="/roles/new"
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Nouveau rôle
          </Link>
        )}
      </div>

      {notice && !success && !error && <Alert tone="success">{notice}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {!roles && !error && <p className="text-slate-500">Chargement…</p>}

      {roles && (
        <ul className="space-y-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {role.name}
                  {role.isSystem && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                      Système
                    </span>
                  )}
                </p>
                {role.description && (
                  <p className="text-sm text-slate-600">{role.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {role.permissions.length} permission(s) · {role.userCount} utilisateur(s)
                </p>
              </div>

              {confirmingId === role.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-700">Supprimer ce rôle ?</span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete(role)}
                    className="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-800 disabled:opacity-60"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmingId(null)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 text-sm">
                  <Link
                    to={`/roles/${role.id}`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    {auth.can('roles.update') && !role.isSystem ? 'Modifier' : 'Voir'}
                  </Link>
                  {auth.can('roles.delete') && !role.isSystem && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(role.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
