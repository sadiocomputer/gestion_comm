import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconBubble, type Tone } from './IconBubble'

/**
 * Remplace un tableau vide : une illustration, une phrase simple,
 * et l'action à faire ensuite (« Ajouter mon premier client »).
 */
export function EmptyState({
  icon,
  tone = 'blue',
  title,
  description,
  action,
}: {
  icon: LucideIcon
  tone?: Tone
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="relative mb-5">
        {/* Halo décoratif derrière l'icône */}
        <span className="absolute inset-0 scale-150 rounded-full bg-slate-100/70" aria-hidden />
        <span className="relative">
          <IconBubble icon={icon} tone={tone} size="xl" />
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[15px] text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
