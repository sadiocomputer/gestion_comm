import { Check, PencilLine, Plus, Ruler, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { CancelButton } from '../../components/ui/BackLink'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { ConfirmDialog } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type Unit } from '../../lib/api'

const INPUT_CLASSES =
  'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none'

/** Unités de vente proposées dans le formulaire produit. */
export function UnitsPage() {
  const auth = useAuth()
  const toast = useToast()
  const canEdit = auth.can('products.update')

  const [units, setUnits] = useState<Unit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [toDelete, setToDelete] = useState<Unit | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Unit[]>('/units')
      setUnits(data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    setAdding(true)
    try {
      await api.post('/units', { name })
      toast.success(`Unité « ${name} » ajoutée`)
      setNewName('')
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRename(unit: Unit) {
    try {
      await api.patch(`/units/${unit.id}`, { name: editName.trim() })
      toast.success(
        unit.productCount > 0
          ? `Unité renommée (${unit.productCount} produit(s) mis à jour)`
          : 'Unité renommée',
      )
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/units/${toDelete.id}`)
      toast.success(`Unité « ${toDelete.name} » supprimée`)
      setToDelete(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Unités de vente"
        description="Les unités proposées quand vous créez un produit (sac, carton, kg…)."
        icon={Ruler}
        tone="orange"
        back={{ to: '/products', label: 'Produits' }}
      />

      {canEdit && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Nom de la nouvelle unité"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouvelle unité, ex. bidon, seau, tas"
                required
                maxLength={20}
                className={INPUT_CLASSES}
              />
              <Button type="submit" icon={Plus} loading={adding}>
                Ajouter
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {!units && !error && <LoadingState />}

      {units && units.length === 0 && (
        <Card>
          <EmptyState
            icon={Ruler}
            tone="orange"
            title="Aucune unité pour le moment"
            description="Ajoutez les unités dans lesquelles vous vendez : pièce, sac, kg, carton…"
          />
        </Card>
      )}

      {units && units.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {units.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                <IconBubble icon={Ruler} tone="orange" size="sm" />
                {editingId === u.id ? (
                  <>
                    <input
                      aria-label="Nouveau nom"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      autoFocus
                      className={`${INPUT_CLASSES} flex-1 basis-40`}
                    />
                    <Button icon={Check} onClick={() => void handleRename(u)} disabled={editName.trim().length < 1}>
                      Enregistrer
                    </Button>
                    <CancelButton onClick={() => setEditingId(null)} />
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-sm text-slate-500">
                        {u.productCount > 0
                          ? `${u.productCount} produit${u.productCount > 1 ? 's' : ''}`
                          : 'Aucun produit'}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={PencilLine}
                          onClick={() => {
                            setEditingId(u.id)
                            setEditName(u.name)
                          }}
                        >
                          Renommer
                        </Button>
                        <Button variant="ghost" size="sm" icon={Trash2} className="text-red-700 hover:bg-red-50" onClick={() => setToDelete(u)}>
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette unité ?"
        message={
          toDelete && toDelete.productCount > 0
            ? `« ${toDelete.name} » est utilisée par ${toDelete.productCount} produit(s) : changez-leur d'unité avant de la supprimer.`
            : `L'unité « ${toDelete?.name ?? ''} » ne sera plus proposée dans le formulaire produit.`
        }
        confirmLabel="Supprimer"
        icon={Trash2}
        loading={deleting}
        confirmDisabled={Boolean(toDelete && toDelete.productCount > 0)}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
