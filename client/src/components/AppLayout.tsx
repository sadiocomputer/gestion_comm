import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import type { PermissionCode } from '../lib/permissions'

type NavItem = {
  to: string
  label: string
  end: boolean
  // Lien affiché seulement si l'utilisateur a cette permission.
  permission?: PermissionCode
}

const LINKS: NavItem[] = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/users', label: 'Utilisateurs', end: false, permission: 'users.read' },
  { to: '/roles', label: 'Rôles', end: false, permission: 'roles.read' },
  { to: '/profile', label: 'Mon profil', end: false },
]

/** Cadre commun des pages privées : barre de navigation + contenu. */
export function AppLayout() {
  const auth = useAuth()
  const userName = auth.status === 'authenticated' ? auth.user.name : ''

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-slate-900">Gestion commerciale</span>

          <nav className="flex flex-wrap gap-1">
            {LINKS.filter((link) => !link.permission || auth.can(link.permission)).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm ${
                    isActive
                      ? 'bg-blue-50 font-medium text-blue-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-600">{userName}</span>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </>
  )
}
