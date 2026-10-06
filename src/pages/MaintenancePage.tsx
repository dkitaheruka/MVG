import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench,
  Plus,
  X,
  Truck,
  CheckCircle,
  Printer,
  ClockCounterClockwise,
  CurrencyCircleDollar,
  FileXls,
  Coins,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import type { EntretienTechnique, TypeEquipementTechnique, TypeMaintenance } from '../types'

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [filterType, setFilterType] = useState<string>('TOUS')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [showNewModal, setShowNewModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Form states
  const [typeEquipement, setTypeEquipement] = useState<TypeEquipementTechnique>('VEHICULE')
  const [nomEquipement, setNomEquipement] = useState('Camion porteur Mitsubishi Fuso Canter 10T')
  const [immatriculationOuSerie, setImmatriculationOuSerie] = useState('4512AB/19')
  const [typeMaintenance, setTypeMaintenance] = useState<TypeMaintenance>('PREVENTIF')
  const [natureTravaux, setNatureTravaux] = useState('Vidange moteur 15W40, remplacement filtre huile et filtre carburant')
  const [dateIntervention, setDateIntervention] = useState(new Date().toISOString().slice(0, 10))
  const [prochaineMaintenancePrevue, setProchaineMaintenancePrevue] = useState('')
  const [kilometrageOuHeures, setKilometrageOuHeures] = useState('')
  const [technicienOuGarage, setTechnicienOuGarage] = useState('Garage Moderne Goma (M. Bahati)')
  const [coutPiecesUsd, setCoutPiecesUsd] = useState('120')
  const [coutMainOeuvreUsd, setCoutMainOeuvreUsd] = useState('50')
  const [observations, setObservations] = useState('')

  // Query
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance-entretiens', agenceId],
    queryFn: () => apiRequest<EntretienTechnique[]>(`/api/maintenance/entretiens?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<EntretienTechnique>('/api/maintenance/entretiens', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          typeEquipement,
          nomEquipement,
          immatriculationOuSerie,
          typeMaintenance,
          natureTravaux,
          dateIntervention,
          prochaineMaintenancePrevue: prochaineMaintenancePrevue || undefined,
          kilometrageOuHeures: kilometrageOuHeures ? Number(kilometrageOuHeures) : undefined,
          technicienOuGarage,
          coutPiecesUsd: Number(coutPiecesUsd) || 0,
          coutMainOeuvreUsd: Number(coutMainOeuvreUsd) || 0,
          statut: 'PLANIFIE',
          observations,
        }),
      }),
    onSuccess: (nouvelEntretien) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-entretiens'] })
      setShowNewModal(false)
      setActionError(null)
      setActionSuccess(`Intervention ${nouvelEntretien.numeroIntervention} enregistrée avec succès.`)
      
      // Proposition immédiate d'impression de la fiche technique
      setPrintProposal({
        title: 'Intervention Technique Enregistrée !',
        ref: nouvelEntretien.numeroIntervention,
        subtitle: `La fiche de maintenance pour "${nouvelEntretien.nomEquipement}" a été générée. Imprimez la fiche d'intervention technique :`,
        primaryDocName: "Fiche d'Intervention Technique",
        primaryDocUrl: `/api/maintenance/entretiens/${nouvelEntretien.id}/fiche`,
      })
    },
    onError: (err: any) => {
      setActionError(err.message || "Erreur lors de l'enregistrement de l'intervention")
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
      
      // Proposer d'imprimer l'état de besoin généré
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
      setActionSuccess('Intervention clôturée et matériel remis en service.')
    },
  })

  const allInterventions = maintenanceQuery.data ?? []

  const filtered = allInterventions.filter((m) => {
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

  const handlePreselectionEquipement = (type: TypeEquipementTechnique) => {
    setTypeEquipement(type)
    if (type === 'VEHICULE') {
      setNomEquipement('Camion porteur Mitsubishi Fuso Canter 10T')
      setImmatriculationOuSerie('4512AB/19')
      setTechnicienOuGarage('Garage Moderne Goma (M. Bahati)')
      setCoutPiecesUsd('120')
      setCoutMainOeuvreUsd('50')
      setNatureTravaux('Vidange moteur 15W40, remplacement filtre huile et filtre carburant')
    } else if (type === 'MOULIN_BROYEUR') {
      setNomEquipement('Broyeur à cylindres Bühler 50T/jour')
      setImmatriculationOuSerie('BUH-CH-99482')
      setTechnicienOuGarage('Équipe Maintenance Interne Usine (Karegeya)')
      setCoutPiecesUsd('190')
      setCoutMainOeuvreUsd('50')
      setNatureTravaux('Graissage des paliers haute vitesse et tension des courroies trapézoïdales')
    } else if (type === 'GROUPE_ELECTROGENE') {
      setNomEquipement('Groupe électrogène Cummins 250 kVA')
      setImmatriculationOuSerie('CUM-250-9921')
      setTechnicienOuGarage('Atelier Electro-Kivu Services')
      setCoutPiecesUsd('250')
      setCoutMainOeuvreUsd('80')
      setNatureTravaux('Révision alternateur, filtre gasoil et batterie de démarrage')
    } else if (type === 'PONT_BASCULE') {
      setNomEquipement('Pont-Bascule Électronique 80 Tonnes')
      setImmatriculationOuSerie('METTLER-TOLEDO-80T')
      setTechnicienOuGarage('Office Congolais de Contrôle (OCC) / Métrologie')
      setCoutPiecesUsd('80')
      setCoutMainOeuvreUsd('150')
      setNatureTravaux('Étalonnage officiel semestriel des capteurs de pesée')
    } else if (type === 'SILO') {
      setNomEquipement('Batterie de silos verticaux 500T (Silo n°2 Maïs)')
      setImmatriculationOuSerie('SILO-VERT-02')
      setTechnicienOuGarage('Équipe Maintenance Silos Usine')
      setCoutPiecesUsd('60')
      setCoutMainOeuvreUsd('40')
      setNatureTravaux('Contrôle vis d Archimède et dépoussiérage filtres')
    }
  }

  return (
    <section className="page-grid">
      {/* EN-TÊTE DU MODULE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={26} color="var(--primary)" />
            Module Technique & Maintenance Industrielle
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
            Suivi des entretiens périodiques et pannes : camions de livraison, broyeurs Bühler, silos, pont-bascule et groupe électrogène.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href={`/api/export/excel/maintenance?agenceId=${agenceId}`}
            target="_blank"
            rel="noreferrer"
            className="secondary-action"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            title="Exporter l'historique complet des entretiens au format Excel"
          >
            <FileXls size={18} color="#16a34a" /> Exporter Excel (.xlsx)
          </a>
          <button className="primary-action" onClick={() => setShowNewModal(true)}>
            <Plus size={18} /> Déclarer / Planifier une Intervention
          </button>
        </div>
      </div>

      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="notice success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionSuccess}</span>
          <button className="icon-button" onClick={() => setActionSuccess(null)}>
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* FILTRES PAR ÉQUIPEMENT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'TOUS', label: 'Tous les Équipements' },
            { id: 'VEHICULE', label: 'Camions & Flotte' },
            { id: 'MOULIN_BROYEUR', label: 'Moulins & Broyeurs' },
            { id: 'SILO', label: 'Silos & Stockage' },
            { id: 'PONT_BASCULE', label: 'Pont-Bascule' },
            { id: 'GROUPE_ELECTROGENE', label: 'Groupe Électrogène' },
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
            {filtered.map((m) => {
              const coutTotal = (m.coutPiecesUsd || 0) + (m.coutMainOeuvreUsd || 0)
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
                    <span
                      className={clsx('badge', m.typeMaintenance === 'PREVENTIF' ? 'badge-success' : 'badge-warning')}
                      style={{ fontSize: '0.74rem' }}
                    >
                      {m.typeMaintenance === 'PREVENTIF' ? 'Préventif' : 'Curatif (Panne)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', maxWidth: 280 }}>
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
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <strong style={{ color: '#0284c7' }}>${coutTotal.toFixed(2)}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      P: ${m.coutPiecesUsd || 0} | MO: ${m.coutMainOeuvreUsd || 0}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span
                      className={clsx(
                        'badge',
                        m.statut === 'TERMINE' && 'badge-success',
                        m.statut === 'EN_COURS' && 'badge-warning',
                        m.statut === 'PLANIFIE' && 'badge-neutral'
                      )}
                    >
                      {m.statut}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {m.etatBesoinId ? (
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        EB #{m.etatBesoinId} Lié
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: '#0284c7', color: '#0284c7' }}
                        onClick={() => genererEBMutation.mutate(m.id)}
                        disabled={genererEBMutation.isPending}
                        title="Créer automatiquement la demande de fonds pour payer ces travaux"
                      >
                        <Coins size={14} /> Demande Fonds
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <a
                        href={`/api/maintenance/entretiens/${m.id}/fiche`}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-action"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                        title="Imprimer la fiche d'intervention technique officielle"
                      >
                        <Printer size={15} /> Fiche
                      </a>
                      {m.statut !== 'TERMINE' && (
                        <button
                          type="button"
                          className="primary-action"
                          style={{ padding: '3px 8px', fontSize: '0.75rem', background: '#16a34a' }}
                          onClick={() => cloturerMutation.mutate(m.id)}
                          disabled={cloturerMutation.isPending}
                          title="Clôturer l'intervention (matériel opérationnel)"
                        >
                          <CheckCircle size={15} /> Clôturer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Aucune intervention technique trouvée pour ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NOUVELLE INTERVENTION */}
      {showNewModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={22} color="var(--primary)" />
                Déclarer ou Planifier une Maintenance
              </h3>
              <button className="icon-button" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {/* Choix rapide d'équipement */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>
                  Présélection :
                </span>
                {(['VEHICULE', 'MOULIN_BROYEUR', 'GROUPE_ELECTROGENE', 'PONT_BASCULE', 'SILO'] as TypeEquipementTechnique[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={clsx('tab-button', typeEquipement === t && 'active')}
                    style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                    onClick={() => handlePreselectionEquipement(t)}
                  >
                    {t === 'VEHICULE' ? 'Camion Fuso' : t === 'MOULIN_BROYEUR' ? 'Broyeur Bühler' : t === 'GROUPE_ELECTROGENE' ? 'Groupe Cummins' : t === 'PONT_BASCULE' ? 'Pont-Bascule' : 'Silo 500T'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Type de matériel
                  <select
                    value={typeEquipement}
                    onChange={(e) => handlePreselectionEquipement(e.target.value as TypeEquipementTechnique)}
                  >
                    <option value="VEHICULE">Camion / Véhicule de livraison</option>
                    <option value="MOULIN_BROYEUR">Moulin / Broyeur de meunerie</option>
                    <option value="SILO">Silo de stockage céréales</option>
                    <option value="PONT_BASCULE">Pont-Bascule de pesée</option>
                    <option value="GROUPE_ELECTROGENE">Groupe électrogène industriel</option>
                    <option value="AUTRE">Autre équipement usine</option>
                  </select>
                </label>

                <label>
                  Type de maintenance
                  <select
                    value={typeMaintenance}
                    onChange={(e) => setTypeMaintenance(e.target.value as TypeMaintenance)}
                  >
                    <option value="PREVENTIF">Préventive & Révision périodique</option>
                    <option value="CURATIF">Curative / Réparation de panne</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Désignation précise du matériel
                  <input
                    value={nomEquipement}
                    onChange={(e) => setNomEquipement(e.target.value)}
                    placeholder="ex: Camion Sinotruk HOWO 25T"
                    required
                  />
                </label>
                <label>
                  Immatriculation ou N° Série
                  <input
                    value={immatriculationOuSerie}
                    onChange={(e) => setImmatriculationOuSerie(e.target.value)}
                    placeholder="ex: 8920AC/19"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label>
                  Date intervention
                  <input
                    type="date"
                    value={dateIntervention}
                    onChange={(e) => setDateIntervention(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Prochaine révision
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
                    placeholder="ex: 145000"
                  />
                </label>
              </div>

              <label>
                Intervenant / Atelier prestataire / Garage
                <input
                  value={technicienOuGarage}
                  onChange={(e) => setTechnicienOuGarage(e.target.value)}
                  placeholder="ex: Garage Moderne Goma ou Équipe interne"
                  required
                />
              </label>

              <label>
                Nature détaillée des travaux et pièces à changer
                <textarea
                  value={natureTravaux}
                  onChange={(e) => setNatureTravaux(e.target.value)}
                  rows={2}
                  placeholder="ex: Remplacement filtres, graissage roulements, révision démarreur..."
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Coût pièces détachées ($ USD)
                  <input
                    type="number"
                    step="0.01"
                    value={coutPiecesUsd}
                    onChange={(e) => setCoutPiecesUsd(e.target.value)}
                  />
                </label>
                <label>
                  Coût main d'œuvre ($ USD)
                  <input
                    type="number"
                    step="0.01"
                    value={coutMainOeuvreUsd}
                    onChange={(e) => setCoutMainOeuvreUsd(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer la Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
