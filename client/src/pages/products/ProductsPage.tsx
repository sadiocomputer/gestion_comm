import { Package, PackagePlus, Ruler, SearchX, Tags, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { StockBadge } from '../../components/stock/StockBadge'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chips } from '../../components/ui/Chips'
import { DataList } from '../../components/ui/DataList'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/Fields'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { StatusChips, type ActiveFilter } from '../../components/ui/StatusChips'
import { api, getErrorMessage, type Category, type Paginated, type Product } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

export function ProductsPage() {
  const auth = useAuth()
  const canSeeCost = auth.can('products.read_cost')
  const list = useListParams()
  const status = (list.get('status') ?? 'active') as ActiveFilter
  const categoryId = list.get('category') ?? ''
  const lowStock = list.get('low') === '1'

  const [categories, setCategories] = useState<Category[]>([])
  const [result, setResult] = useState<Paginated<Product> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Category[]>('/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<Product>>('/products', {
        params: {
          page: list.page,
          limit: 20,
          status,
          search: list.search || undefined,
          categoryId: categoryId || undefined,
          lowStock: lowStock ? 'true' : undefined,
        },
      })
      .then(({ data }) => {
        if (cancelled) return
        setResult(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [list.page, list.search, status, categoryId, lowStock])

  const canCreate = auth.can('products.create')
  const filtered = Boolean(list.search) || status !== 'active' || Boolean(categoryId) || lowStock

  return (
    <div>
      <PageHeader
        title="Produits"
        description="Votre catalogue, vos prix et votre stock."
        icon={Package}
        actions={
          <>
            <ButtonLink to="/products/categories" variant="secondary" icon={Tags}>
              Catégories
            </ButtonLink>
            <ButtonLink to="/products/units" variant="secondary" icon={Ruler}>
              Unités
            </ButtonLink>
            {canCreate && (
              <ButtonLink to="/products/new" icon={PackagePlus}>
                Nouveau produit
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="mb-6 space-y-3">
        <SearchInput value={list.input} onChange={list.setInput} placeholder="Nom ou référence du produit…" />
        <div className="flex flex-wrap items-center gap-3">
          <Chips
            label="Stock"
            options={[
              { value: 'all', label: 'Tous les stocks' },
              { value: 'low', label: 'Stock bas', icon: TriangleAlert },
            ]}
            value={lowStock ? 'low' : 'all'}
            onChange={(v) => list.update({ low: v === 'low' ? '1' : null })}
          />
          <StatusChips value={status} onChange={(v) => list.update({ status: v === 'active' ? null : v })} />
          {categories.length > 0 && (
            <select
              aria-label="Catégorie"
              value={categoryId}
              onChange={(e) => list.update({ category: e.target.value || null })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!result && !error && <LoadingState />}

      {result && result.data.length === 0 && (
        <Card>
          {lowStock && !list.search ? (
            <EmptyState icon={Package} tone="green" title="Aucun produit en stock bas" description="Tout va bien, rien à racheter pour le moment." />
          ) : filtered ? (
            <EmptyState icon={SearchX} tone="slate" title="Aucun produit trouvé" />
          ) : (
            <EmptyState
              icon={Package}
              title="Aucun produit pour le moment"
              description="Ajoutez les articles que vous vendez avec leur prix et leur stock."
              action={
                canCreate && (
                  <ButtonLink to="/products/new" icon={PackagePlus} size="lg">
                    Ajouter mon premier produit
                  </ButtonLink>
                )
              }
            />
          )}
        </Card>
      )}

      {result && result.data.length > 0 && (
        <div className="space-y-4">
          <DataList
            rows={result.data}
            rowKey={(p) => p.id}
            rowHref={(p) => `/products/${p.id}`}
            isMuted={(p) => !p.isActive}
            columns={[
              {
                header: 'Produit',
                cell: (p) => (
                  <span className="flex items-center gap-3">
                    <IconBubble icon={Package} tone="blue" size="sm" />
                    <span>
                      <span className="block font-semibold text-slate-900">{p.name}</span>
                      <span className="block text-sm text-slate-500">
                        {[p.category?.name, p.sku].filter(Boolean).join(' · ') || 'Sans catégorie'}
                      </span>
                    </span>
                    {!p.isActive && <Badge>Archivé</Badge>}
                  </span>
                ),
              },
              { header: 'Stock', cell: (p) => <StockBadge quantity={p.quantity} minStock={p.minStock} unit={p.unit} /> },
              {
                header: 'Prix de vente',
                align: 'right',
                cell: (p) => (
                  <span>
                    <span className="font-bold text-slate-900">{formatMoney(p.salePrice)}</span>
                    <span className="block text-sm text-slate-500">par {p.unit}</span>
                  </span>
                ),
              },
              ...(canSeeCost
                ? [
                    {
                      header: "Prix d'achat",
                      align: 'right' as const,
                      hideOnTablet: true,
                      cell: (p: Product) => (p.purchasePrice != null ? formatMoney(p.purchasePrice) : '—'),
                    },
                  ]
                : []),
            ]}
            mobileCard={(p) => (
              <div className="flex items-center gap-3">
                <IconBubble icon={Package} tone="blue" size="sm" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-slate-900">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StockBadge quantity={p.quantity} minStock={p.minStock} unit={p.unit} />
                    {!p.isActive && <Badge>Archivé</Badge>}
                  </div>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block font-bold text-slate-900">{formatMoney(p.salePrice)}</span>
                  <span className="block text-xs text-slate-500">par {p.unit}</span>
                </p>
              </div>
            )}
          />
          <Pagination page={list.page} total={result.total} limit={result.limit} itemLabel={['produit', 'produits']} onPage={list.setPage} />
        </div>
      )}
    </div>
  )
}
