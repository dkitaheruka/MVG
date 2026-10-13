import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench,
  Plus,
  X,
  Truck,
  CheckCircle,
  Printer,
  CurrencyCircleDollar,
  FileXls,
  Coins,
  ArrowsClockwise,
  ClockCounterClockwise,
  Package,
  Trash,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import type { EntretienTechnique, TypeEquipementTechnique, TypeMaintenance, EquipementParc } from '../types'
import { NewEtatBesoinModal } from '../components/NewEtatBesoinModal'

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const session = useAppStore((state) => state.session)
  const selectedAgenceId = useAppStore((state) => state.selectedAgenceId)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'interventions' | 'equipements'>('interventions')
  const [filterType, setFilterType] = useState<string>('TOUS')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [showNewInterventionModal, setShowNewInterventionModal] = useState(false)
  const [showNewEquipementModal, setShowNewEquipementModal] = useState(false)
  const [showEBModal, setShowEBModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Intervention Form states (AUCUNE VALEUR CODÉE EN DUR - champs propres et neutres)
  const [targetAgenceId, setTargetAgenceId] = useState<number>(session?.agenceId || 1)
  const [selectedEquipementId, setSelectedEquipementId] = useState<string>('')
  const [typeEquipement, setTypeEquipement] = useState<TypeEquipementTechnique>('VEHICULE')
  const [nomEquipement, setNomEquipement] = useState('')
  const [immatriculationOuSerie, setImmatriculationOuSerie] = useState('')
  const [typeMaintenance, setTypeMaintenance] = useState<TypeMaintenance>('PREVENTIF')
  const [natureTravaux, setNatureTravaux] = useState('')
  const [dateIntervention, setDateIntervention] = useState(new Date().toISOString().slice(0, 10))
  const [prochaineMaintenancePrevue, setProchaineMaintenancePrevue] = useState('')
  const [kilometrageOuHeures, setKilometrageOuHeures] = useState('')
  const [technicienOuGarage, setTechnicienOuGarage] = useState('')
  const [coutPiecesUsd, setCoutPiecesUsd] = useState('0')
  const [coutMainOeuvreUsd, setCoutMainOeuvreUsd] = useState('0')
  const [observations, setObservations] = useState('')

  // Equipement Parc Form states
  const [newEqNom, setNewEqNom] = useState('')
  const [newEqType, setNewEqType] = useState<string>('VEHICULE')
  const [newEqSerie, setNewEqSerie] = useState('')
  const [newEqAgenceId, setNewEqAgenceId] = useState<number>(session?.agenceId || 1)
  const [newEqMarque, setNewEqMarque] = useState('')
  const [newEqStatut, setNewEqStatut] = useState<'OPERATIONNEL' | 'EN_MAINTENANCE' | 'HORS_SERVICE'>('OPERATIONNEL')
  const [newEqDate, setNewEqDate] = useState(new Date().toISOString().slice(0, 10))
  const [newEqObs, setNewEqObs] = useState('')

  // Query Agences
  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  // Agence filter string
  const agenceParam = selectedAgenceId === 'CONSOLIDE' ? '' : `?agenceId=${selectedAgenceId}`

  // Query Interventions
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance-entretiens', selectedAgenceId],
    queryFn: () => apiRequest<EntretienTechnique[]>(`/api/maintenance/entretiens${agenceParam}`, { token }),
    enabled: Boolean(token),
  })

  // Query Parc Equipements
  const equipementsQuery = useQuery({
    queryKey: ['maintenance-equipements', selectedAgenceId],
    queryFn: () => apiRequest<EquipementParc[]>(`/api/maintenance/equipements${agenceParam}`, { token }),
    enabled: Boolean(token),
  })

  // Mutations
  const createInterventionMutation = useMutation({
    mutationFn: () =>
      apiRequest<EntretienTechnique>('/api/maintenance/entretiens', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId: targetAgenceId,
          typeEquipement,
          nomEquipement,
          immatriculationOuSerie: immatriculationOuSerie || undefined,
          typeMaintenance,
          natureTravaux,
          dateIntervention,
          prochaineMaintenancePrevue: prochaineMaintenancePrevue || undefined,
          kilometrageOuHeures: kilometrageOuHeures ? Number(kilometrageOuHeures) : undefined,
          technicienOuGarage,
          coutPiecesUsd: Number(coutPiecesUsd) || 0,
          coutMainOeuvreUsd: Number(coutMainOeuvreUsd) || 0,
          statut: 'PLANIFIE',
          observations: observations || undefined,
        }),
      }),
    onSuccess: (nouvelEntretien) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-entretiens'] })
      setShowNewInterventionModal(false)
      // Reset form
      setNomEquipement('')
      setImmatriculationOuSerie('')
      setNatureTravaux('')
      setTechnicienOuGarage('')
      setCoutPiecesUsd('0')
      setCoutMainOeuvreUsd('0')
      setObservations('')
      setSelectedEquipementId('')
      setActionError(null)
      setActionSuccess(`Intervention ${nouvelEntretien.numeroIntervention} enregistrée avec succès.`)
      
      // Proposer immédiatement d'imprimer la fiche technique
      setPrintProposal({
        title: 'Intervention Technique Enregistrée !',
        ref: nouvelEntretien.numeroIntervention,
        subtitle: `La fiche de maintenance pour "${nouvelEntretien.nomEquipement}" a été générée. Imprimez la fiche d'intervention :`,
        primaryDocName: "Fiche d'Intervention Technique",
        primaryDocUrl: `/api/maintenance/entretiens/${nouvelEntretien.id}/fiche`,
      })
    },
    onError: (err: any) => {
      setActionError(err.message || "Erreur lors de l'enregistrement de l'intervention")
    },
  })

  const createEquipementMutation = useMutation({
    mutationFn: () =>
      apiRequest<EquipementParc>('/api/maintenance/equipements', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newEqNom,
          type: newEqType,
          immatriculationOuSerie: newEqSerie,
          agenceId: newEqAgenceId,
          marqueModele: newEqMarque,
          statut: newEqStatut,
          dateMiseEnService: newEqDate,
          observations: newEqObs,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-equipements'] })
      setShowNewEquipementModal(false)
      setNewEqNom('')
      setNewEqSerie('')
      setNewEqMarque('')
      setNewEqObs('')
      setActionError(null)
      setActionSuccess('Équipement ajouté au parc avec succès.')
    },
    onError: (err: any) => {
      setActionError(err.message || "Erreur lors de l'ajout de l'équipement")
    },
  })

  const deleteEquipementMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/maintenance/equipements/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-equipements'] })
      setActionSuccess('Équipement retiré du parc.')
    },
  })

  const genererEBMutation = useMutation({
    mutationFn: (maintId: number) =>
      apiRequest<{ message: string; etatBesoin: any }>(`/api/maintenance/entretiens/${maintId}/generer-etat-besoin`, {
        method: 'POST',
        token,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-entretiens'] })
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      setActionSuccess(res.message || 'Demande de fonds (État de besoin) générée avec succès.')
      
      if (res.etatBesoin?.id) {
        setPrintProposal({
          title: 'État de Besoin Généré pour cette Maintenance !',
          ref: res.etatBesoin.numeroEB,
          subtitle: `Le bon de réquisition ($${res.etatBesoin.montant} USD) est transmis pour visa du Chef d'Agence puis décaissement au guichet caisse.`,
          primaryDocName: "Bon d'État de Besoin & Décharge",
          primaryDocUrl: `/api/etats-besoin/${res.etatBesoin.id}/bon-decaissement`,
        })
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Erreur lors de la génération de l'état de besoin")
    },
  })

  const cloturerMutation = useMutation({
    mutationFn: (maintId: number) =>
      apiRequest(`/api/maintenance/entretiens/${maintId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ statut: 'TERMINE' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-entretiens'] })
      setActionSuccess('Intervention clôturée et matériel remis en service opérationnel.')
    },
  })

  const allInterventions = maintenanceQuery.data ?? []
  const allEquipements = equipementsQuery.data ?? []

  const filteredInterventions = allInterventions.filter((m) => {
    if (filterType !== 'TOUS' && m.typeEquipement !== filterType) return false
    if (filterStatut !== 'TOUS' && m.statut !== filterStatut) return false
    return true
  })

  // KPIs
  const totalInterventions = allInterventions.length
  const totalCoutUsd = allInterventions.reduce((acc, m) => acc + (m.coutTotalUsd || 0), 0)
  const nbPreventif = allInterventions.filter((m) => m.typeMaintenance === 'PREVENTIF').length
  const nbCuratif = allInterventions.filter((m) => m.typeMaintenance === 'CURATIF').length
  const enCoursOuPlanifies = allInterventions.filter((m) => m.statut !== 'TERMINE').length

  const handleSelectExistingEquipement = (eqIdStr: string) => {
    setSelectedEquipementId(eqIdStr)
    if (!eqIdStr) return
    const found = allEquipements.find((e) => e.id === Number(eqIdStr))
    if (found) {
      setNomEquipement(found.nom)
      setImmatriculationOuSerie(found.immatriculationOuSerie || '')
      setTypeEquipement((found.type as TypeEquipementTechnique) || 'AUTRE')
      setTargetAgenceId(found.agenceId || targetAgenceId)
    }
  }

  return (
    <section className="page-grid">
      {/* EN-TÊTE DU MODULE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} weight="bold" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Maintenance & Gestion du Parc Matériel</h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Flotte de véhicules, machines de meunerie, groupes électrogènes, silos et ponts-bascules de toutes les agences.
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="secondary-action"
            href={`/api/export/print/maintenance${agenceParam}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Printer size={18} /> Imprimer Carnet (PDF)
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/maintenance${agenceParam}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <FileXls size={18} /> Exporter Carnet (.xlsx)
          </a>
          <button
            className="secondary-action"
            onClick={() => setShowEBModal(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour l'achat de pièces détachées ou réparation"
          >
            <Coins size={18} /> Demande de Fonds / Pièces
          </button>
          <button className="secondary-action" onClick={() => setShowNewEquipementModal(true)}>
            <Plus size={18} /> Ajouter Matériel au Parc
          </button>
          <button className="primary-action" onClick={() => setShowNewInterventionModal(true)}>
            <Wrench size={18} /> Déclarer Intervention
          </button>
        </div>
      </div>

      {/* MESSAGES D'ACTION */}
      {actionSuccess && (
        <div className="notice success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionSuccess}</span>
          <button className="icon-button" onClick={() => setActionSuccess(null)}><X size={16} /></button>
        </div>
      )}
      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)}><X size={16} /></button>
        </div>
      )}

      {/* NAVIGATION ONGLETS */}
      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'interventions' && 'active')} onClick={() => setActiveTab('interventions')}>
          <Wrench size={17} /> Interventions & Réparations ({allInterventions.length})
        </button>
        <button className={clsx('tab-button', activeTab === 'equipements' && 'active')} onClick={() => setActiveTab('equipements')}>
          <Truck size={17} /> Parc d'Équipements & Matériels ({allEquipements.length})
        </button>
      </div>

      {/* ONGLET 1 : INTERVENTIONS */}
      {activeTab === 'interventions' && (
        <>
          {/* CARTES KPIS */}
          <div className="metric-grid">
            <article className="metric-card">
              <Wrench size={23} />
              <span>Total Interventions</span>
              <strong>{totalInterventions}</strong>
            </article>
            <article className="metric-card">
              <ClockCounterClockwise size={23} />
              <span>Préventif vs Curatif</span>
              <strong>
                {nbPreventif} <small style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>prév.</small> / {nbCuratif} <small style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>dép.</small>
              </strong>
            </article>
            <article className="metric-card">
              <CurrencyCircleDollar size={23} />
              <span>Budget Maintenance (USD)</span>
              <strong style={{ color: '#0284c7' }}>${totalCoutUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
            </article>
            <article className="metric-card">
              <ArrowsClockwise size={23} />
              <span>Interventions Actives</span>
              <strong style={{ color: enCoursOuPlanifies > 0 ? '#f59e0b' : 'inherit' }}>{enCoursOuPlanifies}</strong>
            </article>
          </div>

          {/* FILTRES */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'TOUS', label: 'Tous les Matériels' },
                { id: 'VEHICULE', label: 'Véhicules & Flotte' },
                { id: 'MOULIN_BROYEUR', label: 'Moulins & Broyeurs' },
                { id: 'SILO', label: 'Silos & Stockage' },
                { id: 'PONT_BASCULE', label: 'Ponts-Bascules' },
                { id: 'GROUPE_ELECTROGENE', label: 'Groupes Électrogènes' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  className={clsx('tab-button', filterType === cat.id && 'active')}
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => setFilterType(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Statut :</span>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
              >
                <option value="TOUS">Tous les statuts</option>
                <option value="PLANIFIE">Planifié</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
              </select>
            </div>
          </div>

          {/* TABLEAU DES INTERVENTIONS */}
          <div style={{ background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px' }}>Réf. / Date</th>
                  <th style={{ padding: '12px 14px' }}>Équipement & Matériel</th>
                  <th style={{ padding: '12px 14px' }}>Agence</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Nature des Travaux</th>
                  <th style={{ padding: '12px 14px' }}>Intervenant / Garage</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Coût Total</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Statut</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Financement (EB)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterventions.map((m) => {
                  const coutTotal = (m.coutPiecesUsd || 0) + (m.coutMainOeuvreUsd || 0)
                  const ag = (agencesQuery.data || []).find((a: any) => a.id === m.agenceId)
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>{m.numeroIntervention}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {new Date(m.dateIntervention).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{m.nomEquipement}</div>
                        <code style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {m.immatriculationOuSerie || m.typeEquipement}
                        </code>
                        {m.kilometrageOuHeures && (
                          <span style={{ fontSize: '0.72rem', color: '#0284c7', marginLeft: 6 }}>
                            • {m.kilometrageOuHeures.toLocaleString('fr-FR')} {m.typeEquipement === 'VEHICULE' ? 'km' : 'heures'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {ag?.nom || `Agence #${m.agenceId}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          className={clsx('badge', m.typeMaintenance === 'PREVENTIF' ? 'badge-success' : 'badge-warning')}
                          style={{ fontSize: '0.74rem' }}
                        >
                          {m.typeMaintenance === 'PREVENTIF' ? 'Préventif' : 'Curatif (Panne)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.natureTravaux}>
                          {m.natureTravaux}
                        </div>
                        {m.prochaineMaintenancePrevue && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                            Prochain : {new Date(m.prochaineMaintenancePrevue).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem' }}>
                        {m.technicienOuGarage}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                        ${coutTotal.toFixed(2)}
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>
                          Pièces: ${m.coutPiecesUsd} | MO: ${m.coutMainOeuvreUsd}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {m.etatBesoinId ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            EB lié #{m.etatBesoinId}
                          </span>
                        ) : (
                          <button
                            className="secondary-action"
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                            onClick={() => genererEBMutation.mutate(m.id)}
                            disabled={genererEBMutation.isPending}
                            title="Générer une demande de fonds caisse validée par le Chef d'Agence"
                          >
                            <Coins size={14} /> Demander Fonds
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <a
                            href={`/api/maintenance/entretiens/${m.id}/fiche`}
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-action"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', textDecoration: 'none' }}
                            title="Imprimer la Fiche d'Intervention Technique"
                          >
                            <Printer size={15} /> Fiche
                          </a>
                          {m.statut !== 'TERMINE' && (
                            <button
                              className="primary-action"
                              style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#16a34a' }}
                              onClick={() => cloturerMutation.mutate(m.id)}
                              disabled={cloturerMutation.isPending}
                            >
                              <CheckCircle size={15} /> Clôturer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredInterventions.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                      Aucune intervention technique trouvée pour ces critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ONGLET 2 : REGISTRE DU PARC D'ÉQUIPEMENTS */}
      {activeTab === 'equipements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Matériels & Équipements Réels de l'Entreprise</h3>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Enregistrez vos propres camions, moulins, groupes électrogènes et ponts-bascules sans limitation ni modèle imposé.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewEquipementModal(true)}>
              <Plus size={17} /> Enregistrer un Matériel
            </button>
          </div>

          <div style={{ background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px' }}>Désignation du Matériel</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Plaque / N° Série</th>
                  <th style={{ padding: '12px 14px' }}>Agence d'Affectation</th>
                  <th style={{ padding: '12px 14px' }}>Marque / Modèle</th>
                  <th style={{ padding: '12px 14px' }}>Statut Opérationnel</th>
                  <th style={{ padding: '12px 14px' }}>Mise en Service</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allEquipements.map((eq) => {
                  const ag = (agencesQuery.data || []).find((a: any) => a.id === eq.agenceId)
                  return (
                    <tr key={eq.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {eq.nom}
                        {eq.observations && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>
                            {eq.observations}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.74rem' }}>
                          {eq.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <code>{eq.immatriculationOuSerie || '-'}</code>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {ag?.nom || `Agence #${eq.agenceId}`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {eq.marqueModele || '-'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          className={clsx(
                            'badge',
                            eq.statut === 'OPERATIONNEL'
                              ? 'badge-success'
                              : eq.statut === 'EN_MAINTENANCE'
                              ? 'badge-warning'
                              : 'badge-danger'
                          )}
                          style={{ fontSize: '0.74rem' }}
                        >
                          {eq.statut === 'OPERATIONNEL' ? 'Opérationnel' : eq.statut === 'EN_MAINTENANCE' ? 'En maintenance' : 'Hors service'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        {eq.dateMiseEnService ? new Date(eq.dateMiseEnService).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="secondary-action"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            onClick={() => {
                              handleSelectExistingEquipement(String(eq.id))
                              setShowNewInterventionModal(true)
                            }}
                          >
                            <Wrench size={14} /> Réviser
                          </button>
                          <button
                            className="icon-button"
                            style={{ color: '#dc2626' }}
                            onClick={() => {
                              if (confirm(`Retirer "${eq.nom}" du parc matériel ?`)) {
                                deleteEquipementMutation.mutate(eq.id)
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {allEquipements.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                      Aucun équipement enregistré dans le parc. Utilisez le bouton ci-dessus pour ajouter vos matériels.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE INTERVENTION TECHNIQUE */}
      {showNewInterventionModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={22} color="var(--primary)" />
                Déclarer une Intervention Technique
              </h3>
              <button className="icon-button" onClick={() => setShowNewInterventionModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createInterventionMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {/* Choix depuis le parc d'équipements */}
              <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Sélectionner un équipement enregistré du parc :
                </label>
                <select
                  value={selectedEquipementId}
                  onChange={(e) => handleSelectExistingEquipement(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.88rem' }}
                >
                  <option value="">-- Saisie manuelle libre (Matériel non enregistré) --</option>
                  {allEquipements.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nom} ({eq.immatriculationOuSerie || eq.type})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Agence rattachée
                  <select
                    value={targetAgenceId}
                    onChange={(e) => setTargetAgenceId(Number(e.target.value))}
                  >
                    {(agencesQuery.data || []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.nom} ({ag.ville})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type de maintenance
                  <select
                    value={typeMaintenance}
                    onChange={(e) => setTypeMaintenance(e.target.value as TypeMaintenance)}
                  >
                    <option value="PREVENTIF">Préventive (Entretien régulier / Révision)</option>
                    <option value="CURATIF">Curative (Réparation de panne urgente)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Désignation précise du matériel
                  <input
                    value={nomEquipement}
                    onChange={(e) => setNomEquipement(e.target.value)}
                    placeholder="ex: Moulin à maïs n°1, Camion Benne Actros..."
                    required
                  />
                </label>
                <label>
                  Immatriculation ou N° Série
                  <input
                    value={immatriculationOuSerie}
                    onChange={(e) => setImmatriculationOuSerie(e.target.value)}
                    placeholder="ex: Plaque / N° Châssis"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label>
                  Date de l'intervention
                  <input
                    type="date"
                    value={dateIntervention}
                    onChange={(e) => setDateIntervention(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Prochaine révision prévue
                  <input
                    type="date"
                    value={prochaineMaintenancePrevue}
                    onChange={(e) => setProchaineMaintenancePrevue(e.target.value)}
                  />
                </label>
                <label>
                  Compteur (Km / Heures)
                  <input
                    type="number"
                    value={kilometrageOuHeures}
                    onChange={(e) => setKilometrageOuHeures(e.target.value)}
                    placeholder="ex: 12500"
                  />
                </label>
              </div>

              <label>
                Nature détaillée des travaux réalisés ou planifiés
                <textarea
                  value={natureTravaux}
                  onChange={(e) => setNatureTravaux(e.target.value)}
                  placeholder="Décrivez précisément les pièces remplacées, vidanges, réglages ou révisions..."
                  rows={2}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <label>
                  Technicien / Prestataire / Garage
                  <input
                    value={technicienOuGarage}
                    onChange={(e) => setTechnicienOuGarage(e.target.value)}
                    placeholder="ex: Mécanicien interne, Garage partenaire..."
                    required
                  />
                </label>
                <label>
                  Coût Pièces (USD)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coutPiecesUsd}
                    onChange={(e) => setCoutPiecesUsd(e.target.value)}
                  />
                </label>
                <label>
                  Main d'œuvre (USD)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coutMainOeuvreUsd}
                    onChange={(e) => setCoutMainOeuvreUsd(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewInterventionModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createInterventionMutation.isPending}>
                  {createInterventionMutation.isPending ? 'Enregistrement...' : "Valider l'Intervention"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEL ÉQUIPEMENT PARC */}
      {showNewEquipementModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={22} color="var(--primary)" />
                Enregistrer un Matériel au Parc
              </h3>
              <button className="icon-button" onClick={() => setShowNewEquipementModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createEquipementMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <label>
                Nom / Désignation du matériel
                <input
                  value={newEqNom}
                  onChange={(e) => setNewEqNom(e.target.value)}
                  placeholder="ex: Camion Benne 20T, Moulin Bühler n°2, Groupe électrogène..."
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Catégorie
                  <select value={newEqType} onChange={(e) => setNewEqType(e.target.value)}>
                    <option value="VEHICULE">Véhicule / Camion de transport</option>
                    <option value="MOULIN_BROYEUR">Moulin / Broyeur de meunerie</option>
                    <option value="NETTOYEUR">Nettoyeur / Séparateur grains</option>
                    <option value="GROUPE_ELECTROGENE">Groupe électrogène industriel</option>
                    <option value="PONT_BASCULE">Pont-Bascule de pesée</option>
                    <option value="SILO">Silo de stockage</option>
                    <option value="ENSACHEUSE">Ligne d'ensachage</option>
                    <option value="AUTRE">Autre équipement</option>
                  </select>
                </label>

                <label>
                  Agence d'affectation
                  <select
                    value={newEqAgenceId}
                    onChange={(e) => setNewEqAgenceId(Number(e.target.value))}
                  >
                    {(agencesQuery.data || []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.nom} ({ag.ville})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Immatriculation / N° Série
                  <input
                    value={newEqSerie}
                    onChange={(e) => setNewEqSerie(e.target.value)}
                    placeholder="ex: 0281AA/19 ou N° Série Usine"
                  />
                </label>
                <label>
                  Marque / Modèle
                  <input
                    value={newEqMarque}
                    onChange={(e) => setNewEqMarque(e.target.value)}
                    placeholder="ex: Mercedes, Bühler, Cummins..."
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Statut initial
                  <select value={newEqStatut} onChange={(e) => setNewEqStatut(e.target.value as any)}>
                    <option value="OPERATIONNEL">Opérationnel en service</option>
                    <option value="EN_MAINTENANCE">En maintenance</option>
                    <option value="HORS_SERVICE">Hors service</option>
                  </select>
                </label>
                <label>
                  Date de mise en service
                  <input
                    type="date"
                    value={newEqDate}
                    onChange={(e) => setNewEqDate(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Observations & détails d'usage
                <textarea
                  value={newEqObs}
                  onChange={(e) => setNewEqObs(e.target.value)}
                  placeholder="Notes sur l'emplacement, conducteur attitré, spécificités techniques..."
                  rows={2}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewEquipementModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createEquipementMutation.isPending}>
                  {createEquipementMutation.isPending ? 'Enregistrement...' : 'Enregistrer au Parc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN POUR LE SERVICE TECHNIQUE */}
      <NewEtatBesoinModal
        isOpen={showEBModal}
        onClose={() => setShowEBModal(false)}
        defaultService="Service Maintenance & Technique"
        agenceId={targetAgenceId || (session?.agenceId ?? 1)}
      />
    </section>
  )
}
