import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { api, getErrorMessage, type Paginated, type UserDetail } from '../lib/api'
import { formatDate, formatPhone } from '../lib/format'

const PAGE_SIZE = 20

export function UsersPage() {
  const auth = useAuth()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  // La page courante est dans l'URL (?page=2) : le bouton Retour fonctionne.
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const [result, setResult] = useState<Paginated<UserDetail> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<UserDetail>>('/users', { params: { page, limit: PAGE_SIZE } })
      .then((response) => {
        if (cancelled) return
        setResult(response.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [page])

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Utilisateurs</h1>
        {auth.can('users.create') && (
          <Link
            to="/users/new"
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Nouvel utilisateur
          </Link>
        )}
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {!result && !error && <p className="text-slate-500">Chargement…</p>}

      {result && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Téléphone</th>
                  <th className="px-4 py-3 font-medium">Rôles</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/users/${user.id}`} className="text-blue-700 hover:underline">
                        {user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatPhone(user.phone)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => role.name).join(', ')
                      ) : (
                        <span className="text-slate-400">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          Désactivé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Aucun utilisateur sur cette page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              {result.total} utilisateur{result.total > 1 ? 's' : ''} · page {page} sur{' '}
              {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1) })}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
