import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  X,
  Truck,
  Printer,
  CheckCircle,
  FilePdf,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest, downloadUrl } from '../lib/api'
import { useAppStore } from '../stores/appStore'

export function StockTransfersPage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [showNewTransfertModal, setShowNewTransfertModal] = useState(false)
  const [receptionTransfert, setReceptionTransfert] = useState<any | null>(null)
  const [ecartConstate, setEcartConstate] = useState(false)
  const [motifEcart, setMotifEcart] = useState('')
  const [voucherTransfert, setVoucherTransfert] = useState<any | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form states for initiating transfer
  const [agenceDestId, setAgenceDestId] = useState<number>(2) // Kinshasa by default
  const [selectedStockId, setSelectedStockId] = useState<number | ''>('')
  const [quantiteExpediee, setQuantiteExpediee] = useState('10')
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<number | ''>(1)

  const transfertsQuery = useQuery({
    queryKey: ['transferts-stock', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/stocks/transferts?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const stockQuery = useQuery({
    queryKey: ['stock', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/stocks/agence/${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  const flotteQuery = useQuery({
    queryKey: ['flotte-vehicules'],
    queryFn: () => apiRequest<any[]>('/api/flotte/vehicules', { token }),
    enabled: Boolean(token),
  })

  const createTransfertMutation = useMutation({
    mutationFn: () => {
      const selectedStock = stockQuery.data?.find((s) => s.id === Number(selectedStockId))
      if (!selectedStock) throw new Error('Veuillez sélectionner un article en stock')
      const q = Number(quantiteExpediee)
      if (q <= 0 || q > selectedStock.quantite) {
        throw new Error(`Quantité invalide (max disponible : ${selectedStock.quantite})`)
      }

      return apiRequest('/api/stocks/transferts', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceSourceId: agenceId,
          agenceDestId: Number(agenceDestId),
          vehiculeId: selectedVehiculeId ? Number(selectedVehiculeId) : undefined,
          lignes: [
            {
              articleId: selectedStock.article.id,
              quantite: q,
              numeroLot: selectedStock.numeroLot,
            },
          ],
        }),
      })
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['transferts-stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['flotte-vehicules'] })
      queryClient.invalidateQueries({ queryKey: ['admin-flotte'] })
      setShowNewTransfertModal(false)
      setSelectedStockId('')
      setQuantiteExpediee('10')
      setVoucherTransfert(data)
      setActionError(null)
      if (data && data.id) {
        setPrintProposal({
          title: 'Transfert Inter-Agences Expédié !',
          ref: data.numeroTransfert || `TRF-${data.id}`,
          subtitle: `Le convoi inter-agences a été enregistré. Imprimez la Feuille de Route officielle pour le chauffeur :`,
          primaryDocName: 'Feuille de Route & Bordereau de Transfert',
          primaryDocUrl: `/api/transferts/${data.id}/document`,
        })
      }
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de l expédition'),
  })

  const receptionMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/stocks/transferts/${receptionTransfert.id}/recevoir`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          ecartConstate,
          motifEcart: ecartConstate ? motifEcart : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferts-stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['flotte-vehicules'] })
      queryClient.invalidateQueries({ queryKey: ['admin-flotte'] })
      setReceptionTransfert(null)
      setEcartConstate(false)
      setMotifEcart('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la réception'),
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Transferts Inter-Agences & Convois</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
            Expéditions de farine en sacs, feuilles de route chauffeurs, suivi de flotte et réception contradictoire.
          </p>
        </div>
        <button className="primary-action" onClick={() => setShowNewTransfertModal(true)}>
          <Plus size={18} /> Expédier un Transfert
        </button>
      </div>

      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Réf Transfert</th>
              <th>Date Expédition</th>
              <th>Provenance (Source)</th>
              <th>Destination</th>
              <th>Articles & Lots</th>
              <th>Camion & Chauffeur</th>
              <th>Statut</th>
              <th>Initiateur / Récepteur</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(transfertsQuery.data ?? []).map((t: any) => {
              const ligne = t.lignes?.[0]
              const isDestinataire = t.agenceDestId === agenceId
              return (
                <tr key={t.id}>
                  <td><strong>{t.referenceTransfert}</strong></td>
                  <td>{new Date(t.dateExpedition).toLocaleDateString()}</td>
                  <td>{t.agenceSource?.nom ?? `Agence #${t.agenceSourceId}`}</td>
                  <td>{t.agenceDest?.nom ?? `Agence #${t.agenceDestId}`}</td>
                  <td>
                    <div>{ligne?.article?.designation || 'Article'}</div>
                    <small style={{ color: 'var(--muted)' }}>Qté: <strong>{ligne?.quantite}</strong> sacs | Lot: {ligne?.numeroLot}</small>
                  </td>
                  <td>
                    {t.immatriculationCamion ? (
                      <div>
                        <code style={{ fontWeight: 700, color: 'var(--accent-strong)' }}>{t.immatriculationCamion}</code>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t.chauffeurNom}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Véhicule agence</span>
                    )}
                  </td>
                  <td>
                    <span className={clsx('badge', t.statut === 'RECU' ? 'badge-success' : t.statut === 'LITIGE' ? 'badge-danger' : 'badge-warning')}>
                      {t.statut === 'RECU' ? 'Réceptionné' : t.statut === 'LITIGE' ? 'Litige / Écart' : 'En transit'}
                    </span>
                  </td>
                  <td>
                    <div>Expédié par : {t.initiateurNom}</div>
                    {t.recepteurNom && <small style={{ color: 'var(--muted)' }}>Reçu par : {t.recepteurNom}</small>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        href={downloadUrl(`/api/stocks/transferts/${t.id}/feuille-route`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FilePdf size={15} /> Feuille de route
                      </a>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setVoucherTransfert(t)}
                      >
                        <Printer size={15} /> Aperçu
                      </button>
                      {t.statut === 'EN_TRANSIT' && isDestinataire && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => setReceptionTransfert(t)}
                        >
                          <CheckCircle size={15} /> Réceptionner
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {(transfertsQuery.data ?? []).length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                  Aucun ordre de transfert inter-agences enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NOUVEL ORDRE DE TRANSFERT */}
      {showNewTransfertModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Expédier un transfert de stock</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Les quantités expédiées seront automatiquement déduites du stock de départ et acheminées par convoi.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createTransfertMutation.mutate(); }}>
              <label>
                Agence de destination
                <select value={agenceDestId} onChange={(e) => setAgenceDestId(Number(e.target.value))}>
                  {(agencesQuery.data ?? [])
                    .filter((a: any) => a.id !== agenceId)
                    .map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.nom} ({ag.ville})
                      </option>
                    ))}
                </select>
              </label>

              <label style={{ marginTop: 12 }}>
                Article et lot FEFO à expédier
                <select
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">Sélectionner dans le stock de l agence...</option>
                  {(stockQuery.data ?? [])
                    .filter((s: any) => s.quantite > 0)
                    .map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.article?.designation} - Lot: {s.numeroLot} (Dispo : {s.quantite} sacs)
                      </option>
                    ))}
                </select>
              </label>

              <label style={{ marginTop: 12 }}>
                Camion de transport assigné (Flotte MVG)
                <select
                  value={selectedVehiculeId}
                  onChange={(e) => setSelectedVehiculeId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Affectation automatique / Aucun véhicule attitré</option>
                  {(flotteQuery.data ?? []).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.plaqueImmatriculation} - {v.marqueModele} ({v.capaciteTonnes}T / {v.capaciteSacs} sacs) - {v.chauffeurNom} [{v.statut}]
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ marginTop: 12 }}>
                Quantité en sacs à expédier
                <input
                  type="number"
                  min="1"
                  value={quantiteExpediee}
                  onChange={(e) => setQuantiteExpediee(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewTransfertModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createTransfertMutation.isPending}>
                  {createTransfertMutation.isPending ? 'Expédition...' : 'Valider expédition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECEPTION PHYSIQUE DESTINATAIRE */}
      {receptionTransfert && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Confirmer la réception physique</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Transfert : <strong>{receptionTransfert.referenceTransfert}</strong> en provenance de {receptionTransfert.agenceSource?.nom}.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); receptionMutation.mutate(); }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, marginBottom: 12 }}>
                <div><strong>Article expédié :</strong> {receptionTransfert.lignes?.[0]?.article?.designation}</div>
                <div><strong>Quantité annoncée :</strong> {receptionTransfert.lignes?.[0]?.quantite} sacs</div>
                <div><strong>Numéro de lot :</strong> {receptionTransfert.lignes?.[0]?.numeroLot}</div>
                {receptionTransfert.immatriculationCamion && (
                  <div><strong>Camion convoi :</strong> {receptionTransfert.immatriculationCamion} (Chauffeur : {receptionTransfert.chauffeurNom})</div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ecartConstate}
                  onChange={(e) => setEcartConstate(e.target.checked)}
                />
                <span>Signaler un écart physique ou avarie constatée</span>
              </label>

              {ecartConstate && (
                <label style={{ marginTop: 12 }}>
                  Motif de l écart / Perte constatée
                  <input
                    value={motifEcart}
                    onChange={(e) => setMotifEcart(e.target.value)}
                    placeholder="ex: 2 sacs déchirés pendant le transport..."
                    required
                  />
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setReceptionTransfert(null)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={receptionMutation.isPending}>
                  {receptionMutation.isPending ? 'Validation...' : 'Intégrer en stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BON DE LIVRAISON ET DE TRANSFERT IMPRIMABLE */}
      {voucherTransfert && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>BON DE TRANSFERT INTER-AGENCES</h3>
                <small style={{ color: 'var(--muted)' }}>MATABISHI ERP - MVG SARL</small>
              </div>
              <Truck size={28} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Bordereau N° :</strong> {voucherTransfert.referenceTransfert}</div>
              <div><strong>Date expédition :</strong> {new Date(voucherTransfert.dateExpedition).toLocaleString()}</div>
              <div><strong>Agence expéditrice :</strong> {voucherTransfert.agenceSource?.nom || `Agence #${voucherTransfert.agenceSourceId}`}</div>
              <div><strong>Agence réceptrice :</strong> {voucherTransfert.agenceDest?.nom || `Agence #${voucherTransfert.agenceDestId}`}</div>
              {voucherTransfert.immatriculationCamion && (
                <div><strong>Camion assigné :</strong> {voucherTransfert.immatriculationCamion} ({voucherTransfert.chauffeurNom})</div>
              )}
              <div><strong>Responsable expédition :</strong> {voucherTransfert.initiateurNom}</div>
              <div style={{ marginTop: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6 }}>
                <strong>Détail des sacs acheminés :</strong>
                {(voucherTransfert.lignes || []).map((l: any, i: number) => (
                  <div key={i} style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    - {l.article?.designation || 'Farine'} : <strong>{l.quantite} sacs</strong> (Lot: {l.numeroLot})
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <a
                className="secondary-action"
                href={downloadUrl(`/api/stocks/transferts/${voucherTransfert.id}/feuille-route`)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <FilePdf size={17} /> Imprimer Feuille de Route A4
              </a>
              <button className="primary-action" onClick={() => setVoucherTransfert(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
