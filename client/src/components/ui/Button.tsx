import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

export type ButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  // Bleu : action principale (Enregistrer, Vendre)
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800',
  // Vert : argent reçu (Encaisser)
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
  // Orange : attente (Voir ce qui reste à payer)
  warning: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:bg-amber-700',
  // Rouge : action sensible (Annuler, Supprimer)
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
}

// Hauteurs ≥ 44 px (md/lg) : confortables au doigt sur téléphone.
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-[15px]',
  lg: 'h-14 gap-2.5 px-6 text-base',
}

type StyleOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

/** Classes d'un bouton : utilisable aussi sur un <Link> ou un <a>. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: StyleOptions = {}) {
  return [
    'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap',
    'transition-colors disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')
}

type ContentProps = {
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  children?: ReactNode
  size?: ButtonSize
}

function Content({ icon: Icon, iconRight: IconRight, loading, children, size = 'md' }: ContentProps) {
  const iconSize = size === 'lg' ? 22 : size === 'sm' ? 16 : 18
  return (
    <>
      {loading ? (
        <LoaderCircle size={iconSize} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden />
      )}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleOptions & ContentProps

export function Button({
  variant,
  size,
  fullWidth,
  className,
  icon,
  iconRight,
  loading,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      <Content icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  )
}

type ButtonLinkProps = LinkProps & StyleOptions & Omit<ContentProps, 'loading'>

/** Lien qui a l'apparence d'un bouton (navigation vers une autre page). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  icon,
  iconRight,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </Link>
  )
}
