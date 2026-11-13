import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Case à cocher en forme de tuile : toute la zone est cliquable,
 * l'état coché est visible par la couleur ET par la coche.
 */
export function CheckTile({
  checked,
  onChange,
  title,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
          checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{title}</span>
        {description && <span className="block text-sm text-slate-500">{description}</span>}
      </span>
    </button>
  )
}
