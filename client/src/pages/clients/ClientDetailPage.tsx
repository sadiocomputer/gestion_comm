import { CalendarDays, FileText, MapPin, PencilLine, Phone, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { ClientAccountSection } from '../../components/payments/AccountSections'
import { PaymentStateBadge } from '../../components/payments/PaymentWidgets'
import { SaleStatusBadge } from '../../components/sales/SaleBadges'
import { ArchiveSection } from '../../components/ui/ArchiveSection'
import { Avatar } from '../../components/ui/Avatar'
import { BackLink } from '../../components/ui/BackLink'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { InfoList } from '../../components/ui/InfoList'
import { LoadingState } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { api, getErrorMessage, type Client, type Paginated, type SaleSummary } from '../../lib/api'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '../../lib/format'

/** Les ventes du client, 10 par page (les plus récentes d'abord). */
function ClientSales({ clientId }: { clientId: number }) {
  const [page, setPage] = useState(1)
  const [sales, setSales] = useState<Paginated<SaleSummary> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Paginated<SaleSummary>>('/sales', { params: { clientId, page, limit: 10 } })
      .then(({ data }) => {
        if (!cancelled) setSales(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [clientId, page])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!sales) return <LoadingState />
  if (sales.data.length === 0) {
    return <p className="text-[15px] text-slate-500">Ce client n'a encore rien acheté.</p>
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {sales.data.map((sale) => (
          <li key={sale.id}>
            <Link to={`/sales/${sale.id}`} className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 hover:bg-slate-50">
              <span className="font-semibold text-slate-900">{sale.number}</span>
              <span className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</span>
              {sale.status === 'CANCELLED' ? <SaleStatusBadge status={sale.status} /> : <PaymentStateBadge state={sale.paymentStatus} />}
              <span className="ml-auto font-bold text-slate-900">{formatMoney(sale.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} total={sales.total} limit={sales.limit} itemLabel={['vente', 'ventes']} onPage={setPage} />
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Client>(`/clients/${id}`)
      .then(({ data }) => {
        if (!cancelled) setClient(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function setActive(isActive: boolean) {
    const { data } = await api.patch<Client>(`/clients/${id}/status`, { isActive })
    setClient(data)
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/clients" label="Clients" />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }
  if (!client) return <LoadingState />

  const canUpdate = auth.can('clients.update')

  return (
    <div className="space-y-6">
      <BackLink to="/clients" label="Clients" />

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={client.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{client.name}</h1>
            {!client.isActive && <Badge>Archivé</Badge>}
          </div>
          <p className="text-[15px] text-slate-500">Client depuis le {formatDate(client.createdAt)}</p>
        </div>
        {canUpdate && (
          <ButtonLink to={`/clients/${client.id}/edit`} variant="secondary" icon={PencilLine}>
            Modifier
          </ButtonLink>
        )}
      </div>

      {auth.can('payments.read') && <ClientAccountSection clientId={client.id} />}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader icon={Phone} title="Coordonnées" />
          <CardBody>
            <InfoList
              items={[
                {
                  icon: Phone,
                  label: 'Téléphone',
                  value: client.phone && (
                    <a href={`tel:+224${client.phone}`} className="text-blue-700 hover:underline">
                      {formatPhone(client.phone)}
                    </a>
                  ),
                },
                { icon: MapPin, label: 'Adresse', value: client.address },
                { icon: CalendarDays, label: 'Client depuis', value: formatDate(client.createdAt) },
                { icon: StickyNote, label: 'Notes', value: client.notes, wide: true },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={FileText} tone="violet" title="Achats" description="Les plus récents d'abord." />
          <CardBody>
            {auth.can('sales.read') ? (
              <ClientSales clientId={client.id} />
            ) : (
              <p className="text-[15px] text-slate-500">Vous n'avez pas accès à l'historique des ventes.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {canUpdate && (
        <ArchiveSection
          active={client.isActive}
          noun="ce client"
          archivedHint="Le client n'apparaîtra plus dans la liste ni dans les ventes, mais son historique est conservé."
          onChange={setActive}
        />
      )}
    </div>
  )
}
