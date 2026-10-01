import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  X,
  UsersThree,
  UserPlus,
  Wallet,
  Receipt,
  Printer,
  CheckCircle,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)

  const [activeTab, setActiveTab] = useState<'achats' | 'fournisseurs'>('achats')
  const [showNewAchatModal, setShowNewAchatModal] = useState(false)
  const [showNewFournisseurModal, setShowNewFournisseurModal] = useState(false)
  const [paymentAchat, setPaymentAchat] = useState<any | null>(null)
  const [paymentMontant, setPaymentMontant] = useState('')
  const [paymentCaisseId, setPaymentCaisseId] = useState(1)
  const [voucherAchat, setVoucherAchat] = useState<any | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form states for new purchase
  const [fournisseurId, setFournisseurId] = useState<number | ''>(1)
  const [articleId, setArticleId] = useState<number | ''>(5) // default raw wheat
  const [quantite, setQuantite] = useState('10')
  const [prixUnitaire, setPrixUnitaire] = useState('45')
  const [numeroLot, setNumeroLot] = useState(`LOT-RAW-${new Date().toISOString().slice(2, 7).replace('-', '')}-01`)
  const [dateExpiration, setDateExpiration] = useState('2027-12-31')
  const [montantPaye, setMontantPaye] = useState('0')
  const [devise, setDevise] = useState<'USD' | 'CDF'>('USD')

  // Form states for new supplier
  const [fournisseurNom, setFournisseurNom] = useState('')
  const [fournisseurContact, setFournisseurContact] = useState('')
  const [fournisseurTel, setFournisseurTel] = useState('')
  const [fournisseurAdresse, setFournisseurAdresse] = useState('')

  const achatsQuery = useQuery({
    queryKey: ['achats', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/achats?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const fournisseursQuery = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: () => apiRequest<any[]>('/api/fournisseurs', { token }),
    enabled: Boolean(token),
  })

  const createAchatMutation = useMutation({
    mutationFn: () => {
      const q = Number(quantite)
      const pu = Number(prixUnitaire)
      const total = q * pu
      return apiRequest('/api/achats', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          fournisseurId: Number(fournisseurId),
          montantTotal: total,
          montantPaye: Number(montantPaye),
          devise,
          lignes: [
            {
              articleId: Number(articleId),
              quantite: q,
              prixUnitaire: pu,
              numeroLot,
              dateExpiration,
            },
          ],
        }),
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['achats'] })
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setShowNewAchatModal(false)
      setVoucherAchat(data)
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de l enregistrement de l achat'),
  })

  const createFournisseurMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/fournisseurs', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: fournisseurNom,
          contact: fournisseurContact,
          telephone: fournisseurTel,
          adresse: fournisseurAdresse,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] })
      setShowNewFournisseurModal(false)
      setFournisseurNom('')
      setFournisseurContact('')
      setFournisseurTel('')
      setFournisseurAdresse('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la création du fournisseur'),
  })

  const payerFactureMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/achats/${paymentAchat.id}/payer`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          montant: Number(paymentMontant),
          caisseId: paymentCaisseId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achats'] })
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setPaymentAchat(null)
      setPaymentMontant('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors du paiement fournisseur'),
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
            <Package size={26} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Achats & Approvisionnements</h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Commandes directes du chef d agence, réception en stock par lots et gestion des dettes fournisseurs (compte 401).
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-action" onClick={() => setShowNewFournisseurModal(true)}>
            <UserPlus size={18} /> Nouveau Fournisseur
          </button>
          <button className="primary-action" onClick={() => setShowNewAchatModal(true)}>
            <Plus size={18} /> Nouvelle Commande / Réception
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
        <button className={clsx('tab-button', activeTab === 'achats' && 'active')} onClick={() => setActiveTab('achats')}>
          <Receipt size={17} /> Commandes & Réceptions ({achatsQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'fournisseurs' && 'active')} onClick={() => setActiveTab('fournisseurs')}>
          <UsersThree size={17} /> Portefeuille Fournisseurs ({fournisseursQuery.data?.length ?? 0})
        </button>
      </div>

      {activeTab === 'achats' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Réf Achat</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Article & Lot</th>
                <th>Quantité</th>
                <th>Montant Total</th>
                <th>Payé</th>
                <th>Reste Dû</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(achatsQuery.data ?? []).map((achat: any) => {
                const reste = Math.max(0, achat.montantTotal - achat.montantPaye)
                const ligne = achat.lignes?.[0]
                return (
                  <tr key={achat.id}>
                    <td><strong>{achat.referenceAchat}</strong></td>
                    <td>{new Date(achat.dateAchat).toLocaleDateString()}</td>
                    <td>{achat.fournisseur?.nom ?? 'Fournisseur direct'}</td>
                    <td>
                      <div>{ligne?.article?.designation || 'Matière / Marchandise'}</div>
                      <small style={{ color: 'var(--muted)' }}>Lot: {ligne?.numeroLot}</small>
                    </td>
                    <td><strong>{ligne?.quantite} unités</strong></td>
                    <td>${achat.montantTotal.toFixed(2)} {achat.devise}</td>
                    <td style={{ color: 'var(--success)' }}>${achat.montantPaye.toFixed(2)}</td>
                    <td style={{ color: reste > 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: reste > 0 ? 700 : 400 }}>
                      ${reste.toFixed(2)}
                    </td>
                    <td>
                      <span className={clsx('badge', achat.statut === 'CLOTURE' ? 'badge-success' : 'badge-warning')}>
                        {achat.statut === 'CLOTURE' ? 'Soldé' : 'Réceptionné (En cours)'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="secondary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => setVoucherAchat(achat)}
                        >
                          <Printer size={15} /> Bon Réception
                        </button>
                        {reste > 0 && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setPaymentAchat(achat)
                              setPaymentMontant(String(reste))
                            }}
                          >
                            <Wallet size={15} /> Régler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(achatsQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    Aucun achat fournisseur enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'fournisseurs' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Raison Sociale</th>
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                <th>Solde Dû (Compte 401)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(fournisseursQuery.data ?? []).map((f: any) => (
                <tr key={f.id}>
                  <td><strong>{f.nom}</strong></td>
                  <td>{f.contact || '-'}</td>
                  <td>{f.telephone || '-'}</td>
                  <td>{f.adresse || '-'}</td>
                  <td style={{ color: f.soldeDette > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                    ${f.soldeDette.toFixed(2)} USD
                  </td>
                  <td>
                    <span className={clsx('badge', f.soldeDette > 0 ? 'badge-warning' : 'badge-success')}>
                      {f.soldeDette > 0 ? 'Encours fournisseur' : 'Compte apuré'}
                    </span>
                  </td>
                </tr>
              ))}
              {(fournisseursQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    Aucun fournisseur enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NOUVELLE COMMANDE / RECEPTION ACHAT */}
      {showNewAchatModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <h3>Commande et réception fournisseur</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Le chef d agence passe la commande locale et valide la réception physique en stock.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createAchatMutation.mutate(); }}>
              <label>
                Fournisseur
                <select value={fournisseurId} onChange={(e) => setFournisseurId(Number(e.target.value))} required>
                  <option value="">Sélectionner un fournisseur</option>
                  {(fournisseursQuery.data ?? []).map((f: any) => (
                    <option key={f.id} value={f.id}>{f.nom} (Encours: ${f.soldeDette})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Article approvisionné
                  <select value={articleId} onChange={(e) => setArticleId(Number(e.target.value))} required>
                    <option value="5">Blé Grain Brut d Importation (Tonne)</option>
                    <option value="6">Sucre de Canne Pur (Sac 50kg)</option>
                    <option value="1">Farine de Froment MVG Extra 25kg (Sac)</option>
                    <option value="2">Huile de Palme Raffinée 20L (Bidon)</option>
                  </select>
                </label>
                <label>
                  Quantité reçue
                  <input type="number" min="1" step="any" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Prix unitaire
                  <input type="number" min="0" step="0.01" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} required />
                </label>
                <label>
                  Devise
                  <select value={devise} onChange={(e) => setDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </label>
                <label>
                  Acompte versé
                  <input type="number" min="0" step="0.01" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Numéro de lot créé
                  <input value={numeroLot} onChange={(e) => setNumeroLot(e.target.value)} required />
                </label>
                <label>
                  Date d expiration (DLUO)
                  <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} required />
                </label>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Montant total de la facture :</span>
                  <strong>${(Number(quantite || 0) * Number(prixUnitaire || 0)).toFixed(2)} USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
                  <span>Dette restante créée (Compte 401) :</span>
                  <strong>${Math.max(0, Number(quantite || 0) * Number(prixUnitaire || 0) - Number(montantPaye || 0)).toFixed(2)} USD</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAchatModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAchatMutation.isPending}>
                  {createAchatMutation.isPending ? 'Enregistrement...' : 'Valider réception & Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU FOURNISSEUR */}
      {showNewFournisseurModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Nouveau Fournisseur</h3>
            <form onSubmit={(e) => { e.preventDefault(); createFournisseurMutation.mutate(); }}>
              <label>
                Raison sociale
                <input value={fournisseurNom} onChange={(e) => setFournisseurNom(e.target.value)} placeholder="ex: Minoterie du Kivu" required />
              </label>
              <label style={{ marginTop: 12 }}>
                Nom du contact / Responsable
                <input value={fournisseurContact} onChange={(e) => setFournisseurContact(e.target.value)} placeholder="ex: M. Sylvain" />
              </label>
              <label style={{ marginTop: 12 }}>
                Téléphone
                <input value={fournisseurTel} onChange={(e) => setFournisseurTel(e.target.value)} placeholder="ex: +243 99..." />
              </label>
              <label style={{ marginTop: 12 }}>
                Adresse physique
                <input value={fournisseurAdresse} onChange={(e) => setFournisseurAdresse(e.target.value)} placeholder="ex: Zone Industrielle, Goma" />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewFournisseurModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createFournisseurMutation.isPending}>
                  {createFournisseurMutation.isPending ? 'Création...' : 'Créer fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGLEMENT FACTURE FOURNISSEUR */}
      {paymentAchat && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Règlement dette fournisseur</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Fournisseur : <strong>{paymentAchat.fournisseur?.nom}</strong> | Facture : <strong>{paymentAchat.referenceAchat}</strong>
            </p>
            <form onSubmit={(e) => { e.preventDefault(); payerFactureMutation.mutate(); }}>
              <label>
                Montant à verser ($)
                <input
                  type="number"
                  step="0.01"
                  max={paymentAchat.montantTotal - paymentAchat.montantPaye}
                  value={paymentMontant}
                  onChange={(e) => setPaymentMontant(e.target.value)}
                  required
                />
              </label>
              <label style={{ marginTop: 12 }}>
                Caisse débitrice
                <select value={paymentCaisseId} onChange={(e) => setPaymentCaisseId(Number(e.target.value))}>
                  <option value="1">Caisse Principale USD/CDF</option>
                  <option value="2">Caisse Ventes Comptoir</option>
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setPaymentAchat(null)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={payerFactureMutation.isPending}>
                  {payerFactureMutation.isPending ? 'Paiement...' : 'Décaisser et valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BON DE RECEPTION ET COMMANDE D ACHAT */}
      {voucherAchat && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>BON DE RECEPTION D ACHAT</h3>
                <small style={{ color: 'var(--muted)' }}>MATABISHI ERP - MVG SARL</small>
              </div>
              <CheckCircle size={28} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Référence :</strong> {voucherAchat.referenceAchat}</div>
              <div><strong>Date :</strong> {new Date(voucherAchat.dateAchat).toLocaleString()}</div>
              <div><strong>Fournisseur :</strong> {voucherAchat.fournisseur?.nom || 'Fournisseur local'}</div>
              <div><strong>Montant Total :</strong> ${voucherAchat.montantTotal.toFixed(2)} {voucherAchat.devise}</div>
              <div><strong>Montant Décaissé :</strong> ${voucherAchat.montantPaye.toFixed(2)}</div>
              <div><strong>Dette restante (401) :</strong> ${(voucherAchat.montantTotal - voucherAchat.montantPaye).toFixed(2)}</div>
              <div style={{ marginTop: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6 }}>
                <strong>Articles intégrés en stock :</strong>
                {(voucherAchat.lignes || []).map((l: any, i: number) => (
                  <div key={i} style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    - {l.quantite} unités | Lot: {l.numeroLot} | Exp: {l.dateExpiration}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="primary-action" onClick={() => setVoucherAchat(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
