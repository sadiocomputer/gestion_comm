import { CircleCheck, HandCoins, PackageOpen, ShoppingBag, Wallet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import {
  api,
  getErrorMessage,
  type ClientAccount,
  type Paginated,
  type SupplierAccount,
  type SupplierPayment,
  type SupplierPurchase,
} from '../../lib/api'
import { formatDate, formatDateTime, formatMoney, formatQuantity } from '../../lib/format'
import { Alert } from '../Alert'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { LoadingState } from '../ui/Loading'
import { Modal } from '../ui/Modal'
import { Pagination } from '../ui/Pagination'
import { StatCard } from '../ui/StatCard'
import { useToast } from '../ui/useToast'
import { PaymentForm, PaymentList } from './PaymentWidgets'

/** Taille des pages dans les fiches client / fournisseur. */
const PAGE_SIZE = 10

/**
 * Charge une liste paginée. `refresh` : changer sa valeur recharge la page
 * (ex. après un paiement). Les anciennes lignes restent affichées pendant le
 * chargement de la page suivante : pas de clignotement.
 */
function usePagedList<T>(url: string, page: number, refresh = 0) {
  const [result, setResult] = useState<Paginated<T> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<T>>(url, { params: { page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (!cancelled) {
          setResult(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [url, page, refresh])

  return { result, error }
}

/** Compte client : ce qu'il a acheté, payé, et ce qu'il doit encore. */
export function ClientAccountSection({ clientId }: { clientId: number }) {
  const [page, setPage] = useState(1)
  const [account, setAccount] = useState<ClientAccount | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<ClientAccount>(`/clients/${clientId}/account`, { params: { page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (!cancelled) setAccount(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [clientId, page])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!account) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total des achats" value={formatMoney(account.totalSales)} icon={ShoppingBag} tone="blue" />
        <StatCard label="Déjà payé" value={formatMoney(account.totalPaid)} icon={Wallet} tone="green" />
        <StatCard
          label={account.balance > 0 ? 'Il me doit' : 'Il ne doit rien'}
          value={formatMoney(account.balance)}
          icon={account.balance > 0 ? HandCoins : CircleCheck}
          tone={account.balance > 0 ? 'red' : 'green'}
        />
      </div>

      {account.unpaidCount > 0 && (
        <Card>
          <CardHeader
            icon={HandCoins}
            tone="orange"
            title="Factures à encaisser"
            description="Ouvrez une facture pour encaisser ce qui reste."
          />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {account.unpaidSales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    to={`/sales/${sale.id}`}
                    className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{sale.number}</span>
                    <span className="text-sm text-slate-500">
                      {formatDate(sale.createdAt)} · payé {formatMoney(sale.amountPaid)} sur {formatMoney(sale.total)}
                    </span>
                    <span className="ml-auto font-bold text-red-700">reste {formatMoney(sale.balance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Pagination
                page={page}
                total={account.unpaidCount}
                limit={account.limit}
                itemLabel={['facture à encaisser', 'factures à encaisser']}
                onPage={setPage}
              />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

/** Compte fournisseur : achats, paiements, dette et paiement. */
export function SupplierAccountSection({ supplierId }: { supplierId: number }) {
  const auth = useAuth()
  const toast = useToast()
  const [account, setAccount] = useState<SupplierAccount | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  // Incrémenté après un paiement ou une annulation : recharge la liste des paiements.
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<SupplierAccount>(`/suppliers/${supplierId}/account`)
      setAccount(data)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [supplierId])

  useEffect(() => {
    void load()
  }, [load])

  function handleChange(message: string) {
    toast.success(message)
    setPayOpen(false)
    setRefresh((n) => n + 1)
    void load()
  }

  if (error) return <Alert tone="error">{error}</Alert>
  if (!account) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total des achats" value={formatMoney(account.totalPurchases)} icon={PackageOpen} tone="blue" />
        <StatCard label="Déjà payé" value={formatMoney(account.totalPaid)} icon={Wallet} tone="green" />
        <StatCard
          label={account.balance > 0 ? 'Je lui dois' : 'Je ne lui dois rien'}
          value={formatMoney(account.balance)}
          icon={account.balance > 0 ? HandCoins : CircleCheck}
          tone={account.balance > 0 ? 'red' : 'green'}
        />
      </div>

      {account.balance > 0 && auth.can('supplier_payments.create') && (
        <Button variant="success" size="lg" icon={HandCoins} onClick={() => setPayOpen(true)}>
          Payer ce fournisseur
        </Button>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader icon={Wallet} tone="green" title="Paiements" description="Les plus récents d'abord." />
          <CardBody>
            <SupplierPaymentsList supplierId={supplierId} refresh={refresh} onChanged={handleChange} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={PackageOpen} title="Achats" description="Entrées de stock de ce fournisseur, les plus récentes d'abord." />
          <CardBody>
            <SupplierPurchasesList supplierId={supplierId} />
          </CardBody>
        </Card>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Payer le fournisseur">
        <PaymentForm
          key={account.balance}
          endpoint={`/suppliers/${supplierId}/payments`}
          max={account.balance}
          submitLabel="Enregistrer le paiement"
          onDone={handleChange}
        />
      </Modal>
    </div>
  )
}

/** Paiements faits au fournisseur, 10 par page, avec annulation. */
function SupplierPaymentsList({
  supplierId,
  refresh,
  onChanged,
}: {
  supplierId: number
  refresh: number
  onChanged: (message: string) => void
}) {
  const [page, setPage] = useState(1)
  const { result, error } = usePagedList<SupplierPayment>(`/suppliers/${supplierId}/payments`, page, refresh)

  if (error) return <Alert tone="error">{error}</Alert>
  if (!result) return <LoadingState />

  return (
    <div className="space-y-4">
      <PaymentList payments={result.data} cancelBase="/supplier-payments" onChanged={onChanged} />
      {result.total > 0 && (
        <Pagination page={page} total={result.total} limit={result.limit} itemLabel={['paiement', 'paiements']} onPage={setPage} />
      )}
    </div>
  )
}

/** Achats (entrées de stock) chez le fournisseur, 10 par page. */
function SupplierPurchasesList({ supplierId }: { supplierId: number }) {
  const [page, setPage] = useState(1)
  const { result, error } = usePagedList<SupplierPurchase>(`/suppliers/${supplierId}/purchases`, page)

  if (error) return <Alert tone="error">{error}</Alert>
  if (!result) return <LoadingState />
  if (result.total === 0) return <p className="text-[15px] text-slate-500">Aucun achat enregistré.</p>

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {result.data.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
            <div className="min-w-0 flex-1">
              <Link to={`/products/${p.product.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                {p.product.name}
              </Link>
              <p className="text-sm text-slate-500">
                {formatQuantity(p.quantity, p.product.unit)} · {formatDateTime(p.createdAt)}
              </p>
            </div>
            <span className={p.total != null ? 'font-bold text-slate-900' : 'text-sm text-slate-400'}>
              {p.total != null ? formatMoney(p.total) : 'prix non saisi'}
            </span>
          </li>
        ))}
      </ul>
      <Pagination page={page} total={result.total} limit={result.limit} itemLabel={['achat', 'achats']} onPage={setPage} />
    </div>
  )
}
