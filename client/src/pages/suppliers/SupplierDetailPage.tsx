import { Building2, CalendarDays, Contact, MapPin, PencilLine, Phone, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/Alert'
import { SupplierAccountSection } from '../../components/payments/AccountSections'
import { ArchiveSection } from '../../components/ui/ArchiveSection'
import { BackLink } from '../../components/ui/BackLink'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { IconBubble } from '../../components/ui/IconBubble'
import { InfoList } from '../../components/ui/InfoList'
import { LoadingState } from '../../components/ui/Loading'
import { api, getErrorMessage, type Supplier } from '../../lib/api'
import { formatDate, formatPhone } from '../../lib/format'

export function SupplierDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<Supplier>(`/suppliers/${id}`)
      .then(({ data }) => {
        if (!cancelled) setSupplier(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function setActive(isActive: boolean) {
    const { data } = await api.patch<Supplier>(`/suppliers/${id}/status`, { isActive })
    setSupplier(data)
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/suppliers" label="Fournisseurs" />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }
  if (!supplier) return <LoadingState />

  const canUpdate = auth.can('suppliers.update')
  // Lien d'appel : numéro guinéen (9 chiffres) ou déjà international (+…).
  const telHref = supplier.phone && (supplier.phone.startsWith('+') ? `tel:${supplier.phone}` : `tel:+224${supplier.phone}`)

  return (
    <div className="space-y-6">
      <BackLink to="/suppliers" label="Fournisseurs" />

      <div className="flex flex-wrap items-center gap-4">
        <IconBubble icon={Building2} tone="orange" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{supplier.name}</h1>
            {!supplier.isActive && <Badge>Archivé</Badge>}
          </div>
          <p className="text-[15px] text-slate-500">Fournisseur depuis le {formatDate(supplier.createdAt)}</p>
        </div>
        {canUpdate && (
          <ButtonLink to={`/suppliers/${supplier.id}/edit`} variant="secondary" icon={PencilLine}>
            Modifier
          </ButtonLink>
        )}
      </div>

      {auth.can('supplier_payments.read') && <SupplierAccountSection supplierId={supplier.id} />}

      <Card>
        <CardHeader icon={Phone} title="Coordonnées" />
        <CardBody>
          <InfoList
            items={[
              { icon: Contact, label: 'Personne à contacter', value: supplier.contactName },
              {
                icon: Phone,
                label: 'Téléphone',
                value: supplier.phone && telHref && (
                  <a href={telHref} className="text-blue-700 hover:underline">
                    {formatPhone(supplier.phone)}
                  </a>
                ),
              },
              { icon: MapPin, label: 'Adresse', value: supplier.address },
              { icon: CalendarDays, label: 'Fournisseur depuis', value: formatDate(supplier.createdAt) },
              { icon: StickyNote, label: 'Notes', value: supplier.notes, wide: true },
            ]}
          />
        </CardBody>
      </Card>

      {canUpdate && (
        <ArchiveSection
          active={supplier.isActive}
          noun="ce fournisseur"
          archivedHint="Le fournisseur n'apparaîtra plus dans la liste ni dans les entrées de stock, mais son historique est conservé."
          onChange={setActive}
        />
      )}
    </div>
  )
}
