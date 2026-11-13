import { Archive, ArchiveRestore } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../lib/api'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'
import { ConfirmDialog } from './Modal'
import { useToast } from './useToast'

/**
 * Archiver / réactiver une fiche (client, fournisseur, produit).
 * L'archivage remplace la suppression : l'historique est conservé.
 */
export function ArchiveSection({
  active,
  noun,
  archivedHint,
  onChange,
}: {
  active: boolean
  /** Ex. « ce client » */
  noun: string
  /** Conséquence de l'archivage, en une phrase. */
  archivedHint: string
  onChange: (active: boolean) => Promise<void>
}) {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function apply(nextActive: boolean) {
    setBusy(true)
    try {
      await onChange(nextActive)
      toast.success(nextActive ? 'Fiche réactivée' : 'Fiche archivée')
      setConfirming(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={active ? Archive : ArchiveRestore}
        tone="slate"
        title={active ? 'Archiver' : 'Fiche archivée'}
        description={active ? archivedHint : `Réactivez ${noun} pour l'utiliser à nouveau.`}
      />
      <CardBody>
        {active ? (
          <Button variant="secondary" icon={Archive} onClick={() => setConfirming(true)}>
            Archiver {noun}
          </Button>
        ) : (
          <Button variant="success" icon={ArchiveRestore} loading={busy} onClick={() => void apply(true)}>
            Réactiver {noun}
          </Button>
        )}
      </CardBody>
      <ConfirmDialog
        open={confirming}
        title={`Archiver ${noun} ?`}
        message={`${archivedHint} Vous pourrez le réactiver à tout moment.`}
        confirmLabel="Archiver"
        tone="primary"
        icon={Archive}
        loading={busy}
        onConfirm={() => void apply(false)}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  )
}
