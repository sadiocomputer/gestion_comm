import { Check, PencilLine, Plus, Tag, Tags, Trash2 } from 'lucide-react'
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
import { api, getErrorMessage, type Category } from '../../lib/api'

const INPUT_CLASSES =
  'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none'

/** Catégories : ajout, renommage et suppression sur place. */
export function CategoriesPage() {
  const auth = useAuth()
  const toast = useToast()
  const canEdit = auth.can('products.update')

  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Category[]>('/categories')
      setCategories(data)
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
      await api.post('/categories', { name })
      toast.success(`Catégorie « ${name} » ajoutée`)
      setNewName('')
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRename(id: number) {
    try {
      await api.patch(`/categories/${id}`, { name: editName.trim() })
      toast.success('Catégorie renommée')
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
      await api.delete(`/categories/${toDelete.id}`)
      toast.success(`Catégorie « ${toDelete.name} » supprimée`)
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
        title="Catégories"
        description="Rangez vos produits par famille (boissons, riz, quincaillerie…)."
        icon={Tags}
        tone="violet"
        back={{ to: '/products', label: 'Produits' }}
      />

      {canEdit && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Nom de la nouvelle catégorie"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouvelle catégorie, ex. Boissons"
                required
                minLength={2}
                maxLength={80}
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
      {!categories && !error && <LoadingState />}

      {categories && categories.length === 0 && (
        <Card>
          <EmptyState
            icon={Tags}
            tone="violet"
            title="Aucune catégorie pour le moment"
            description="Les catégories sont facultatives, mais elles aident à retrouver vos produits."
          />
        </Card>
      )}

      {categories && categories.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                <IconBubble icon={Tag} tone="violet" size="sm" />
                {editingId === c.id ? (
                  <>
                    <input
                      aria-label="Nouveau nom"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={80}
                      autoFocus
                      className={`${INPUT_CLASSES} flex-1 basis-48`}
                    />
                    <Button icon={Check} onClick={() => void handleRename(c.id)} disabled={editName.trim().length < 2}>
                      Enregistrer
                    </Button>
                    <CancelButton onClick={() => setEditingId(null)} />
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">
                        {c.productCount} produit{c.productCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={PencilLine}
                          onClick={() => {
                            setEditingId(c.id)
                            setEditName(c.name)
                          }}
                        >
                          Renommer
                        </Button>
                        <Button variant="ghost" size="sm" icon={Trash2} className="text-red-700 hover:bg-red-50" onClick={() => setToDelete(c)}>
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
        title="Supprimer cette catégorie ?"
        message={
          toDelete && toDelete.productCount > 0
            ? `« ${toDelete.name} » contient ${toDelete.productCount} produit(s) : changez-les de catégorie avant de la supprimer.`
            : `La catégorie « ${toDelete?.name ?? ''} » sera supprimée définitivement.`
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
