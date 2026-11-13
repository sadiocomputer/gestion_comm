import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type InfoItem = {
  icon: LucideIcon
  label: string
  value: ReactNode
  /** Occupe toute la largeur (ex. notes). */
  wide?: boolean
}

/** Informations d'une fiche : icône + libellé + valeur, sur deux colonnes. */
export function InfoList({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {items.map(({ icon: Icon, label, value, wide }) => (
        <div key={label} className={`flex gap-3 ${wide ? 'sm:col-span-2' : ''}`}>
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-[15px] font-medium break-words whitespace-pre-line text-slate-900">
              {value || <span className="font-normal text-slate-400">Non renseigné</span>}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
