import { LoaderCircle } from 'lucide-react'

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={`animate-spin ${className}`} aria-hidden />
}

/** Zone de chargement : indique clairement que l'application travaille. */
export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner size={24} className="text-blue-600" />
      <span className="text-[15px]">{label}</span>
    </div>
  )
}

/** Squelette de chargement pour les cartes (évite les sauts d'affichage). */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  )
}
