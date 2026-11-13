import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertTone = 'error' | 'success' | 'info' | 'warning'

const TONES: Record<AlertTone, [LucideIcon, string]> = {
  error: [CircleX, 'border-red-200 bg-red-50 text-red-800'],
  success: [CircleCheck, 'border-emerald-200 bg-emerald-50 text-emerald-800'],
  info: [Info, 'border-blue-200 bg-blue-50 text-blue-800'],
  warning: [TriangleAlert, 'border-amber-200 bg-amber-50 text-amber-800'],
}

/** Message dans la page, toujours avec une icône (pas seulement une couleur). */
export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  const [Icon, style] = TONES[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[15px] ${style}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
