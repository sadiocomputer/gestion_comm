/** "620000000" -> "620 00 00 00" */
export function formatPhone(phone: string): string {
  return /^\d{9}$/.test(phone)
    ? phone.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')
    : phone
}

const integerFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const quantityFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

/** 350000 -> "350 000 GNF" */
export function formatMoney(amount: number): string {
  return `${integerFormat.format(amount)} GNF`
}

/** (12.5, "kg") -> "12,5 kg" */
export function formatQuantity(quantity: number, unit?: string): string {
  const value = quantityFormat.format(quantity)
  return unit ? `${value} ${unit}` : value
}

/** Date ISO -> "11/11/2026 14:30" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Date locale au format AAAA-MM-JJ (pour les filtres de période). */
function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toISODate(date)
}

/** Premier et dernier jour du mois précédent. */
export function lastMonthRangeISO(): { from: string; to: string } {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}

/** "2026-11-12" -> "12/11/2026" (sans décalage de fuseau). */
export function formatDayISO(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function yearStartISO(): string {
  return `${new Date().getFullYear()}-01-01`
}

export function monthStartISO(): string {
  const date = new Date()
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
}

/** Date ISO -> "11/11/2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
