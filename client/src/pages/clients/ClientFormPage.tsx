import { Save, UserPen, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Alert } from '../../components/Alert'
import { TextField } from '../../components/TextField'
import { CancelButton } from '../../components/ui/BackLink'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { TextAreaField } from '../../components/ui/Fields'
import { LoadingState } from '../../components/ui/Loading'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/useToast'
import { api, getErrorMessage, type Client } from '../../lib/api'
import { formatPhone } from '../../lib/format'

/** /clients/new (création) et /clients/:id/edit (modification). */
export function ClientFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const toast = useToast()
  const backTo = isNew ? '/clients' : `/clients/${id}`

  const [loaded, setLoaded] = useState(isNew)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    api
      .get<Client>(`/clients/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setName(data.name)
        setPhone(data.phone ? formatPhone(data.phone) : '')
        setAddress(data.address ?? '')
        setNotes(data.notes ?? '')
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
    setSubmitting(true)
    const body = {
      name,
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    }
    try {
      const { data } = isNew
        ? await api.post<Client>('/clients', body)
        : await api.patch<Client>(`/clients/${id}`, body)
      toast.success(isNew ? 'Client ajouté' : 'Client modifié')
      navigate(`/clients/${data.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isNew ? 'Nouveau client' : 'Modifier le client'}
        description={isNew ? 'Seul le nom est obligatoire.' : undefined}
        icon={isNew ? UserPlus : UserPen}
        back={{ to: backTo, label: isNew ? 'Clients' : 'Fiche client' }}
      />

      {!loaded && !error && <LoadingState />}
      {!loaded && error && <Alert tone="error">{error}</Alert>}

      {loaded && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardBody className="space-y-5">
              <TextField
                label="Nom du client"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ex. Mamadou Diallo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="Téléphone"
                type="tel"
                inputMode="tel"
                placeholder="620 00 00 00"
                hint="Facultatif — utile pour lui envoyer ses factures par WhatsApp."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <TextField
                label="Adresse"
                placeholder="Quartier, ville"
                hint="Facultatif"
                maxLength={255}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <TextAreaField
                label="Notes"
                hint="Facultatif"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {error && <Alert tone="error">{error}</Alert>}
            </CardBody>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <CancelButton to={backTo} />
              <Button type="submit" icon={Save} loading={submitting}>
                {isNew ? 'Ajouter le client' : 'Enregistrer'}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
