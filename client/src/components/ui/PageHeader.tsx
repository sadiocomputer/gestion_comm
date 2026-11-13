import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { BackLink } from './BackLink'
import { IconBubble, type Tone } from './IconBubble'

type Props = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  /** Boutons d'action à droite (passent sous le titre sur mobile). */
  actions?: ReactNode
  /** Lien de retour, ex. { to: '/clients', label: 'Clients' } */
  back?: { to: string; label: string }
}

/** En-tête commun à toutes les pages : même place, même style partout. */
export function PageHeader({ title, description, icon, tone = 'blue', actions, back }: Props) {
  return (
    <header className="mb-6 space-y-3 print:hidden">
      {back && <BackLink to={back.to} label={back.label} />}
      <div className="flex flex-wrap items-center gap-4">
        {icon && (
          <span className="hidden sm:inline-flex">
            <IconBubble icon={icon} tone={tone} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>}
      </div>
    </header>
  )
}
