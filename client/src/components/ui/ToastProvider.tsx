import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastTone } from './toast-context'

type Toast = { id: number; tone: ToastTone; message: string }

const STYLES: Record<ToastTone, [LucideIcon, string]> = {
  success: [CircleCheck, 'border-emerald-200 bg-white text-emerald-700'],
  error: [CircleX, 'border-red-200 bg-white text-red-700'],
  info: [Info, 'border-blue-200 bg-white text-blue-700'],
  warning: [TriangleAlert, 'border-amber-200 bg-white text-amber-700'],
}

/**
 * Notifications courtes (« Vente enregistrée », « Paiement reçu »).
 * Elles disparaissent seules après 4 s (6 s pour les erreurs).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (m: string) => push('success', m),
      error: (m: string) => push('error', m),
      info: (m: string) => push('info', m),
      warning: (m: string) => push('warning', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live : les lecteurs d'écran annoncent le message. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:top-5 lg:right-5 lg:bottom-auto lg:items-end print:hidden"
      >
        {toasts.map((toast) => {
          const [Icon, style] = STYLES[toast.tone]
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${style}`}
            >
              <Icon size={22} className="shrink-0" aria-hidden />
              <p className="flex-1 text-[15px] font-medium text-slate-800">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fermer la notification"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
