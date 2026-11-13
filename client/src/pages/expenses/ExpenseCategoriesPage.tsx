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
import { api, getErrorMessage, type ExpenseCategory } from '../../lib/api'

const INPUT_CLASSES =
  'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none'

/** Catégories de dépenses : ajout, renommage et suppression sur place. */
export function ExpenseCategoriesPage() {
  const auth = useAuth()
  const toast = useToast()
  const canEdit = auth.can('expenses.create')

  const [categories, setCategories] = useState<ExpenseCategory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [toDelete, setToDelete] = useState<ExpenseCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ExpenseCategory[]>('/expense-categories')
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
      await api.post('/expense-categories', { name })
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
      await api.patch(`/expense-categories/${id}`, { name: editName.trim() })
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
      await api.delete(`/expense-categories/${toDelete.id}`)
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
        title="Catégories de dépenses"
        description="Pour savoir où part votre argent (loyer, transport, salaires…)."
        icon={Tags}
        tone="orange"
        back={{ to: '/expenses', label: 'Dépenses' }}
      />

      {canEdit && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Nom de la nouvelle catégorie"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouvelle catégorie, ex. Gardiennage"
                required
                minLength={2}
                maxLength={60}
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
          <EmptyState icon={Tags} tone="orange" title="Aucune catégorie pour le moment" />
        </Card>
      )}

      {categories && categories.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                <IconBubble icon={Tag} tone="orange" size="sm" />
                {editingId === c.id ? (
                  <>
                    <input
                      aria-label="Nouveau nom"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
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
                        {c.expenseCount > 0 ? `${c.expenseCount} dépense${c.expenseCount > 1 ? 's' : ''}` : 'Aucune dépense'}
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
          toDelete && toDelete.expenseCount > 0
            ? `« ${toDelete.name} » contient ${toDelete.expenseCount} dépense(s) : elle ne peut pas être supprimée, mais vous pouvez la renommer.`
            : `La catégorie « ${toDelete?.name ?? ''} » sera supprimée définitivement.`
        }
        confirmLabel="Supprimer"
        icon={Trash2}
        loading={deleting}
        confirmDisabled={Boolean(toDelete && toDelete.expenseCount > 0)}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
