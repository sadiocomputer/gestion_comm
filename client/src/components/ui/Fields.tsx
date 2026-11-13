import { Search, X } from 'lucide-react'
import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { FIELD_CLASSES, FieldShell } from '../TextField'

type SelectFieldProps = {
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>

export function SelectField({ label, hint, error, id, children, ...rest }: SelectFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        {...rest}
        className={`${FIELD_CLASSES} pr-10 ${error ? 'border-red-400' : 'border-slate-300'}`}
      >
        {children}
      </select>
    </FieldShell>
  )
}

type TextAreaFieldProps = {
  label: string
  hint?: ReactNode
  error?: string | null
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextAreaField({ label, hint, error, id, rows = 3, ...rest }: TextAreaFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        {...rest}
        className={`${FIELD_CLASSES} h-auto py-3 ${error ? 'border-red-400' : 'border-slate-300'}`}
      />
    </FieldShell>
  )
}

/** Barre de recherche avec loupe et bouton d'effacement. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  label = 'Rechercher',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}) {
  return (
    <div className="relative w-full">
      <Search
        size={20}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block h-12 w-full rounded-xl border border-slate-300 bg-white pr-11 pl-12 text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  )
}
