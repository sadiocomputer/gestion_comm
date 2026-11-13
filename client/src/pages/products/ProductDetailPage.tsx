import { Coins, History, Package, PencilLine, Tag, TrendingUp, Warehouse } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { MovementsTable } from '../../components/stock/MovementsTable'
import { StockActions } from '../../components/stock/StockActions'
import { isLowStock, StockBadge } from '../../components/stock/StockBadge'
import { ArchiveSection } from '../../components/ui/ArchiveSection'
import { BackLink } from '../../components/ui/BackLink'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { IconBubble } from '../../components/ui/IconBubble'
import { LoadingState } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type Paginated, type Product, type StockMovement } from '../../lib/api'
import { formatMoney, formatQuantity } from '../../lib/format'

export function ProductDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const toast = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<Paginated<StockMovement> | null>(null)
  const [movementsPage, setMovementsPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const canReadStock = auth.can('stock.read')
  const canUpdate = auth.can('products.update')
  const canSeeCost = auth.can('products.read_cost')

  const loadProduct = useCallback(async () => {
    try {
      const { data } = await api.get<Product>(`/products/${id}`)
      setProduct(data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [id])

  const loadMovements = useCallback(async () => {
    if (!canReadStock) return
    try {
      const { data } = await api.get<Paginated<StockMovement>>('/stock-movements', {
        params: { productId: id, page: movementsPage, limit: 10 },
      })
      setMovements(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [id, movementsPage, canReadStock, toast])

  useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  useEffect(() => {
    void loadMovements()
  }, [loadMovements])

  function handleStockDone(message: string) {
    toast.success(message)
    setMovementsPage(1)
    void loadProduct()
    void loadMovements()
  }

  async function setActive(isActive: boolean) {
    const { data } = await api.patch<Product>(`/products/${id}/status`, { isActive })
    setProduct(data)
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/products" label="Produits" />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }
  if (!product) return <LoadingState />

  const low = isLowStock(product)
  const out = product.quantity <= 0

  return (
    <div className="space-y-6">
      <BackLink to="/products" label="Produits" />

      <div className="flex flex-wrap items-center gap-4">
        <IconBubble icon={Package} tone="blue" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{product.name}</h1>
            <StockBadge quantity={product.quantity} minStock={product.minStock} unit={product.unit} />
            {!product.isActive && <Badge>Archivé</Badge>}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 text-[15px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Tag size={15} aria-hidden /> {product.category?.name ?? 'Sans catégorie'}
            </span>
            {product.sku && <span>Réf. {product.sku}</span>}
          </p>
        </div>
        {canUpdate && (
          <ButtonLink to={`/products/${product.id}/edit`} variant="secondary" icon={PencilLine}>
            Modifier
          </ButtonLink>
        )}
      </div>

      <div className={`grid gap-4 ${canSeeCost ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <StatCard
          label="En stock"
          value={formatQuantity(product.quantity, product.unit)}
          icon={Warehouse}
          tone={out ? 'red' : low ? 'orange' : 'green'}
          hint={
            out
              ? 'Rupture : à racheter'
              : product.minStock > 0
                ? `Alerte à ${formatQuantity(product.minStock, product.unit)}`
                : undefined
          }
        />
        <StatCard label="Prix de vente" value={formatMoney(product.salePrice)} icon={Coins} tone="blue" hint={`par ${product.unit}`} />
        {canSeeCost && product.purchasePrice != null && (
          <StatCard
            label="Bénéfice par unité"
            value={formatMoney(product.salePrice - product.purchasePrice)}
            icon={TrendingUp}
            tone={product.salePrice >= product.purchasePrice ? 'green' : 'red'}
            hint={`Acheté ${formatMoney(product.purchasePrice)}`}
          />
        )}
      </div>

      <StockActions product={product} onDone={handleStockDone} />

      {canReadStock && movements && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <IconBubble icon={History} tone="slate" size="sm" />
            <h2 className="text-lg font-semibold text-slate-900">Historique du stock</h2>
          </div>
          {movements.data.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-[15px] text-slate-500">Aucun mouvement pour ce produit.</p>
              </CardBody>
            </Card>
          ) : (
            <>
              <MovementsTable movements={movements.data} />
              <Pagination
                page={movementsPage}
                total={movements.total}
                limit={movements.limit}
                itemLabel={['mouvement', 'mouvements']}
                onPage={setMovementsPage}
              />
            </>
          )}
        </section>
      )}

      {canUpdate && (
        <ArchiveSection
          active={product.isActive}
          noun="ce produit"
          archivedHint="Le produit ne pourra plus être vendu ni recevoir de stock, mais son historique est conservé."
          onChange={setActive}
        />
      )}

    </div>
  )
}
