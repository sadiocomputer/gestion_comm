import { useAuth } from '../auth/useAuth'

/** Page d'accueil provisoire (le tableau de bord viendra en phase 11). */
export function HomePage() {
  const auth = useAuth()
  if (auth.status !== 'authenticated') return null

  const roleNames = auth.user.roles.map((role) => role.name).join(', ')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Bonjour {auth.user.name}
      </h1>
      <p className="mt-2 text-slate-600">
        {roleNames ? `Rôle : ${roleNames}` : "Aucun rôle attribué. Contacte l'administrateur."}
      </p>
    </div>
  )
}
