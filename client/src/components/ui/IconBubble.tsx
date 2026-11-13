import type { LucideIcon } from 'lucide-react'

export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'slate' | 'violet'

/** Couleurs de fond + texte par ton, partagées par badges, icônes et cartes. */
export const TONE_SOFT: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  orange: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-700',
}

const SIZES = {
  sm: ['h-10 w-10 rounded-xl', 20],
  md: ['h-12 w-12 rounded-xl', 24],
  lg: ['h-16 w-16 rounded-2xl', 32],
  xl: ['h-20 w-20 rounded-3xl', 40],
} as const

/** Icône dans une pastille colorée : repère visuel de chaque fonctionnalité. */
export function IconBubble({
  icon: Icon,
  tone = 'blue',
  size = 'md',
}: {
  icon: LucideIcon
  tone?: Tone
  size?: keyof typeof SIZES
}) {
  const [box, iconSize] = SIZES[size]
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${TONE_SOFT[tone]}`}>
      <Icon size={iconSize} aria-hidden />
    </span>
  )
}
