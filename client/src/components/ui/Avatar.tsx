const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-800',
]

/** "Mamadou Diallo" -> "MD" */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

/** Pastille avec les initiales : repère visuel rapide pour une personne. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  // Couleur stable pour un même nom.
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const color = COLORS[hash % COLORS.length]
  const box = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-[15px]'
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${box} ${color}`} aria-hidden>
      {initials(name) || '?'}
    </span>
  )
}
