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
  FileText,
  Coins,
  ArrowClockwise,
  ShieldCheck,
  Money,
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

  const [activeTab, setActiveTab] = useState<'feuille-paie' | 'bulletins' | 'avances' | 'agents'>('feuille-paie')
  const [selectedMois, setSelectedMois] = useState<number>(9)
  const [selectedAnnee, setSelectedAnnee] = useState<number>(2026)

  const [showNewAgentModal, setShowNewAgentModal] = useState(false)
  const [showEBModal, setShowEBModal] = useState(false)
  const [showNewAvanceModal, setShowNewAvanceModal] = useState(false)
  const [showGenerateBulletinModal, setShowGenerateBulletinModal] = useState(false)
  const [voucherBulletin, setVoucherBulletin] = useState<any | null>(null)
  const [voucherAvance, setVoucherAvance] = useState<any | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Form states for agent
  const [agentNom, setAgentNom] = useState('')
  const [agentTel, setAgentTel] = useState('')
  const [agentPoste, setAgentPoste] = useState('Opérateur Meunerie')
  const [agentCategorie, setAgentCategorie] = useState('I')
  const [agentSalaire, setAgentSalaire] = useState('559000')
  const [agentTransport, setAgentTransport] = useState('0')
  const [agentLogement, setAgentLogement] = useState('0')
  const [agentCommission, setAgentCommission] = useState('0')
  const [agentDevise, setAgentDevise] = useState<'USD' | 'CDF'>('CDF')

  // Form states for advance
  const [avanceAgentId, setAvanceAgentId] = useState<number | ''>(5)
  const [avanceMontant, setAvanceMontant] = useState('50000')
  const [avanceDevise, setAvanceDevise] = useState<'USD' | 'CDF'>('CDF')
  const [avanceMotif, setAvanceMotif] = useState('')

  // Form states for generating individual bulletin
  const [bulletinAgentId, setBulletinAgentId] = useState<number | ''>(5)
  const [bulletinMois, setBulletinMois] = useState(9)
  const [bulletinAnnee, setBulletinAnnee] = useState(2026)

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const agentsQuery = useQuery({
    queryKey: ['rh-agents', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/agents?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const feuillePaieQuery = useQuery({
    queryKey: ['rh-feuille-paie', agenceId, selectedMois, selectedAnnee],
    queryFn: () =>
      apiRequest<any>(
        `/api/rh/feuille-paie?agenceId=${agenceId}&mois=${selectedMois}&annee=${selectedAnnee}`,
        { token }
      ),
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
          categorie: agentCategorie,
          salaireBase: Number(agentSalaire),
          indemniteTransport: Number(agentTransport),
          indemniteLogement: Number(agentLogement),
          tauxCommission: Number(agentCommission),
          devise: agentDevise,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-agents'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setShowNewAgentModal(false)
      setAgentNom('')
      setAgentTel('')
      setActionError(null)
      setActionSuccess('Collaborateur enregistré avec succès !')
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
      setActionSuccess('Demande d avance enregistrée avec succès.')
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
      setActionSuccess('Avance validée par le Chef d Agence.')
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
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Avance décaissée en caisse et comptabilisée.')
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
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setShowGenerateBulletinModal(false)
      setVoucherBulletin(data)
      setActionError(null)
      setActionSuccess(`Bulletin calculé avec succès : Net à payer ${Number(data.netAPayer).toLocaleString()} ${data.devise}`)
      if (data && data.id) {
        setPrintProposal({
          title: 'Bulletin de Paie Édité avec Succès !',
          ref: data.referenceBulletin || `PAY-${data.id}`,
          subtitle: `Le bulletin de l'agent a été calculé selon le barème RDC (CNSS, IPR, INPP, ONEM).`,
          primaryDocName: 'Bulletin de Paie Individuel Officiel (A4)',
          primaryDocUrl: `/api/rh/bulletins/${data.id}/document`,
        })
      }
    },
    onError: (err: any) => setActionError(err.message || 'Erreur calcul bulletin'),
  })

  const genererFeuilleMoisMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/generer-mois', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
      setActionSuccess(`Feuille de paie du mois ${moisNoms[selectedMois - 1]} ${selectedAnnee} calculée avec succès pour tous les collaborateurs !`)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur génération globale'),
  })

  const validerToutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/valider-tout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
      setActionSuccess('Tous les bulletins du mois ont été validés par le Comptable Senior.')
    },
    onError: (err: any) => setActionError(err.message || 'Validation refusée : réservée au Comptable Senior'),
  })

  const payerToutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/payer-tout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Paie globale décaissée avec succès en caisse ! Écritures SYSCOHADA passées au journal.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur décaissement de la paie globale'),
  })

  const validerBulletinMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/bulletins/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setActionError(null)
      setActionSuccess('Bulletin individuel validé par le Comptable Senior.')
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
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Salaire payé avec succès et caisse décaissée.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur paiement du bulletin'),
  })

  const feuilleData = feuillePaieQuery.data
  const totaux = feuilleData?.totaux || {
    salaireBase: 0,
    indemniteTransport: 0,
    indemniteLogement: 0,
    salaireBrut: 0,
    cnssQpo: 0,
    cnssQpp: 0,
    remunerationImposable: 0,
    ipr: 0,
    inpp: 0,
    onem: 0,
    netAPayer: 0,
  }

  const feuilleUrl = `/api/rh/feuille-paie/document?agenceId=${agenceId}&mois=${selectedMois}&annee=${selectedAnnee}`

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
            <UsersThree size={26} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text)' }}>Ressources Humaines & Feuille de Paie</h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Conforme RDC : Salaires de base, indemnités transport/logement, CNSS (5% QPO & 13% QPP), IPR (barème DGI), INPP 3,5%, ONEM 0,5% et écritures SYSCOHADA.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="secondary-action"
            href={feuilleUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Imprimer la feuille de paie officielle en format A4 paysage"
          >
            <Printer size={18} /> Imprimer Feuille de Paie (Livre A4)
          </a>
          <button
            className="secondary-action"
            onClick={() => setShowEBModal(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour les salaires ou charges sociales"
          >
            <Coins size={18} /> Demande de Fonds RH
          </button>
          <button className="secondary-action" onClick={() => setShowNewAvanceModal(true)}>
            <Wallet size={18} /> Demande d Avance
          </button>
          <button className="secondary-action" onClick={() => setShowNewAgentModal(true)}>
            <UserPlus size={18} /> + Collaborateur
          </button>
        </div>
      </div>

      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      {actionSuccess && (
        <div className="notice success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--success)', color: 'var(--success)' }}>
          <span>✓ {actionSuccess}</span>
          <button className="icon-button" onClick={() => setActionSuccess(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'feuille-paie' && 'active')} onClick={() => setActiveTab('feuille-paie')}>
          <FileText size={17} /> Feuille de Paie Collective (Livre de Paie RDC)
        </button>
        <button className={clsx('tab-button', activeTab === 'bulletins' && 'active')} onClick={() => setActiveTab('bulletins')}>
          <Receipt size={17} /> Bulletins Individuels ({bulletinsQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'avances' && 'active')} onClick={() => setActiveTab('avances')}>
          <Wallet size={17} /> Avances sur Salaire ({avancesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'agents' && 'active')} onClick={() => setActiveTab('agents')}>
          <UsersThree size={17} /> Personnel & Rémunérations ({agentsQuery.data?.length ?? 0})
        </button>
      </div>

      {/* ---------------- TAB 1 : FEUILLE DE PAIE COLLECTIVE (LIVRE DE PAIE RDC) ---------------- */}
      {activeTab === 'feuille-paie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* BARRE DE CONTRÔLE DE LA PÉRIODE & ACTIONS GLOBALES */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Période de Paie :</span>
              <select
                value={selectedMois}
                onChange={(e) => setSelectedMois(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {moisNoms.map((nom, i) => (
                  <option key={i + 1} value={i + 1}>{nom}</option>
                ))}
              </select>
              <select
                value={selectedAnnee}
                onChange={(e) => setSelectedAnnee(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <span className="badge badge-accent" style={{ fontSize: '0.8rem' }}>
                Agence #{agenceId}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                onClick={() => genererFeuilleMoisMutation.mutate()}
                disabled={genererFeuilleMoisMutation.isPending}
                title="Recalculer les salaires bruts, retenues CNSS et IPR pour tous les agents de l agence"
              >
                <ArrowClockwise size={16} /> {genererFeuilleMoisMutation.isPending ? 'Calcul en cours...' : 'Calculer / Actualiser le Mois'}
              </button>

              <button
                type="button"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)' }}
                onClick={() => validerToutMutation.mutate()}
                disabled={validerToutMutation.isPending}
                title="Visa officiel réservé au Comptable Senior distinct"
              >
                <ShieldCheck size={16} /> Valider le Livre de Paie (Comptable Sr)
              </button>

              <button
                type="button"
                className="primary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--success)' }}
                onClick={() => payerToutMutation.mutate()}
                disabled={payerToutMutation.isPending}
                title="Décaisser les salaires nets de la caisse et générer les écritures comptables SYSCOHADA"
              >
                <Money size={16} /> Payer la Paie du Mois (Caisse)
              </button>
            </div>
          </div>

          {/* SYNTHÈSE DES TOTAUX LÉGAUX */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL SALAIRES BRUTS :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
                {totaux.salaireBrut.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL CNSS (QPO 5% + QPP 13%) :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--accent-strong)', display: 'block', marginTop: 4 }}>
                {(totaux.cnssQpo + totaux.cnssQpp).toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                QPO 5% : {totaux.cnssQpo.toLocaleString()} | QPP 13% : {totaux.cnssQpp.toLocaleString()}
              </small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL IPR (BARÈME DGI) :</span>
              <strong style={{ fontSize: '1.15rem', color: '#b91c1c', display: 'block', marginTop: 4 }}>
                {totaux.ipr.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Impôt Professionnel à déclarer</small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>CHARGES PATRONALES (INPP + ONEM) :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
                {(totaux.inpp + totaux.onem).toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                INPP 3,5% : {totaux.inpp.toLocaleString()} | ONEM 0,5% : {totaux.onem.toLocaleString()}
              </small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '2px solid var(--success)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>NET GLOBAL À PAYER :</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--success)', display: 'block', marginTop: 4 }}>
                {totaux.netAPayer.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Montant net décaissé aux collaborateurs</small>
            </div>
          </div>

          {/* TABLEAU EXACT CONFORME À LA FEUILLE DE PAIE OFFICIELLE (14 COLONNES) */}
          <div className="table-wrap" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ width: '100%', minWidth: 1050, fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', width: 40 }}>N° Ordre</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'left', minWidth: 160 }}>NOMS & POST-NOMS</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', width: 70 }}>CATEGORIE</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95 }}>SALAIRES DE BASE</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>INDEMNITES TRANSPORT</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>INDEMNITES LOGEMENT</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95, fontWeight: 800 }}>SALAIRE BRUTE</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>CNSS</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95 }}>REMUNERATION IMPOSABLE</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>IPR (BAREME)</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 70 }}>INPP 3,5%</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 65 }}>ONEM 0.5%</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95, fontWeight: 900, color: 'var(--success)' }}>NET A PAYER</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', minWidth: 110 }}>STATUT / ACTIONS</th>
                </tr>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '0.74rem' }}>Q.P.O 5%</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '0.74rem' }}>Q.P.P 13%</th>
                </tr>
              </thead>
              <tbody>
                {(feuilleData?.bulletins ?? []).map((b: any, index: number) => {
                  const nomAgent = b.agent?.nom || b.agentNom || `Collaborateur #${b.agentId}`
                  const categorie = b.categorie || b.agent?.categorie || 'I'
                  const base = Number(b.salaireBase || 0)
                  const transp = Number(b.indemniteTransport || 0)
                  const logt = Number(b.indemniteLogement || 0)
                  const brut = Number(b.salaireBrut || (base + transp + logt))
                  const qpo = Number(b.cnssQpo || 0)
                  const qpp = Number(b.cnssQpp || 0)
                  const imposable = Number(b.remunerationImposable || (brut - qpo))
                  const iprVal = Number(b.ipr || 0)
                  const inppVal = Number(b.inpp || 0)
                  const onemVal = Number(b.onem || 0)
                  const net = Number(b.netAPayer || 0)

                  return (
                    <tr key={b.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{index + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text)' }}>{nomAgent}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ fontSize: '0.75rem' }}>{categorie}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{base.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', color: transp > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {transp > 0 ? transp.toLocaleString('fr-FR') : '0'}
                      </td>
                      <td style={{ textAlign: 'right', color: logt > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {logt > 0 ? logt.toLocaleString('fr-FR') : '0'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                        {brut.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'right' }}>{qpo.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right' }}>{qpp.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{imposable.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>{iprVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right' }}>{inppVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right' }}>{onemVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.92rem', color: 'var(--success)' }}>
                        {net.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span className={clsx('badge', b.statut === 'PAYE' ? 'badge-success' : b.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')} style={{ fontSize: '0.7rem' }}>
                            {b.statut === 'PAYE' ? 'Payé' : b.statut === 'VALIDE' ? 'Validé' : 'Brouillon'}
                          </span>
                          {b.id && (
                            <a
                              href={`/api/rh/bulletins/${b.id}/document`}
                              target="_blank"
                              rel="noreferrer"
                              title="Imprimer le bulletin individuel officiel"
                              style={{ color: 'var(--accent-strong)', padding: 3 }}
                            >
                              <Printer size={15} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* LIGNE DE TOTALISATION OFFICIELLE (TOTAL) */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 900, borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)' }}>
                  <td colSpan={3} style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.salaireBase.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.indemniteTransport.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.indemniteLogement.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--text)' }}>{totaux.salaireBrut.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.cnssQpo.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.cnssQpp.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.remunerationImposable.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#b91c1c' }}>{totaux.ipr.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.inpp.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.onem.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--success)', fontSize: '0.98rem' }}>{totaux.netAPayer.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>{feuilleData?.bulletins?.length ?? 0} salariés</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2 : BULLETINS INDIVIDUELS ---------------- */}
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
                  <th>Catégorie</th>
                  <th>Salaire Base</th>
                  <th>Brut Total</th>
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
                    <td><span className="badge">{b.categorie || b.agent?.categorie || 'I'}</span></td>
                    <td>{Number(b.salaireBase || 0).toLocaleString('fr-FR')} {b.devise}</td>
                    <td style={{ fontWeight: 700 }}>{Number(b.salaireBrut || b.salaireBase).toLocaleString('fr-FR')} {b.devise}</td>
                    <td><strong style={{ fontSize: '1.02rem', color: 'var(--success)' }}>{Number(b.netAPayer).toLocaleString('fr-FR')} {b.devise}</strong></td>
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
                            <CheckCircle size={15} /> Valider
                          </button>
                        )}
                        {b.statut === 'VALIDE' && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                            onClick={() => payerBulletinMutation.mutate(b.id)}
                          >
                            <Wallet size={15} /> Payer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(bulletinsQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      Aucun bulletin individuel généré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3 : AVANCES SUR SALAIRE ---------------- */}
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
                  <td><strong>{Number(av.montant).toLocaleString()} {av.devise}</strong></td>
                  <td>{av.motif}</td>
                  <td>
                    <small>
                      Demandé par : {av.demandeurNom}<br />
                      {av.validateurNom && `Validé par : ${av.validateurNom}`}
                    </small>
                  </td>
                  <td>
                    <span className={clsx('badge', av.statut === 'DECAISSE' ? 'badge-success' : av.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')}>
                      {av.statut === 'DECAISSE' ? 'Décaissé' : av.statut === 'VALIDE' ? 'Validé Chef' : 'En attente'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setVoucherAvance(av)}
                      >
                        <Receipt size={14} /> Reçu
                      </button>
                      {av.statut === 'EN_ATTENTE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => validerAvanceMutation.mutate(av.id)}
                        >
                          <CheckCircle size={14} /> Valider
                        </button>
                      )}
                      {av.statut === 'VALIDE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                          onClick={() => decaisserAvanceMutation.mutate(av.id)}
                        >
                          <Wallet size={14} /> Décaisser
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

      {/* ---------------- TAB 4 : PERSONNEL & COLLABORATEURS ---------------- */}
      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Collaborateurs rattachés à l agence #{agenceId} :
            </span>
            <button className="primary-action" onClick={() => setShowNewAgentModal(true)}>
              <UserPlus size={16} /> Nouveau Collaborateur
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom & Post-nom</th>
                  <th>Catégorie</th>
                  <th>Poste & Rôle</th>
                  <th>Téléphone</th>
                  <th>Salaire de Base</th>
                  <th>Indemnités (Transp. / Logt.)</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(agentsQuery.data ?? []).map((ag: any) => (
                  <tr key={ag.id}>
                    <td><code>{ag.matricule}</code></td>
                    <td><strong>{ag.nom}</strong></td>
                    <td><span className="badge">{ag.categorie || 'I'}</span></td>
                    <td>{ag.poste}</td>
                    <td>{ag.telephone || 'Non renseigné'}</td>
                    <td><strong>{Number(ag.salaireBase).toLocaleString()} {ag.devise || 'CDF'}</strong></td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Transp : {Number(ag.indemniteTransport || 0).toLocaleString()} | Logt : {Number(ag.indemniteLogement || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('badge', ag.actif ? 'badge-success' : 'badge-danger')}>
                        {ag.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setBulletinAgentId(ag.id)
                          setShowGenerateBulletinModal(true)
                        }}
                      >
                        Calculer Bulletin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CALCULER UN BULLETIN */}
      {showGenerateBulletinModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Calculer un Bulletin Individuel</h3>
            <form onSubmit={(e) => { e.preventDefault(); genererBulletinMutation.mutate(); }}>
              <label>
                Collaborateur
                <select value={bulletinAgentId} onChange={(e) => setBulletinAgentId(Number(e.target.value))} required>
                  {(agentsQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.nom} ({ag.poste} - Cat. {ag.categorie || 'I'})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Mois
                  <select value={bulletinMois} onChange={(e) => setBulletinMois(Number(e.target.value))}>
                    {moisNoms.map((nom, i) => (
                      <option key={i + 1} value={i + 1}>{nom}</option>
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
                  {genererBulletinMutation.isPending ? 'Calcul...' : 'Calculer selon barème'}
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
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <label style={{ marginTop: 12 }}>
                Motif de la demande
                <input value={avanceMotif} onChange={(e) => setAvanceMotif(e.target.value)} placeholder="ex: Frais médicaux urgents..." required />
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
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <h3>Ajouter un Collaborateur</h3>
            <form onSubmit={(e) => { e.preventDefault(); createAgentMutation.mutate(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Nom & Post-nom complet
                  <input value={agentNom} onChange={(e) => setAgentNom(e.target.value)} placeholder="ex: MR TSHILOMBO" required />
                </label>
                <label>
                  Catégorie
                  <select value={agentCategorie} onChange={(e) => setAgentCategorie(e.target.value)}>
                    <option value="I">Catégorie I</option>
                    <option value="II">Catégorie II</option>
                    <option value="III">Catégorie III</option>
                    <option value="Cadre">Cadre</option>
                    <option value="Maîtrise">Maîtrise</option>
                    <option value="Exécution">Exécution</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Poste / Fonction
                  <input value={agentPoste} onChange={(e) => setAgentPoste(e.target.value)} placeholder="ex: Opérateur Meunerie" required />
                </label>
                <label>
                  Téléphone
                  <input value={agentTel} onChange={(e) => setAgentTel(e.target.value)} placeholder="ex: +243..." />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Salaire de Base Fixe
                  <input type="number" min="0" value={agentSalaire} onChange={(e) => setAgentSalaire(e.target.value)} required />
                </label>
                <label>
                  Devise
                  <select value={agentDevise} onChange={(e) => setAgentDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="CDF">CDF (Francs)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Indemnités de Transport
                  <input type="number" min="0" value={agentTransport} onChange={(e) => setAgentTransport(e.target.value)} />
                </label>
                <label>
                  Indemnités de Logement
                  <input type="number" min="0" value={agentLogement} onChange={(e) => setAgentLogement(e.target.value)} />
                </label>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>
                  Commission sur ventes (% commercial)
                  <input type="number" min="0" step="0.1" value={agentCommission} onChange={(e) => setAgentCommission(e.target.value)} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAgentModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAgentMutation.isPending}>
                  {createAgentMutation.isPending ? 'Enregistrement...' : 'Enregistrer collaborateur'}
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
                <h3 style={{ margin: 0, color: 'var(--text)' }}>BULLETIN INDIVIDUEL DE PAIE</h3>
                <small style={{ color: 'var(--muted)' }}>RESSOURCES HUMAINES & GESTION SOCIALE</small>
              </div>
              <FilePdf size={28} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Référence :</strong> {voucherBulletin.referenceBulletin}</div>
              <div><strong>Période de paie :</strong> {voucherBulletin.mois} / {voucherBulletin.annee}</div>
              <div><strong>Bénéficiaire :</strong> {voucherBulletin.agent?.nom || 'Collaborateur'}</div>
              <div><strong>Poste :</strong> {voucherBulletin.agent?.poste || 'Agent'} (Cat. {voucherBulletin.categorie || 'I'})</div>
              <div style={{ margin: '8px 0', padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salaire de base :</span>
                  <strong>{Number(voucherBulletin.salaireBase || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salaire brut total :</span>
                  <strong>{Number(voucherBulletin.salaireBrut || voucherBulletin.salaireBase).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Retenue CNSS QPO (5%) :</span>
                  <strong>-{Number(voucherBulletin.cnssQpo || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>Retenue IPR (Barème DGI) :</span>
                  <strong>-{Number(voucherBulletin.ipr || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                {Number(voucherBulletin.avancesDeduites || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Avances déduites :</span>
                    <strong>-{Number(voucherBulletin.avancesDeduites).toLocaleString()} {voucherBulletin.devise}</strong>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                  <span>NET A PAYER :</span>
                  <span style={{ color: 'var(--success)' }}>{Number(voucherBulletin.netAPayer).toLocaleString()} {voucherBulletin.devise}</span>
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
              <h3 style={{ margin: 0, color: 'var(--text)' }}>BON DE CAISSE - AVANCE SALAIRE</h3>
              <small style={{ color: 'var(--muted)' }}>TRÉSORERIE & AVANCES SUR SALAIRE</small>
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>N° Ordre de caisse :</strong> AVS-{voucherAvance.id}</div>
              <div><strong>Date :</strong> {new Date(voucherAvance.dateDemande).toLocaleDateString()}</div>
              <div><strong>Bénéficiaire :</strong> {voucherAvance.agent?.nom || voucherAvance.demandeurNom}</div>
              <div><strong>Montant alloué :</strong> {Number(voucherAvance.montant).toLocaleString()} {voucherAvance.devise}</div>
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
