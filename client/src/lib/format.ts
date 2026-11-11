/** "620000000" -> "620 00 00 00" */
export function formatPhone(phone: string): string {
  return /^\d{9}$/.test(phone)
    ? phone.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')
    : phone
}

/** Date ISO -> "11/11/2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
