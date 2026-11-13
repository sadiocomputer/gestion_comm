import { CircleAlert } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type TextFieldProps = {
  label: string
  /** Aide sous le champ (ex. « 8 caractères minimum »). */
  hint?: ReactNode
  /** Message d'erreur affiché sous le champ (bordure rouge). */
  error?: string | null
} & InputHTMLAttributes<HTMLInputElement>

export const FIELD_CLASSES =
  'mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500'

/** Libellé + aide + erreur : commun à tous les champs. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700">
          <CircleAlert size={16} aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Champ de saisie : grand, lisible, avec son libellé toujours visible. */
export function TextField({ label, hint, error, id, ...inputProps }: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        {...inputProps}
        className={`${FIELD_CLASSES} ${error ? 'border-red-400' : 'border-slate-300'}`}
      />
    </FieldShell>
  )
}
