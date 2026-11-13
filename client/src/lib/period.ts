import { daysAgoISO, formatDayISO, lastMonthRangeISO, monthStartISO, todayISO, yearStartISO } from './format'

/**
 * Périodes communes aux écrans filtrés par date (tableau de bord, factures,
 * paiements, stock…). « custom » = dates choisies par l'utilisateur.
 */
export type PeriodKey = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  all: 'Tout',
  today: "Aujourd'hui",
  week: '7 derniers jours',
  month: 'Ce mois',
  lastMonth: 'Mois dernier',
  year: 'Cette année',
  custom: 'Choisir les dates',
}

export type DateRange = { from: string; to: string }

/** Dates "AAAA-MM-JJ" (bornes incluses) d'une période ; null = « Tout » (aucune limite). */
export function periodRange(period: 'all', from?: string | null, to?: string | null): null
export function periodRange(period: Exclude<PeriodKey, 'all'>, from?: string | null, to?: string | null): DateRange
export function periodRange(period: PeriodKey, from?: string | null, to?: string | null): DateRange | null
export function periodRange(period: PeriodKey, from?: string | null, to?: string | null): DateRange | null {
  switch (period) {
    case 'all':
      return null
    case 'today':
      return { from: todayISO(), to: todayISO() }
    case 'week':
      return { from: daysAgoISO(6), to: todayISO() }
    case 'lastMonth':
      return lastMonthRangeISO()
    case 'year':
      return { from: yearStartISO(), to: todayISO() }
    case 'custom':
      return { from: from || monthStartISO(), to: to || todayISO() }
    default:
      return { from: monthStartISO(), to: todayISO() }
  }
}

/** Fin de phrase : « Ventes » + « aujourd'hui », « ce mois », « du 01/11/2026 au 12/11/2026 »… */
export function periodPhrase(period: PeriodKey, range: DateRange | null): string {
  if (!range) return 'depuis le début'
  switch (period) {
    case 'today':
      return "aujourd'hui"
    case 'week':
      return 'ces 7 derniers jours'
    case 'month':
      return 'ce mois'
    case 'lastMonth':
      return 'le mois dernier'
    case 'year':
      return 'cette année'
    default:
      return range.from === range.to
        ? `le ${formatDayISO(range.from)}`
        : `du ${formatDayISO(range.from)} au ${formatDayISO(range.to)}`
  }
}

/**
 * Paramètres d'URL pour ouvrir un autre écran sur la même période.
 * Ex. "period=week" ou "period=custom&from=2026-11-01&to=2026-11-12".
 */
export function periodSearch(period: PeriodKey, range: DateRange | null): string {
  if (period === 'custom' && range) return `period=custom&from=${range.from}&to=${range.to}`
  return `period=${period}`
}

/** Lit une période dans l'URL ; valeur inconnue → période par défaut. */
export function parsePeriod(value: string | null, allowed: PeriodKey[], fallback: PeriodKey): PeriodKey {
  return value && (allowed as string[]).includes(value) ? (value as PeriodKey) : fallback
}

/** "2026-11" ou "2026-11-12" -> libellés court et long d'une barre de graphique. */
export function bucketLabels(bucket: string, granularity: 'day' | 'month', days: number) {
  if (granularity === 'month') {
    const date = new Date(`${bucket}-15T12:00:00Z`)
    return {
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      fullLabel: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  }
  const date = new Date(`${bucket}T12:00:00Z`)
  return {
    label: date.toLocaleDateString('fr-FR', days <= 7 ? { weekday: 'short' } : { day: 'numeric' }),
    fullLabel: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}
