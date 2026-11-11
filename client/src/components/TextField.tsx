import type { InputHTMLAttributes } from 'react'

type TextFieldProps = { label: string } & InputHTMLAttributes<HTMLInputElement>

/** Champ de formulaire avec libellé, au style commun de l'application. */
export function TextField({ label, ...inputProps }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        {...inputProps}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-600 focus:outline-none"
      />
    </label>
  )
}
