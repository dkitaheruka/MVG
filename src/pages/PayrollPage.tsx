import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UsersThree,
  UserPlus,
  Plus,
  X,
  Wallet,
  Receipt,
  Printer,
  CheckCircle,
  FilePdf,
  Coins,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import { NewEtatBesoinModal } from '../components/NewEtatBesoinModal'

export function PayrollPage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) =>
    typeof state.selectedAgenceId === 'number'
      ? state.selectedAgenceId
      : (state.session?.agenceId ?? 1)
  )
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'bulletins' | 'avances' | 'agents'>('bulletins')
  const [showNewAgentModal, setShowNewAgentModal] = useState(false)
  const [showEBModal, setShowEBModal] = useState(false)
  const [showNewAvanceModal, setShowNewAvanceModal] = useState(false)
  const [showGenerateBulletinModal, setShowGenerateBulletinModal] = useState(false)
  const [voucherBulletin, setVoucherBulletin] = useState<any | null>(null)
  const [voucherAvance, setVoucherAvance] = useState<any | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form states for agent
  const [agentNom, setAgentNom] = useState('')
  const [agentTel, setAgentTel] = useState('')
  const [agentPoste, setAgentPoste] = useState('Vendeur / Commercial')
  const [agentSalaire, setAgentSalaire] = useState('350')
  const [agentCommission, setAgentCommission] = useState('2.5')

  // Form states for advance
  const [avanceAgentId, setAvanceAgentId] = useState<number | ''>(1)
  const [avanceMontant, setAvanceMontant] = useState('50')
  const [avanceDevise, setAvanceDevise] = useState<'USD' | 'CDF'>('USD')
  const [avanceMotif, setAvanceMotif] = useState('')

  // Form states for generating bulletin
  const [bulletinAgentId, setBulletinAgentId] = useState<number | ''>(1)
  const [bulletinMois, setBulletinMois] = useState(9)
  const [bulletinAnnee, setBulletinAnnee] = useState(2026)

  const agentsQuery = useQuery({
    queryKey: ['rh-agents', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/agents?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const bulletinsQuery = useQuery({
    queryKey: ['rh-bulletins', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/bulletins?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const avancesQuery = useQuery({
    queryKey: ['rh-avances', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/avances?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const createAgentMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/agents', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          nom: agentNom,
          telephone: agentTel,
          poste: agentPoste,
          salaireBase: Number(agentSalaire),
          tauxCommission: Number(agentCommission),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-agents'] })
      setShowNewAgentModal(false)
      setAgentNom('')
      setAgentTel('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur création collaborateur'),
  })

  const createAvanceMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/avances', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          agentId: Number(avanceAgentId),
          montant: Number(avanceMontant),
          devise: avanceDevise,
          motif: avanceMotif,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      setShowNewAvanceModal(false)
      setAvanceMotif('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur demande d avance'),
  })

  const validerAvanceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/avances/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur validation avance'),
  })

  const decaisserAvanceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/avances/${id}/decaisser`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur décaissement caisse'),
  })

  const genererBulletinMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/bulletins/generer', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agentId: Number(bulletinAgentId),
          mois: bulletinMois,
          annee: bulletinAnnee,
        }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setShowGenerateBulletinModal(false)
      setVoucherBulletin(data)
      setActionError(null)
      if (data && data.id) {
        setPrintProposal({
          title: 'Bulletin de Paie Édité avec Succès !',
          ref: data.numeroBulletin || `PAY-${data.id}`,
          subtitle: `Le bulletin de paie de l'agent a été calculé et validé. Imprimez le document officiel :`,
          primaryDocName: 'Bulletin de Paie Officiel',
          primaryDocUrl: `/api/rh/bulletins/${data.id}/document`,
        })
      }
    },
    onError: (err: any) => setActionError(err.message || 'Erreur calcul bulletin'),
  })

  const validerBulletinMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/bulletins/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Validation refusée : réservée au Comptable Senior'),
  })

  const payerBulletinMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/bulletins/${id}/payer`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur paiement du bulletin'),
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
            <UsersThree size={26} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Ressources Humaines & Paie</h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Calcul des salaires, commissions sur chiffre d affaires, validation par le Comptable Senior et décaissement en caisse.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="secondary-action"
            onClick={() => setShowEBModal(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour les salaires, primes ou charges sociales"
          >
            <Coins size={18} /> Demande de Fonds RH & Salaires
          </button>
          <button className="secondary-action" onClick={() => setShowNewAvanceModal(true)}>
            <Wallet size={18} /> Demande d Avance
          </button>
          <button className="primary-action" onClick={() => setShowGenerateBulletinModal(true)}>
            <Plus size={18} /> Calculer un Bulletin
          </button>
        </div>
      </div>

      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'bulletins' && 'active')} onClick={() => setActiveTab('bulletins')}>
          <Receipt size={17} /> Bulletins de Paie ({bulletinsQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'avances' && 'active')} onClick={() => setActiveTab('avances')}>
          <Wallet size={17} /> Avances sur Salaire ({avancesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'agents' && 'active')} onClick={() => setActiveTab('agents')}>
          <UsersThree size={17} /> Personnel & Commissions ({agentsQuery.data?.length ?? 0})
        </button>
      </div>

      {activeTab === 'bulletins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
            <strong>Circuit de contrôle interne :</strong> Les bulletins sont préparés par le Responsable RH, obligatoirement validés par le <strong>Comptable Senior</strong> distinct, puis payés par décaissement direct en caisse (compte 661 contre 571).
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Réf Bulletin</th>
                  <th>Période</th>
                  <th>Collaborateur</th>
                  <th>Salaire Base</th>
                  <th>Commissions Ventes</th>
                  <th>Avances Déduites</th>
                  <th>Net à Payer</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(bulletinsQuery.data ?? []).map((b: any) => (
                  <tr key={b.id}>
                    <td><strong>{b.referenceBulletin}</strong></td>
                    <td>{b.mois}/{b.annee}</td>
                    <td>{b.agent?.nom ?? `Agent #${b.agentId}`}</td>
                    <td>${b.salaireBase.toFixed(2)}</td>
                    <td style={{ color: 'var(--accent-strong)' }}>+${b.commissionsVentes.toFixed(2)}</td>
                    <td style={{ color: 'var(--danger)' }}>-${b.avancesDeduites.toFixed(2)}</td>
                    <td><strong style={{ fontSize: '1.05rem' }}>${b.netAPayer.toFixed(2)} {b.devise}</strong></td>
                    <td>
                      <span className={clsx('badge', b.statut === 'PAYE' ? 'badge-success' : b.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')}>
                        {b.statut === 'PAYE' ? 'Payé en caisse' : b.statut === 'VALIDE' ? 'Validé par Comptable Sr' : 'Brouillon RH'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="secondary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => setVoucherBulletin(b)}
                        >
                          <Receipt size={15} /> Aperçu
                        </button>
                        <a
                          className="secondary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none' }}
                          href={`/api/rh/bulletins/${b.id}/document`}
                          target="_blank"
                          rel="noreferrer"
                          title="Imprimer le bulletin officiel A4"
                        >
                          <Printer size={15} /> Imprimer (A4)
                        </a>
                        {b.statut === 'BROUILLON' && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => validerBulletinMutation.mutate(b.id)}
                            title="Réservé au Comptable Senior"
                          >
                            <CheckCircle size={15} /> Valider (Comptable Sr)
                          </button>
                        )}
                        {b.statut === 'VALIDE' && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                            onClick={() => payerBulletinMutation.mutate(b.id)}
                          >
                            <Wallet size={15} /> Payer salaire
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(bulletinsQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      Aucun bulletin de paie généré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'avances' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Réf Avance</th>
                <th>Date Demande</th>
                <th>Collaborateur</th>
                <th>Montant</th>
                <th>Motif</th>
                <th>Demandeur / Validateur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(avancesQuery.data ?? []).map((av: any) => (
                <tr key={av.id}>
                  <td><strong>AVS-{av.id}</strong></td>
                  <td>{new Date(av.dateDemande).toLocaleDateString()}</td>
                  <td>{av.agent?.nom ?? `Agent #${av.agentId}`}</td>
                  <td><strong>${av.montant.toFixed(2)} {av.devise}</strong></td>
                  <td>{av.motif}</td>
                  <td>
                    <div>Demandé par : {av.demandeurNom}</div>
                    {av.validateurNom && <small style={{ color: 'var(--muted)' }}>Validé par : {av.validateurNom}</small>}
                  </td>
                  <td>
                    <span className={clsx('badge', av.statut === 'DECAISSE' ? 'badge-success' : av.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')}>
                      {av.statut === 'DECAISSE' ? 'Décaissée en caisse' : av.statut === 'VALIDE' ? 'Approuvée' : 'En attente chef'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setVoucherAvance(av)}
                      >
                        <Printer size={15} /> Bon Caisse
                      </button>
                      {av.statut === 'EN_ATTENTE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => validerAvanceMutation.mutate(av.id)}
                        >
                          Valider avance
                        </button>
                      )}
                      {av.statut === 'VALIDE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                          onClick={() => decaisserAvanceMutation.mutate(av.id)}
                        >
                          Décaisser caisse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(avancesQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    Aucune avance sur salaire enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="primary-action" onClick={() => setShowNewAgentModal(true)}>
              <UserPlus size={18} /> Ajouter un Collaborateur
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom complet</th>
                  <th>Poste & Rôle</th>
                  <th>Téléphone</th>
                  <th>Salaire de Base Fixe</th>
                  <th>Commission sur Ventes</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {(agentsQuery.data ?? []).map((a: any) => (
                  <tr key={a.id}>
                    <td><strong>{a.matricule}</strong></td>
                    <td>{a.nom}</td>
                    <td>{a.poste}</td>
                    <td>{a.telephone || '-'}</td>
                    <td>${a.salaireBase.toFixed(2)} USD</td>
                    <td><strong style={{ color: 'var(--accent-strong)' }}>{a.tauxCommission}%</strong></td>
                    <td><span className="badge badge-success">Actif</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL GENERER BULLETIN */}
      {showGenerateBulletinModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Calculer un bulletin de paie</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Le système agrège automatiquement le fixe, le pourcentage sur les ventes effectives de l agent et déduit les avances déjà perçues.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); genererBulletinMutation.mutate(); }}>
              <label>
                Collaborateur concerné
                <select value={bulletinAgentId} onChange={(e) => setBulletinAgentId(Number(e.target.value))} required>
                  {(agentsQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.nom} ({ag.poste}) - Fixe: ${ag.salaireBase} + {ag.tauxCommission}% comm.
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Mois
                  <select value={bulletinMois} onChange={(e) => setBulletinMois(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>Mois {m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Année
                  <input type="number" value={bulletinAnnee} onChange={(e) => setBulletinAnnee(Number(e.target.value))} required />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowGenerateBulletinModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={genererBulletinMutation.isPending}>
                  {genererBulletinMutation.isPending ? 'Calcul...' : 'Générer le bulletin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEMANDE AVANCE */}
      {showNewAvanceModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Demande d avance sur salaire</h3>
            <form onSubmit={(e) => { e.preventDefault(); createAvanceMutation.mutate(); }}>
              <label>
                Bénéficiaire
                <select value={avanceAgentId} onChange={(e) => setAvanceAgentId(Number(e.target.value))} required>
                  {(agentsQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.nom} ({ag.poste})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Montant
                  <input type="number" min="1" step="any" value={avanceMontant} onChange={(e) => setAvanceMontant(e.target.value)} required />
                </label>
                <label>
                  Devise
                  <select value={avanceDevise} onChange={(e) => setAvanceDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </label>
              </div>

              <label style={{ marginTop: 12 }}>
                Motif de la demande
                <input value={avanceMotif} onChange={(e) => setAvanceMotif(e.target.value)} placeholder="ex: Urgence familiale..." required />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAvanceModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAvanceMutation.isPending}>
                  {createAvanceMutation.isPending ? 'Envoi...' : 'Soumettre pour accord chef'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEL AGENT */}
      {showNewAgentModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ajouter un collaborateur</h3>
            <form onSubmit={(e) => { e.preventDefault(); createAgentMutation.mutate(); }}>
              <label>
                Nom complet
                <input value={agentNom} onChange={(e) => setAgentNom(e.target.value)} placeholder="ex: Eric Mwamba" required />
              </label>
              <label style={{ marginTop: 12 }}>
                Poste
                <input value={agentPoste} onChange={(e) => setAgentPoste(e.target.value)} placeholder="ex: Vendeur, Caissier, Magasinier..." required />
              </label>
              <label style={{ marginTop: 12 }}>
                Téléphone
                <input value={agentTel} onChange={(e) => setAgentTel(e.target.value)} placeholder="ex: +243..." />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Salaire de base fixe ($)
                  <input type="number" min="0" value={agentSalaire} onChange={(e) => setAgentSalaire(e.target.value)} required />
                </label>
                <label>
                  Commission sur ventes (%)
                  <input type="number" min="0" step="0.1" value={agentCommission} onChange={(e) => setAgentCommission(e.target.value)} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAgentModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAgentMutation.isPending}>
                  {createAgentMutation.isPending ? 'Création...' : 'Enregistrer collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULLETIN DE PAIE FORMEL IMPRIMABLE */}
      {voucherBulletin && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>BULLETIN INDIVIDUEL DE PAIE</h3>
                <small style={{ color: 'var(--muted)' }}>RESSOURCES HUMAINES & GESTION SOCIALE</small>
              </div>
              <FilePdf size={28} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Référence :</strong> {voucherBulletin.referenceBulletin}</div>
              <div><strong>Période de paie :</strong> {voucherBulletin.mois} / {voucherBulletin.annee}</div>
              <div><strong>Bénéficiaire :</strong> {voucherBulletin.agent?.nom || 'Collaborateur'}</div>
              <div><strong>Poste :</strong> {voucherBulletin.agent?.poste || 'Agent'}</div>
              <div style={{ margin: '8px 0', padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salaire de base contractuel :</span>
                  <strong>${voucherBulletin.salaireBase?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-strong)' }}>
                  <span>Commissions sur ventes réalisées :</span>
                  <strong>+${voucherBulletin.commissionsVentes?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                  <span>Déduction avances sur salaire perçues :</span>
                  <strong>-${voucherBulletin.avancesDeduites?.toFixed(2)}</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                  <span>NET A PAYER :</span>
                  <span>${voucherBulletin.netAPayer?.toFixed(2)} {voucherBulletin.devise}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Préparé par : {voucherBulletin.preparateurNom} | Validation Comptable Senior : {voucherBulletin.comptableSeniorNom || 'En attente'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <a
                className="secondary-action"
                href={`/api/rh/bulletins/${voucherBulletin.id}/document`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={16} /> Imprimer Bulletin Officiel (A4)
              </a>
              <button className="primary-action" onClick={() => setVoucherBulletin(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* BON DE CAISSE POUR AVANCE SUR SALAIRE */}
      {voucherAvance && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>BON DE CAISSE - AVANCE SALAIRE</h3>
              <small style={{ color: 'var(--muted)' }}>TRÉSORERIE & AVANCES SUR SALAIRE</small>
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>N° Ordre de caisse :</strong> AVS-{voucherAvance.id}</div>
              <div><strong>Date :</strong> {new Date(voucherAvance.dateDemande).toLocaleDateString()}</div>
              <div><strong>Bénéficiaire :</strong> {voucherAvance.agent?.nom || voucherAvance.demandeurNom}</div>
              <div><strong>Montant alloué :</strong> ${voucherAvance.montant.toFixed(2)} {voucherAvance.devise}</div>
              <div><strong>Motif :</strong> {voucherAvance.motif}</div>
              <div><strong>Accord Chef d agence :</strong> {voucherAvance.validateurNom || 'Validé'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="primary-action" onClick={() => setVoucherAvance(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN RH & PAIE */}
      <NewEtatBesoinModal
        isOpen={showEBModal}
        onClose={() => setShowEBModal(false)}
        defaultService="Service Ressources Humaines & Paie"
        agenceId={agenceId}
      />
    </section>
  )
}
