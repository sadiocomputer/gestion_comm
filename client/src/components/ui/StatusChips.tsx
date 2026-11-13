import { Chips, type ChipOption } from './Chips'

export type ActiveFilter = 'active' | 'archived' | 'all'

const OPTIONS: ChipOption<ActiveFilter>[] = [
  { value: 'active', label: 'Actifs' },
  { value: 'archived', label: 'Archivés' },
  { value: 'all', label: 'Tous' },
]

/** Filtre Actifs / Archivés / Tous, commun aux listes clients, fournisseurs, produits. */
export function StatusChips({ value, onChange }: { value: ActiveFilter; onChange: (v: ActiveFilter) => void }) {
  return <Chips label="Statut" options={OPTIONS} value={value} onChange={onChange} />
}
