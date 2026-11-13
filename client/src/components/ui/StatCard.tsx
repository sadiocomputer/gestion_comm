import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconBubble, type Tone } from './IconBubble'

const VALUE_COLOR: Record<Tone, string> = {
  blue: 'text-slate-900',
  green: 'text-emerald-700',
  orange: 'text-amber-700',
  red: 'text-red-700',
  slate: 'text-slate-900',
  violet: 'text-slate-900',
}

/** Grande carte chiffrée du tableau de bord (et des résumés de page). */
export function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  hint,
  to,
}: {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: Tone
  hint?: ReactNode
  /** Rend la carte cliquable vers le détail. */
  to?: string
}) {
  const content = (
    <div className="flex items-start gap-4">
      <IconBubble icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold tracking-tight sm:text-[28px] ${VALUE_COLOR[tone]}`}>
          {value}
        </p>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  )

  const base =
    'block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
  return to ? (
    <Link to={to} className={`${base} transition hover:border-slate-300 hover:shadow-md`}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  )
}
