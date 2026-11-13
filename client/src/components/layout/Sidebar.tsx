import { ChevronsLeft, ChevronsRight, LogOut, Plus, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { SHOP } from '../../lib/shop'
import { LogoMark } from '../ui/Logo'
import { canSee, isItemActive, NAV_GROUPS, SELL_ITEM } from './navigation'

type Props = {
  /** Barre réduite aux icônes (ordinateur uniquement). */
  collapsed?: boolean
  onToggleCollapsed?: () => void
  /** Appelé après un clic sur un lien (ferme le menu mobile). */
  onNavigate?: () => void
}

/** Barre latérale : logo, gros bouton « Vendre », menu par groupes, utilisateur. */
export function Sidebar({ collapsed = false, onToggleCollapsed, onNavigate }: Props) {
  const auth = useAuth()
  const { pathname } = useLocation()
  const userName = auth.status === 'authenticated' ? auth.user.name : ''
  const roleNames =
    auth.status === 'authenticated' ? auth.user.roles.map((r) => r.name).join(', ') : ''

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 pt-5 pb-4 ${collapsed ? 'justify-center' : ''}`}>
        <LogoMark size="md" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{SHOP.name}</p>
            <p className="text-xs text-slate-500">Nimbasoft</p>
          </div>
        )}
      </div>

      {/* Action principale */}
      {canSee(SELL_ITEM, auth.can) && (
        <div className="px-3 pb-3">
          <Link
            to={SELL_ITEM.to}
            onClick={onNavigate}
            title={collapsed ? 'Nouvelle vente' : undefined}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
              collapsed ? 'w-12' : 'w-full'
            }`}
          >
            <Plus size={22} aria-hidden />
            {!collapsed && 'Nouvelle vente'}
            {collapsed && <span className="sr-only">Nouvelle vente</span>}
          </Link>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Menu principal">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => item !== SELL_ITEM && canSee(item, auth.can))
          if (items.length === 0) return null
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isItemActive(item, pathname)
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition ${
                          collapsed ? 'justify-center' : ''
                        } ${
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon size={20} aria-hidden className="shrink-0" />
                        {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Utilisateur */}
      <div className="border-t border-slate-200 p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          title={collapsed ? 'Mon profil' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-100 ${
              collapsed ? 'justify-center' : ''
            } ${isActive ? 'bg-slate-100' : ''}`
          }
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <UserRound size={18} aria-hidden />
          </span>
          {collapsed ? (
            <span className="sr-only">Mon profil</span>
          ) : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{userName}</span>
              <span className="block truncate text-xs text-slate-500">{roleNames || 'Mon profil'}</span>
            </span>
          )}
        </NavLink>
        <button
          type="button"
          onClick={() => void auth.logout()}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`mt-1 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} aria-hidden />
          {collapsed ? <span className="sr-only">Déconnexion</span> : 'Déconnexion'}
        </button>

        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            className={`mt-1 flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? <ChevronsRight size={18} aria-hidden /> : <ChevronsLeft size={18} aria-hidden />}
            {!collapsed && 'Réduire le menu'}
          </button>
        )}
      </div>
    </div>
  )
}
