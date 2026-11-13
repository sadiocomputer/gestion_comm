import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * État d'une liste (page, recherche, filtres) rangé dans l'URL :
 * on retrouve la liste telle qu'on l'a laissée en revenant d'une fiche.
 * La recherche est envoyée 300 ms après la dernière frappe.
 */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('q') ?? ''
  const [input, setInput] = useState(search)

  /** Modifie des paramètres (null = retirer). Revient en page 1 sauf si on change de page. */
  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          if (!('page' in changes)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = input.trim()
      if (value !== search) update({ q: value || null })
    }, 300)
    return () => clearTimeout(timer)
  }, [input, search, update])

  return {
    page,
    search,
    /** Texte en cours de saisie dans la barre de recherche. */
    input,
    setInput,
    get: (key: string) => searchParams.get(key),
    update,
    setPage: (p: number) => update({ page: String(p) }),
  }
}
