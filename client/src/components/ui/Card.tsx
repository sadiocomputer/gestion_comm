import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { IconBubble, type Tone } from './IconBubble'

/** Surface blanche de base : toutes les sections de page l'utilisent. */
export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  )
}

type CardHeaderProps = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  actions?: ReactNode
}

export function CardHeader({ title, description, icon, tone = 'blue', actions }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      {icon && <IconBubble icon={icon} tone={tone} size="sm" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`px-5 py-5 sm:px-6 ${className}`}>{children}</div>
}
