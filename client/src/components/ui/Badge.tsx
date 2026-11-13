import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { TONE_SOFT, type Tone } from './IconBubble'

/**
 * Étiquette de statut. Toujours un TEXTE (+ icône facultative) :
 * l'information n'est jamais portée par la couleur seule.
 */
export function Badge({
  tone = 'slate',
  icon: Icon,
  children,
}: {
  tone?: Tone
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONE_SOFT[tone]}`}
    >
      {Icon && <Icon size={14} aria-hidden />}
      {children}
    </span>
  )
}
