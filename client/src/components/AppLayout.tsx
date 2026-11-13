import { FileText, LayoutDashboard, Menu, Package, Plus, X } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { SHOP } from '../lib/shop'
import { canSee, isItemActive, SELL_ITEM, type NavItem } from './layout/navigation'
import { Sidebar } from './layout/Sidebar'
import { LoadingState } from './ui/Loading'
import { LogoMark } from './ui/Logo'
import { RouteErrorBoundary } from './ui/RouteErrorBoundary'

const COLLAPSE_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Raccourcis de la barre du bas sur téléphone (en plus du bouton central « Vendre »). */
const BOTTOM_LEFT: NavItem[] = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, isActive: (p) => p === '/' },
  {
    to: '/sales',
    label: 'Factures',
    icon: FileText,
    permissions: ['sales.create', 'sales.read'],
    isActive: (p) => p.startsWith('/sales') && !p.startsWith('/sales/new'),
  },
]
const BOTTOM_RIGHT: NavItem[] = [
  { to: '/products', label: 'Produits', icon: Package, permissions: ['products.read'] },
]

/**
 * Cadre des pages privées.
 * - Ordinateur (≥ 1024 px) : barre latérale fixe, réductible aux icônes.
 * - Tablette / téléphone : barre du haut + menu coulissant + barre du bas
 *   avec un gros bouton « Vendre » au centre.
 */
export function AppLayout() {
  const auth = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Ferme le menu mobile quand on change de page.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Échap ferme le menu mobile.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, current ? '0' : '1')
      } catch {
        // Stockage indisponible : la préférence n'est simplement pas retenue.
      }
      return !current
    })
  }

  const canSell = canSee(SELL_ITEM, auth.can)
  const renderBottomItem = (item: NavItem) => {
    if (!canSee(item, auth.can)) return null
    const active = isItemActive(item, pathname)
    const Icon = item.icon
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
          active ? 'text-blue-700' : 'text-slate-500'
        }`}
      >
        <Icon size={22} aria-hidden />
        {item.label}
      </Link>
    )
  }

  return (
    <div className="min-h-svh">
      {/* ---------- Ordinateur : barre latérale ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] lg:block print:hidden ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* ---------- Mobile : barre du haut ---------- */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          className="-ml-2 rounded-xl p-2.5 text-slate-700 hover:bg-slate-100"
        >
          <Menu size={24} aria-hidden />
        </button>
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-2">
          <LogoMark size="sm" />
          <span className="truncate font-bold text-slate-900">{SHOP.name}</span>
        </Link>
      </header>

      {/* ---------- Mobile : menu coulissant ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
              className="absolute top-4 right-3 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={22} aria-hidden />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ---------- Contenu ---------- */}
      <main
        className={`px-4 pt-6 pb-28 sm:px-6 lg:pb-10 print:p-0! ${collapsed ? 'lg:pl-[calc(76px+2rem)]' : 'lg:pl-[calc(16rem+2rem)]'} lg:pr-8`}
      >
        <div className="mx-auto max-w-6xl">
          {/* key : une erreur sur un écran est oubliée quand on change de page. */}
          <RouteErrorBoundary key={pathname}>
            {/* Pendant le téléchargement d'un écran, le menu reste affiché. */}
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </div>
      </main>

      {/* ---------- Mobile : barre du bas ---------- */}
      <nav
        aria-label="Raccourcis"
        className="fixed inset-x-0 bottom-0 z-20 flex h-[72px] items-stretch border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        {BOTTOM_LEFT.map(renderBottomItem)}
        {canSell && (
          <div className="flex flex-1 justify-center">
            <Link
              to={SELL_ITEM.to}
              aria-label="Nouvelle vente"
              className="-mt-6 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-white transition active:scale-95"
            >
              <Plus size={28} aria-hidden />
            </Link>
          </div>
        )}
        {BOTTOM_RIGHT.map(renderBottomItem)}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-500"
        >
          <Menu size={22} aria-hidden />
          Menu
        </button>
      </nav>
    </div>
  )
}
