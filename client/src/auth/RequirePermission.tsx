import { Link, Outlet } from 'react-router'
import type { PermissionCode } from '../lib/permissions'
import { useAuth } from './useAuth'

/**
 * Enveloppe des routes réservées à une permission.
 * Confort d'affichage seulement : même en tapant l'URL, le backend renverrait 403.
 */
export function RequirePermission({ permission }: { permission: PermissionCode }) {
  const auth = useAuth()

  if (!auth.can(permission)) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Accès refusé</h1>
        <p className="mt-2 text-slate-600">
          Tu n'as pas les droits nécessaires pour ouvrir cette page.
        </p>
        <Link to="/" className="mt-6 inline-block text-blue-700 underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  return <Outlet />
}
