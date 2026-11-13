import { CloudDownload, RefreshCw, TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { EmptyState } from './EmptyState'

/**
 * Le fichier d'un écran n'a pas pu être téléchargé : soit la connexion a
 * coupé, soit une nouvelle version a été mise en ligne (l'ancien fichier
 * n'existe plus sur le serveur).
 */
function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(
    error.message,
  )
}

type State = { error: Error | null }

/**
 * Filet de sécurité autour de chaque écran : au lieu d'une page blanche,
 * un message clair et un bouton « Recharger ». Le menu reste utilisable.
 * (Les « error boundaries » de React doivent être des classes.)
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur dans un écran :', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const chunk = isChunkLoadError(error)
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          icon={chunk ? CloudDownload : TriangleAlert}
          tone={chunk ? 'blue' : 'red'}
          title={chunk ? 'Nouvelle version disponible' : 'Cet écran a rencontré un problème'}
          description={
            chunk
              ? "L'application a été mise à jour, ou la connexion a été coupée. Rechargez pour continuer."
              : 'Rechargez la page. Si le problème revient, prévenez l’administrateur.'
          }
          action={
            <Button icon={RefreshCw} size="lg" onClick={() => window.location.reload()}>
              Recharger
            </Button>
          }
        />
      </Card>
    )
  }
}
