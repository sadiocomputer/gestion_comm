import { House, ShieldX } from 'lucide-react'
import { Outlet } from 'react-router'
import { ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import type { PermissionCode } from '../lib/permissions'
import { useAuth } from './useAuth'

type Props = {
  /** Une permission, ou une liste dont UNE seule suffit. */
  permission: PermissionCode | PermissionCode[]
}

/**
 * Enveloppe des routes réservées à une permission.
 * Confort d'affichage seulement : même en tapant l'URL, le backend renverrait 403.
 */
export function RequirePermission({ permission }: Props) {
  const auth = useAuth()
  const allowed = Array.isArray(permission)
    ? permission.some((p) => auth.can(p))
    : auth.can(permission)

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          icon={ShieldX}
          tone="red"
          title="Accès refusé"
          description="Vous n'avez pas le droit d'ouvrir cette page. Demandez à l'administrateur si vous en avez besoin."
          action={
            <ButtonLink to="/" variant="secondary" icon={House}>
              Retour à l'accueil
            </ButtonLink>
          }
        />
      </Card>
    )
  }

  return <Outlet />
}
