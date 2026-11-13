import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { FIELD_CLASSES, FieldShell } from '../TextField'

type Props = {
  label: string
  hint?: ReactNode
  error?: string | null
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Champ mot de passe avec bouton « afficher / masquer » (évite les fautes de frappe). */
export function PasswordField({ label, hint, error, id, ...rest }: Props) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [visible, setVisible] = useState(false)
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          {...rest}
          className={`${FIELD_CLASSES} pr-12 ${error ? 'border-red-400' : 'border-slate-300'}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute top-1/2 right-2 mt-[3px] -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
        </button>
      </div>
    </FieldShell>
  )
}
