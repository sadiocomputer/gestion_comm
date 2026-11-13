import { parsePeriod, periodPhrase, periodRange, type PeriodKey } from './period'
import type { useListParams } from './useListParams'

type ListParams = ReturnType<typeof useListParams>

/**
 * Période choisie, rangée dans l'URL (?period=week ou ?period=custom&from=…&to=…).
 * À afficher avec <PeriodFilter filter={…} />.
 */
export function usePeriodFilter(list: ListParams, options: PeriodKey[], fallback: PeriodKey) {
  const period = parsePeriod(list.get('period'), options, fallback)
  const range = periodRange(period, list.get('from'), list.get('to'))
  return {
    period,
    range,
    /** « aujourd'hui », « ce mois », « du 01/11/2026 au 12/11/2026 »… */
    phrase: periodPhrase(period, range),
    options,
    /** Change de période (revient en page 1). */
    setPeriod(next: PeriodKey) {
      // « Choisir les dates » part des dates affichées (ou du mois en cours depuis « Tout »).
      const start = range ?? periodRange('month')
      list.update(
        next === 'custom'
          ? { period: 'custom', from: start.from, to: start.to }
          : { period: next === fallback ? null : next, from: null, to: null },
      )
    },
    setDates(changes: { from?: string; to?: string }) {
      list.update(changes)
    },
  }
}

export type PeriodFilterState = ReturnType<typeof usePeriodFilter>
