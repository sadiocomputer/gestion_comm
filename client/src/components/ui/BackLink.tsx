import { ArrowLeft, X, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

/**
 * Style commun des actions « sortir » : retour à la liste, annuler un
 * formulaire, refermer une confirmation. Icône dans un carré blanc + texte.
 */
const ACTION_CLASSES =
  'group inline-flex h-11 items-center gap-2.5 rounded-xl pr-3 pl-1 text-[15px] font-medium text-slate-600 transition hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50 print:hidden'

const ICON_BOX_CLASSES =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-slate-300 group-hover:text-slate-900'

function ActionContent({ icon: Icon, label, slide }: { icon: LucideIcon; label: string; slide?: boolean }) {
  return (
    <>
      <span className={`${ICON_BOX_CLASSES} ${slide ? 'group-hover:-translate-x-0.5' : ''}`}>
        <Icon size={18} aria-hidden />
      </span>
      {label}
    </>
  )
}

/** Retour à la page d'origine (en haut des pages de détail). */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} aria-label={`Retour : ${label}`} className={`-ml-1.5 ${ACTION_CLASSES}`}>
      <ActionContent icon={ArrowLeft} label={label} slide />
    </Link>
  )
}

type CancelProps = {
  label?: string
  icon?: LucideIcon
  disabled?: boolean
} & ({ to: string; onClick?: never } | { onClick: () => void; to?: never })

/**
 * « Annuler » : quitte un formulaire (to) ou referme une confirmation (onClick).
 * Même apparence que BackLink.
 */
export function CancelButton({ label = 'Annuler', icon = X, disabled, to, onClick }: CancelProps) {
  if (to !== undefined) {
    return (
      <Link to={to} className={ACTION_CLASSES}>
        <ActionContent icon={icon} label={label} />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={ACTION_CLASSES}>
      <ActionContent icon={icon} label={label} />
    </button>
  )
}
