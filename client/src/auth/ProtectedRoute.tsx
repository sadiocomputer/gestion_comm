import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '../components/ui/Loading'
import { useAuth } from './useAuth'

/**
 * Enveloppe les pages privées. Ce n'est qu'un confort d'affichage :
 * la vraie protection reste côté backend (JwtAuthGuard).
 */
export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingState label="Ouverture de votre session…" />
      </div>
    )
  }

  if (auth.status === 'anonymous') {
    // On mémorise la page demandée pour y revenir après la connexion.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
