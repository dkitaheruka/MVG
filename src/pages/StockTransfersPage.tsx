import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  X,
  Truck,
  Printer,
  CheckCircle,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'

export function StockTransfersPage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transferts-stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setShowNewTransfertModal(false)
      setSelectedStockId('')
      setQuantiteExpediee('10')
      setVoucherTransfert(data)
      setActionError(null)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
            <Truck size={26} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Transferts de Stock Inter-Agences</h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Mouvements de marchandises entre le siège et les succursales, confirmation de réception et arbitrage des écarts.
            </p>
          </div>
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
                    <small style={{ color: 'var(--muted)' }}>Qté: <strong>{ligne?.quantite}</strong> | Lot: {ligne?.numeroLot}</small>
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setVoucherTransfert(t)}
                      >
                        <Printer size={15} /> Bon Livraison
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
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                  Aucun transfert de stock enregistré pour cette agence.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL EXPEDITION NOUVEAU TRANSFERT */}
      {showNewTransfertModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Initier un transfert de stock</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Les marchandises sont immédiatement déduites du stock expéditeur et placées sous statut En transit.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createTransfertMutation.mutate(); }}>
              <label>
                Agence destinataire
                <select value={agenceDestId} onChange={(e) => setAgenceDestId(Number(e.target.value))} required>
                  {(agencesQuery.data ?? [])
                    .filter((ag: any) => ag.id !== agenceId)
                    .map((ag: any) => (
                      <option key={ag.id} value={ag.id}>{ag.nom} ({ag.ville})</option>
                    ))}
                </select>
              </label>

              <label style={{ marginTop: 12 }}>
                Ligne de stock expédiée
                <select value={selectedStockId} onChange={(e) => setSelectedStockId(Number(e.target.value))} required>
                  <option value="">Sélectionner un article & lot disponible</option>
                  {(stockQuery.data ?? []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.article?.designation} - Lot {s.numeroLot} (Dispo : {s.quantite})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ marginTop: 12 }}>
                Quantité expédiée
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
                <div><strong>Quantité annoncée :</strong> {receptionTransfert.lignes?.[0]?.quantite} unités</div>
                <div><strong>Numéro de lot :</strong> {receptionTransfert.lignes?.[0]?.numeroLot}</div>
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
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>BON DE LIVRAISON INTER-AGENCES</h3>
                <small style={{ color: 'var(--muted)' }}>MATABISHI ERP - MVG SARL</small>
              </div>
              <Truck size={28} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Bordereau N° :</strong> {voucherTransfert.referenceTransfert}</div>
              <div><strong>Date expédition :</strong> {new Date(voucherTransfert.dateExpedition).toLocaleString()}</div>
              <div><strong>Agence expéditrice :</strong> {voucherTransfert.agenceSource?.nom || `Agence #${voucherTransfert.agenceSourceId}`}</div>
              <div><strong>Agence réceptrice :</strong> {voucherTransfert.agenceDest?.nom || `Agence #${voucherTransfert.agenceDestId}`}</div>
              <div><strong>Responsable expédition :</strong> {voucherTransfert.initiateurNom}</div>
              <div style={{ marginTop: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6 }}>
                <strong>Détail des marchandises acheminées :</strong>
                {(voucherTransfert.lignes || []).map((l: any, i: number) => (
                  <div key={i} style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    - {l.article?.designation || 'Article'} : <strong>{l.quantite} unités</strong> (Lot: {l.numeroLot})
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="primary-action" onClick={() => setVoucherTransfert(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
