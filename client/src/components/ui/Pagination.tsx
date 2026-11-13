import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { Button } from './Button'

/**
 * Numéros à afficher : toujours la première et la dernière page, la page
 * courante et ses voisines ; « … » pour les trous.
 * Ex. page 5 sur 30 → [1, '…', 4, 5, 6, '…', 30]
 */
function pageNumbers(page: number, pages: number): (number | '…')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1])
  const sorted = [...wanted].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1]
    if (previous !== undefined && p - previous === 2) result.push(p - 1) // un seul trou : on montre le numéro
    else if (previous !== undefined && p - previous > 2) result.push('…')
    result.push(p)
  })
  return result
}

/** Hauteur de la barre du haut sur téléphone (64 px) + une marge. */
const TOP_OFFSET = 80

/**
 * « 42 clients · page 2 sur 3 » + navigation.
 * - Ordinateur / tablette : Précédent, numéros de page, Suivant.
 * - Téléphone : deux gros boutons et « Page 2 sur 3 » au milieu.
 * À chaque changement de page, on remonte au début de la liste.
 */
export function Pagination({
  page,
  total,
  limit,
  onPage,
  itemLabel,
}: {
  page: number
  total: number
  limit: number
  onPage: (page: number) => void
  /** Ex. ['client', 'clients'] */
  itemLabel: [string, string]
}) {
  const ref = useRef<HTMLElement>(null)
  const pages = Math.max(1, Math.ceil(total / limit))
  const count = (
    <p className="text-sm text-slate-500">
      {total} {total > 1 ? itemLabel[1] : itemLabel[0]}
      {/* Sur téléphone, « Page X sur Y » est écrit entre les deux boutons. */}
      <span className="hidden sm:inline"> · page {page} sur {pages}</span>
    </p>
  )
  // La barre reste visible même avec une seule page (boutons grisés) :
  // l'utilisateur sait ainsi qu'il voit bien toute la liste.

  function go(target: number) {
    if (target < 1 || target > pages || target === page) return
    onPage(target)
    // La liste se trouve juste au-dessus : on la remet en haut de l'écran
    // si son début n'est plus visible.
    const box = ref.current?.parentElement
    if (box) {
      const top = box.getBoundingClientRect().top
      if (top < TOP_OFFSET) window.scrollBy({ top: top - TOP_OFFSET, behavior: 'smooth' })
    }
  }

  return (
    <nav ref={ref} aria-label="Pages" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {count}
        {/* Ordinateur / tablette */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => go(page - 1)}>
            Précédent
          </Button>
          {pageNumbers(page, pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => go(page + 1)}>
            Suivant
          </Button>
        </div>
      </div>

      {/* Téléphone : gros boutons faciles à toucher */}
      <div className="flex items-center gap-2 sm:hidden">
        <Button variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => go(page - 1)} className="flex-1">
          Précédent
        </Button>
        <span className="shrink-0 px-1 text-center text-sm font-semibold text-slate-700">
          Page {page}
          <br />
          <span className="font-normal text-slate-500">sur {pages}</span>
        </span>
        <Button variant="secondary" iconRight={ChevronRight} disabled={page >= pages} onClick={() => go(page + 1)} className="flex-1">
          Suivant
        </Button>
      </div>
    </nav>
  )
}
