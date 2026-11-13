import { House, MapPinOff } from 'lucide-react'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <EmptyState
        icon={MapPinOff}
        tone="slate"
        title="Page introuvable"
        description="Cette page n'existe pas ou a été déplacée."
        action={
          <ButtonLink to="/" icon={House}>
            Retour à l'accueil
          </ButtonLink>
        }
      />
    </main>
  )
}
