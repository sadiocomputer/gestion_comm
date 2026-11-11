import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page introuvable</h1>
      <Link to="/" className="mt-6 inline-block text-blue-700 underline">
        Retour à l'accueil
      </Link>
    </main>
  )
}
