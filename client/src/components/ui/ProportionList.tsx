/**
 * Répartition d'un total (ex. dépenses par catégorie) : une ligne par élément,
 * montant + pourcentage écrits, et une barre d'une seule couleur dont seule
 * la longueur porte l'information.
 */
export function ProportionList({
  items,
  formatValue,
  color = '#eb6834',
}: {
  items: { key: string | number; label: string; value: number }[]
  formatValue: (value: number) => string
  color?: string
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0)
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const share = total > 0 ? item.value / total : 0
        return (
          <li key={item.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
              <span className="min-w-0 truncate font-medium text-slate-800">{item.label}</span>
              <span className="shrink-0">
                <span className="font-semibold text-slate-900">{formatValue(item.value)}</span>
                <span className="ml-2 text-sm text-slate-500">{Math.round(share * 100)} %</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 1)}%`, backgroundColor: color }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
