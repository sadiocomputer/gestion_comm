import type { LucideIcon } from 'lucide-react'

export type ChipOption<V extends string> = {
  value: V
  label: string
  icon?: LucideIcon
}

/**
 * Choix rapide en pastilles (période, statut, mode de paiement…).
 * Plus simple qu'une liste déroulante : toutes les options sont visibles.
 */
export function Chips<V extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: ChipOption<V>[]
  value: V
  onChange: (value: V) => void
  /** Nom du groupe pour les lecteurs d'écran. */
  label: string
  size?: 'md' | 'lg'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-2 rounded-xl border font-medium transition ${
              size === 'lg' ? 'h-12 px-4 text-[15px]' : 'h-10 px-3.5 text-sm'
            } ${
              selected
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {Icon && <Icon size={size === 'lg' ? 20 : 16} aria-hidden />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
