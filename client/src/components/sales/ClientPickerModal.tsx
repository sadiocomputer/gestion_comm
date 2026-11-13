import { UserPlus, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, getErrorMessage, type Client, type Paginated } from '../../lib/api'
import { formatPhone } from '../../lib/format'
import { Alert } from '../Alert'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/Fields'
import { IconBubble } from '../ui/IconBubble'
import { Spinner } from '../ui/Loading'
import { Modal } from '../ui/Modal'

/**
 * Choix du client de la vente : recherche, « client de passage », ou création
 * immédiate (sans quitter la vente en cours).
 */
export function ClientPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (client: Client | null) => void
}) {
  const auth = useAuth()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .get<Paginated<Client>>('/clients', {
          params: { search: term.trim() || undefined, status: 'active', limit: 8 },
        })
        .then(({ data }) => {
          if (!cancelled) setResults(data.data)
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term, open])

  function choose(client: Client | null) {
    onSelect(client)
    setTerm('')
    onClose()
  }

  async function createClient() {
    setCreating(true)
    setError(null)
    try {
      const { data } = await api.post<Client>('/clients', { name: term.trim() })
      choose(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const canCreate = auth.can('clients.create') && term.trim().length >= 2

  return (
    <Modal open={open} onClose={onClose} title="Choisir le client">
      <div className="space-y-4">
        <SearchInput value={term} onChange={setTerm} placeholder="Nom ou téléphone du client…" />

        <button
          type="button"
          onClick={() => choose(null)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-left hover:bg-slate-50"
        >
          <IconBubble icon={Users} tone="slate" size="sm" />
          <span>
            <span className="block font-semibold text-slate-900">Client de passage</span>
            <span className="block text-sm text-slate-500">Vente sans nom (payée en totalité)</span>
          </span>
        </button>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size={16} /> Recherche…
          </p>
        )}

        <ul className="space-y-2">
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => choose(client)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/50"
              >
                <IconBubble icon={UserRound} tone="blue" size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{client.name}</span>
                  <span className="block text-sm text-slate-500">
                    {client.phone ? formatPhone(client.phone) : 'Pas de téléphone'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {!loading && results.length === 0 && term.trim() && (
          <p className="text-[15px] text-slate-500">Aucun client trouvé pour « {term.trim()} ».</p>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        {canCreate && (
          <Button variant="secondary" icon={UserPlus} fullWidth loading={creating} onClick={() => void createClient()}>
            Créer le client « {term.trim()} »
          </Button>
        )}
      </div>
    </Modal>
  )
}
