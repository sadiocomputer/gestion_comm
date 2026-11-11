import type { ReactNode } from 'react'

const TONES = {
  error: 'bg-red-50 text-red-700',
  success: 'bg-green-50 text-green-800',
  info: 'bg-blue-50 text-blue-800',
}

export function Alert({
  tone,
  children,
}: {
  tone: keyof typeof TONES
  children: ReactNode
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${TONES[tone]}`}
    >
      {children}
    </p>
  )
}
