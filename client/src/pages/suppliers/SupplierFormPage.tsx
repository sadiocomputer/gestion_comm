import { Save, Truck } from 'lucide-react'
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
import { api, getErrorMessage, type Supplier } from '../../lib/api'
import { formatPhone } from '../../lib/format'

/** /suppliers/new (création) et /suppliers/:id/edit (modification). */
export function SupplierFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const toast = useToast()
  const backTo = isNew ? '/suppliers' : `/suppliers/${id}`

  const [loaded, setLoaded] = useState(isNew)
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    api
      .get<Supplier>(`/suppliers/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setName(data.name)
        setContactName(data.contactName ?? '')
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
      contactName: contactName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    }
    try {
      const { data } = isNew
        ? await api.post<Supplier>('/suppliers', body)
        : await api.patch<Supplier>(`/suppliers/${id}`, body)
      toast.success(isNew ? 'Fournisseur ajouté' : 'Fournisseur modifié')
      navigate(`/suppliers/${data.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isNew ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}
        description={isNew ? 'Seul le nom est obligatoire.' : undefined}
        icon={Truck}
        tone="orange"
        back={{ to: backTo, label: isNew ? 'Fournisseurs' : 'Fiche fournisseur' }}
      />

      {!loaded && !error && <LoadingState />}
      {!loaded && error && <Alert tone="error">{error}</Alert>}

      {loaded && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardBody className="space-y-5">
              <TextField
                label="Nom du fournisseur"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ex. Sodigui SARL"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="Personne à contacter"
                hint="Facultatif"
                placeholder="Ex. M. Camara"
                maxLength={120}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <TextField
                label="Téléphone"
                type="tel"
                inputMode="tel"
                placeholder="620 00 00 00 ou +86 138 0000 0000"
                hint="Facultatif — numéro guinéen ou étranger."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <TextField
                label="Adresse"
                hint="Facultatif"
                placeholder="Quartier, ville, pays"
                maxLength={255}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <TextAreaField label="Notes" hint="Facultatif" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              {error && <Alert tone="error">{error}</Alert>}
            </CardBody>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <CancelButton to={backTo} />
              <Button type="submit" icon={Save} loading={submitting}>
                {isNew ? 'Ajouter le fournisseur' : 'Enregistrer'}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
