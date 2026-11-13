import { useState } from 'react'

/**
 * Couleurs des séries, dans un ORDRE FIXE (vérifié pour les daltoniens :
 * bleu puis orange, écart ΔE ≥ 24 même en vision protan).
 * Une série garde toujours sa couleur, même si l'autre est absente.
 */
export const SERIES_COLORS = ['#2563eb', '#eb6834'] as const

export type ChartSeries = {
  label: string
  /** Couleur de la série (prendre dans SERIES_COLORS, dans l'ordre). */
  color: string
}

export type BarDatum = {
  /** Libellé court sous le groupe (ex. « lun. »). */
  label: string
  /** Libellé complet dans la bulle (ex. « lundi 10 novembre »). */
  fullLabel: string
  /** Une valeur par série, dans l'ordre de `series`. */
  values: number[]
  /** Ligne secondaire de la bulle (ex. « 4 ventes »). */
  detail?: string
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })

/** Arrondit le haut de l'axe à une valeur « ronde » (1, 2, 2,5, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value) ?? 10
  return step * power
}

/**
 * Graphique en barres, une ou deux séries côte à côte (ex. ventes / dépenses).
 * - 1 série : pas de légende (le titre de la carte suffit) ;
 * - 2 séries : légende avec le total de chaque série (l'identité ne repose
 *   jamais sur la couleur seule) ;
 * - survol / toucher : bulle avec les valeurs exactes ;
 * - tableau caché pour les lecteurs d'écran.
 */
export function BarChart({
  data,
  series,
  formatValue,
  height = 220,
  caption,
}: {
  data: BarDatum[]
  series: ChartSeries[]
  formatValue: (value: number) => string
  height?: number
  /** Description du graphique pour les lecteurs d'écran. */
  caption: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)))
  const ticks = [max, max / 2, 0]
  const plotHeight = height - 28
  // Sur 30 jours, un libellé sur 5 pour éviter les chevauchements.
  const labelEvery = data.length > 14 ? 5 : 1
  const totals = series.map((_, s) => data.reduce((sum, d) => sum + (d.values[s] ?? 0), 0))

  return (
    <figure className="space-y-4">
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-hidden="true">
          {series.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-slate-600">{s.label}</span>
              <span className="font-semibold text-slate-900">{formatValue(totals[i])}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3" aria-hidden="true">
        {/* Axe vertical : valeurs arrondies, en texte discret */}
        <div className="flex flex-col justify-between pb-7 text-right text-xs text-slate-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {compact.format(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Lignes de grille */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: plotHeight }}>
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-slate-300" />
          </div>

          {/* Groupes de barres (un par jour) */}
          <div className={`relative flex items-end ${series.length > 1 ? 'gap-1.5' : 'gap-0.5'}`} style={{ height: plotHeight }} onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <button
                key={d.fullLabel}
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(active === i ? null : i)}
                // La zone cliquable couvre toute la hauteur : plus facile au doigt.
                className="flex h-full min-w-0 flex-1 cursor-default items-end gap-0.5"
              >
                {d.values.map((value, s) => (
                  <span
                    key={series[s]?.label ?? s}
                    className={`block min-w-0 flex-1 rounded-t-[4px] transition ${active === i ? 'brightness-75' : ''}`}
                    style={{
                      backgroundColor: series[s]?.color,
                      height: value > 0 ? `max(${(value / max) * 100}%, 3px)` : 0,
                    }}
                  />
                ))}
              </button>
            ))}
          </div>

          {/* Libellés des jours */}
          <div className={`mt-2 flex text-center text-xs text-slate-500 ${series.length > 1 ? 'gap-1.5' : 'gap-0.5'}`}>
            {data.map((d, i) => (
              <span key={d.fullLabel} className="min-w-0 flex-1 truncate">
                {i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}
              </span>
            ))}
          </div>

          {/* Bulle d'information */}
          {active !== null && data[active] && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-2 text-sm whitespace-nowrap text-white shadow-lg"
              style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <p className="text-xs text-slate-300 first-letter:uppercase">{data[active].fullLabel}</p>
              {series.map((s, idx) => (
                <p key={s.label} className="flex items-center gap-2">
                  {series.length > 1 && <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />}
                  {series.length > 1 && <span className="text-slate-300">{s.label}</span>}
                  <span className="font-bold">{formatValue(data[active].values[idx] ?? 0)}</span>
                </p>
              ))}
              {data[active].detail && <p className="text-xs text-slate-300">{data[active].detail}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Version tableau, lue par les lecteurs d'écran */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.fullLabel}>
              <th scope="row">{d.fullLabel}</th>
              {series.map((s, idx) => (
                <td key={s.label}>{formatValue(d.values[idx] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
