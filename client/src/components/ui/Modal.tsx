import { ArrowLeft, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { CancelButton } from './BackLink'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, type ButtonVariant } from './Button'
import { IconBubble, type Tone } from './IconBubble'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Fenêtre par-dessus la page. Sur téléphone elle monte du bas de l'écran
 * (plus facile à atteindre au pouce), sur ordinateur elle est centrée.
 * Échap ou un clic sur le fond la ferment.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Place le focus dans la fenêtre (premier champ ou bouton).
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-close])',
    )
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="flex-1 text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

type ConfirmProps = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'danger' | 'primary' | 'success'
  icon?: LucideIcon
  loading?: boolean
  /** Contenu supplémentaire (ex. champ « motif »). */
  children?: ReactNode
  confirmDisabled?: boolean
}

const CONFIRM_TONE: Record<NonNullable<ConfirmProps['tone']>, [ButtonVariant, Tone]> = {
  danger: ['danger', 'red'],
  primary: ['primary', 'blue'],
  success: ['success', 'green'],
}

/** Confirmation avant une opération sensible (annuler, désactiver…). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
  icon = TriangleAlert,
  loading,
  children,
  confirmDisabled,
}: ConfirmProps) {
  const [variant, bubbleTone] = CONFIRM_TONE[tone]
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <CancelButton label="Retour" icon={ArrowLeft} onClick={onCancel} disabled={loading} />
          <Button variant={variant} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <IconBubble icon={icon} tone={bubbleTone} />
        <div className="min-w-0 flex-1 space-y-4 text-[15px] text-slate-600">
          <div>{message}</div>
          {children}
        </div>
      </div>
    </Modal>
  )
}
