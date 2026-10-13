import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, X, CheckCircle, Warning, FileText } from '@phosphor-icons/react'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'

export const SERVICES_ENTREPRISE = [
  'Service Ventes & Commercial',
  'Service Stock & Magasin',
  'Service Achats & Approvisionnement',
  'Service Logistique & Transferts',
  'Service Maintenance & Parc Technique',
  'Service Production & Minoterie',
  'Service Trésorerie & Caisse',
  'Service Ressources Humaines & Paie',
  'Service Comptabilité & Finance',
  'Direction & Administration',
]

export function NewEtatBesoinModal({
  isOpen,
  onClose,
  defaultService = 'Service Général',
  agenceId,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  defaultService?: string
  agenceId?: number
  onSuccess?: (newEB: any) => void
}) {
  const queryClient = useQueryClient()
  const session = useAppStore((state) => state.session)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)
  const token = session?.token

  const [serviceDemandeur, setServiceDemandeur] = useState(defaultService)
  const [motif, setMotif] = useState('')
  const [montant, setMontant] = useState('')
  const [devise, setDevise] = useState<'USD' | 'CDF'>('USD')
  const [compteImputation, setCompteImputation] = useState('605')
  const [observations, setObservations] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeAgenceId = agenceId ?? session?.agenceId ?? 1

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>('/api/etats-besoin', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId: activeAgenceId,
          serviceDemandeur: serviceDemandeur.trim(),
          motif: motif.trim(),
          montant: Number(montant),
          devise,
          compteImputation,
          observations: observations.trim() || undefined,
        }),
      }),
    onSuccess: (newEB) => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })

      setPrintProposal({
        title: `État de Besoin Soumis avec Succès !`,
        ref: newEB.numeroEB,
        subtitle: `Votre demande de fonds (${newEB.montant} ${newEB.devise}) pour le ${newEB.serviceDemandeur} a été transmise dans le circuit hiérarchique de validation.`,
        primaryDocName: 'Bon de Demande de Fonds (EB)',
        primaryDocUrl: `/api/etats-besoin/${newEB.id}/bon-decaissement`,
      })

      if (onSuccess) onSuccess(newEB)
      onClose()
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erreur lors de la soumission de l état de besoin')
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const num = Number(montant)
    if (!num || num <= 0) {
      setErrorMsg('Veuillez saisir un montant supérieur à 0.')
      return
    }
    if (!motif.trim()) {
      setErrorMsg('Veuillez préciser le motif et la justification du besoin.')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-card" style={{ maxWidth: 540, width: '100%', background: 'var(--surface)', borderRadius: 14, padding: 26, border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Coins size={26} style={{ color: 'var(--accent-strong)' }} />
            Nouvel État de Besoin (Demande de Fonds)
          </h3>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.86rem', marginTop: -6, marginBottom: 16 }}>
          Procédure officielle d'engagement de dépenses pour tous les services de l'entreprise.
        </p>

        {errorMsg && (
          <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: '0.86rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Warning size={18} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Service Demandeur</span>
            <select
              value={serviceDemandeur}
              onChange={(e) => setServiceDemandeur(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }}
            >
              {SERVICES_ENTREPRISE.map((srv) => (
                <option key={srv} value={srv}>{srv}</option>
              ))}
            </select>
          </label>

          <label>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Motif & Objet détaillé de la dépense</span>
            <textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : Achat de carburant pour transport camion, achat petit outillage atelier, réapprovisionnement pièces mécaniques..."
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
            <label>
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Montant demandé</span>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4, fontWeight: 700 }}
              />
            </label>

            <label>
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Devise</span>
              <select
                value={devise}
                onChange={(e) => setDevise(e.target.value as 'USD' | 'CDF')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }}
              >
                <option value="USD">USD ($)</option>
                <option value="CDF">CDF (FC)</option>
              </select>
            </label>
          </div>

          <label>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Compte d'Imputation Comptable (Plan OHADA)</span>
            <select
              value={compteImputation}
              onChange={(e) => setCompteImputation(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }}
            >
              <option value="605">Compte 605 - Achats de fournitures et consommables</option>
              <option value="61">Compte 61 - Transports, carburant et déplacements</option>
              <option value="62">Compte 62 - Maintenance, réparations et prestations extérieures</option>
              <option value="63">Compte 63 - Taxes, impôts et redevances administratives</option>
              <option value="65">Compte 65 - Autres charges d exploitation courantes</option>
            </select>
          </label>

          <label>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Observations complémentaires (Optionnel)</span>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex : Facture proforma en pièce jointe, urgence atelier minoterie..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }}
            />
          </label>

          <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 8, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            💡 <em>Workflow :</em> Demande soumise → Visa Chef d'Agence → Visa Direction Siège si &gt; $200 USD → Décaissement en caisse & Édition Bon BDEC.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button type="button" className="secondary-action" onClick={onClose} disabled={createMutation.isPending}>
              Annuler
            </button>
            <button type="submit" className="primary-action" disabled={createMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              {createMutation.isPending ? 'Transmission...' : 'Soumettre la Demande de Fonds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
