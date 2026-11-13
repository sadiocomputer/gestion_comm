import { Coins, Package, PackagePlus, Plus, Save, Warehouse } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { TextField } from '../../components/TextField'
import { CancelButton } from '../../components/ui/BackLink'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Chips } from '../../components/ui/Chips'
import { SelectField } from '../../components/ui/Fields'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type Category, type Product, type Unit } from '../../lib/api'
import { formatMoney } from '../../lib/format'

/** "2,5" -> 2.5 ; "" -> undefined */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.')
  return trimmed === '' ? undefined : Number(trimmed)
}

/** /products/new (création) et /products/:id/edit (modification). */
export function ProductFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const canSeeCost = auth.can('products.read_cost')
  const backTo = isNew ? '/products' : `/products/${id}`

  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [addingUnit, setAddingUnit] = useState(false)
  const [newUnit, setNewUnit] = useState('')
  const [savingUnit, setSavingUnit] = useState(false)
  const canManageUnits = auth.can('products.update')
  const [loaded, setLoaded] = useState(isNew)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState('pièce')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [minStock, setMinStock] = useState('')
  const [initialQuantity, setInitialQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get<Category[]>('/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]))
    api
      .get<Unit[]>('/units')
      .then(({ data }) => setUnits(data))
      .catch(() => setUnits([]))
  }, [])

  /** Ajoute une unité à la liste (Produits > Unités) et la sélectionne. */
  async function addUnit() {
    const name = newUnit.trim()
    if (!name) return
    setSavingUnit(true)
    try {
      const { data } = await api.post<Unit>('/units', { name })
      setUnits((current) => [...current, { ...data, productCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      setUnit(data.name)
      setNewUnit('')
      setAddingUnit(false)
      toast.success(`Unité « ${data.name} » ajoutée`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingUnit(false)
    }
  }

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    api
      .get<Product>(`/products/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setName(data.name)
        setSku(data.sku ?? '')
        setCategoryId(data.categoryId ? String(data.categoryId) : '')
        setUnit(data.unit)
        setPurchasePrice(data.purchasePrice != null ? String(data.purchasePrice) : '')
        setSalePrice(String(data.salePrice))
        setMinStock(data.minStock ? String(data.minStock) : '')
        setLoaded(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const body: Record<string, unknown> = {
      name,
      sku: sku.trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
      unit: unit.trim() || 'pièce',
      salePrice: toNumber(salePrice) ?? 0,
      minStock: toNumber(minStock) ?? 0,
    }
    if (canSeeCost) body.purchasePrice = toNumber(purchasePrice) ?? 0
    if (isNew) body.initialQuantity = toNumber(initialQuantity)

    setSubmitting(true)
    try {
      const { data } = isNew
        ? await api.post<Product>('/products', body)
        : await api.patch<Product>(`/products/${id}`, body)
      toast.success(isNew ? 'Produit ajouté' : 'Produit modifié')
      navigate(`/products/${data.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const sale = toNumber(salePrice)
  const cost = toNumber(purchasePrice)
  const margin = canSeeCost && sale !== undefined && cost !== undefined ? sale - cost : null
  // Unités proposées : la liste configurée (+ l'unité actuelle d'un ancien
  // produit si elle n'y figure pas, pour ne pas la perdre).
  const unitNames = units.map((u) => u.name)
  if (unit && !unitNames.some((n) => n.toLowerCase() === unit.toLowerCase())) unitNames.push(unit)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isNew ? 'Nouveau produit' : 'Modifier le produit'}
        icon={isNew ? PackagePlus : Package}
        back={{ to: backTo, label: isNew ? 'Produits' : 'Fiche produit' }}
      />

      {!loaded && !error && <LoadingState />}
      {!loaded && error && <Alert tone="error">{error}</Alert>}

      {loaded && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader icon={Package} title="Le produit" />
            <CardBody className="space-y-5">
              <TextField
                label="Nom du produit"
                required
                minLength={2}
                maxLength={150}
                placeholder="Ex. Riz parfumé 25 kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Se vend à la / au…</p>
                <Chips
                  label="Unité de vente"
                  options={unitNames.map((u) => ({ value: u, label: u }))}
                  value={unit}
                  onChange={setUnit}
                />
                {canManageUnits &&
                  (addingUnit ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="sm:w-64">
                        <TextField
                          label="Nouvelle unité"
                          maxLength={20}
                          placeholder="Ex. bidon, seau, tas"
                          value={newUnit}
                          onChange={(e) => setNewUnit(e.target.value)}
                          onKeyDown={(e) => {
                            // Entrée ajoute l'unité au lieu d'enregistrer le produit.
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void addUnit()
                            }
                          }}
                        />
                      </div>
                      <Button icon={Plus} loading={savingUnit} disabled={!newUnit.trim()} onClick={() => void addUnit()}>
                        Ajouter
                      </Button>
                      <CancelButton onClick={() => setAddingUnit(false)} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingUnit(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
                    >
                      <Plus size={16} aria-hidden /> Unité absente ? L'ajouter à la liste
                    </button>
                  ))}
                {!unit && <p className="mt-2 text-sm text-red-700">Choisissez une unité.</p>}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Catégorie" hint="Facultatif" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Référence / code-barres" hint="Facultatif" maxLength={50} value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Coins} tone="green" title="Prix" />
            <CardBody className="space-y-4">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label={`Prix de vente par ${unit || 'unité'} (GNF)`}
                  inputMode="numeric"
                  required
                  placeholder="Ex. 310000"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, ''))}
                  hint={sale ? formatMoney(sale) : undefined}
                />
                {canSeeCost && (
                  <TextField
                    label={`Prix d'achat par ${unit || 'unité'} (GNF)`}
                    inputMode="numeric"
                    placeholder="Ex. 280000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value.replace(/\D/g, ''))}
                    hint={cost ? formatMoney(cost) : 'Visible uniquement par les personnes autorisées.'}
                  />
                )}
              </div>
              {margin !== null && (
                <Alert tone={margin < 0 ? 'error' : margin === 0 ? 'warning' : 'success'}>
                  {margin < 0
                    ? `Attention : vous perdez ${formatMoney(-margin)} par ${unit || 'unité'} vendu(e).`
                    : `Bénéfice : ${formatMoney(margin)} par ${unit || 'unité'} vendu(e).`}
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Warehouse} tone="orange" title="Stock" />
            <CardBody className="space-y-4">
              <div className="grid gap-5 sm:grid-cols-2">
                {isNew && (
                  <TextField
                    label={`Quantité en stock aujourd'hui (${unit || 'unité'})`}
                    inputMode="decimal"
                    placeholder="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value)}
                  />
                )}
                <TextField
                  label={`M'alerter quand il reste (${unit || 'unité'})`}
                  inputMode="decimal"
                  placeholder="Ex. 5"
                  hint="Laissez vide pour ne pas être alerté."
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
              {!isNew && (
                <p className="text-sm text-slate-500">
                  Pour changer la quantité en stock, utilisez « Mettre à jour le stock » sur la fiche du produit : l'historique est ainsi conservé.
                </p>
              )}
            </CardBody>
          </Card>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <CancelButton to={backTo} />
            <Button type="submit" size="lg" icon={Save} loading={submitting}>
              {isNew ? 'Ajouter le produit' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
