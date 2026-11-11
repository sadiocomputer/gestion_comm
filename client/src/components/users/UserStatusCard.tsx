import { useState } from 'react'
import { api, getErrorMessage, type UserDetail } from '../../lib/api'
import { Alert } from '../Alert'

type Props = {
  user: UserDetail
  onChanged: (user: UserDetail) => void
}

export function UserStatusCard({ user, onChanged }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function setActive(isActive: boolean) {
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.patch<UserDetail>(`/users/${user.id}/status`, { isActive })
      onChanged(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Accès au compte</h2>
      <p className="mt-1 text-sm text-slate-600">
        {user.isActive
          ? 'Désactiver bloque immédiatement le compte et ferme toutes ses sessions.'
          : 'Ce compte est désactivé : la personne ne peut plus se connecter.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {user.isActive && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-200 px-4 py-2 text-red-700 hover:bg-red-50"
          >
            Désactiver le compte
          </button>
        )}

        {user.isActive && confirming && (
          <>
            <span className="text-sm text-slate-700">Confirmer la désactivation ?</span>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void setActive(false)}
              className="rounded-lg bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:opacity-60"
            >
              Oui, désactiver
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
          </>
        )}

        {!user.isActive && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void setActive(true)}
            className="rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            Réactiver le compte
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </section>
  )
}
