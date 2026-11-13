import { Minus, Plus } from 'lucide-react'

/** − [ 2 ] + : gros boutons faciles à toucher pour changer une quantité. */
export function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  /** Nom du produit, pour les lecteurs d'écran. */
  label: string
}) {
  const numeric = Number(value.replace(',', '.')) || 0
  const step = (delta: number) => {
    const next = Math.max(1, Math.round((numeric + delta) * 1000) / 1000)
    onChange(String(next))
  }

  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40'

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={numeric <= 1}
        aria-label={`Retirer un ${label}`}
        className={buttonClass}
      >
        <Minus size={18} aria-hidden />
      </button>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Quantité de ${label}`}
        className="h-11 w-16 rounded-xl border border-slate-300 bg-white text-center text-base font-semibold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
      />
      <button type="button" onClick={() => step(1)} aria-label={`Ajouter un ${label}`} className={buttonClass}>
        <Plus size={18} aria-hidden />
      </button>
    </div>
  )
}
