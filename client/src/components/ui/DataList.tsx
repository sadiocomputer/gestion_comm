import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

export type Column<T> = {
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Masque la colonne sur les écrans moyens (tablette). */
  hideOnTablet?: boolean
}

type Props<T> = {
  rows: T[]
  rowKey: (row: T) => string | number
  columns: Column<T>[]
  /** Rendu « carte » utilisé sur téléphone à la place du tableau. */
  mobileCard: (row: T) => ReactNode
  /** Si fourni, toute la ligne / la carte est cliquable. */
  rowHref?: (row: T) => string
  /** Grise une ligne (ex. vente annulée). */
  isMuted?: (row: T) => boolean
}

/**
 * Liste adaptative :
 * - ordinateur / tablette : tableau aéré, lignes cliquables ;
 * - téléphone : une carte par élément (pas de défilement horizontal).
 */
export function DataList<T>({ rows, rowKey, columns, mobileCard, rowHref, isMuted }: Props<T>) {
  const navigate = useNavigate()

  return (
    <>
      {/* Téléphone : cartes */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => {
          const muted = isMuted?.(row)
          const content = (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">{mobileCard(row)}</div>
              {rowHref && <ChevronRight size={20} className="shrink-0 text-slate-300" aria-hidden />}
            </div>
          )
          const cardClass = `block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
            muted ? 'opacity-60' : ''
          }`
          return (
            <li key={rowKey(row)}>
              {rowHref ? (
                <Link to={rowHref(row)} className={`${cardClass} active:bg-slate-50`}>
                  {content}
                </Link>
              ) : (
                <div className={cardClass}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Ordinateur : tableau */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:block">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  scope="col"
                  className={`px-5 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${
                    col.align === 'right' ? 'text-right' : ''
                  } ${col.hideOnTablet ? 'hidden lg:table-cell' : ''}`}
                >
                  {col.header}
                </th>
              ))}
              {rowHref && <th className="w-10" aria-hidden />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={rowHref ? () => navigate(rowHref(row)) : undefined}
                className={`${rowHref ? 'cursor-pointer hover:bg-slate-50' : ''} ${
                  isMuted?.(row) ? 'text-slate-400' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-5 py-4 align-middle ${col.align === 'right' ? 'text-right whitespace-nowrap' : ''} ${
                      col.hideOnTablet ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {col.cell(row)}
                  </td>
                ))}
                {rowHref && (
                  <td className="pr-4 text-slate-300">
                    <ChevronRight size={18} aria-hidden />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
