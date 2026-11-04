import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import {
  Fingerprint,
  Truck,
  Wallet,
  TrendUp,
  TrendDown,
  ChartBar,
  CheckCircle,
  Warning,
  WarningCircle,
  ClockCounterClockwise,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowsClockwise,
  Buildings,
  Car,
  Receipt,
  Coins,
  CurrencyCircleDollar,
  ShieldCheck,
  MapPin,
  Package,
  Wrench,
  Sliders,
  Globe,
  Printer,
  FilePdf,
  ArrowsOut,
} from '@phosphor-icons/react'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import { BornePointagePermanent } from './BornePointagePermanent'

const COLOR_PALETTE = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  purple: '#8b5cf6',
}

interface ExecutiveDashboardProps {
  token: string | null
}

export function ExecutiveDashboard({ token }: ExecutiveDashboardProps) {
  const queryClient = useQueryClient()
  const selectedAgenceId = useAppStore((state) => state.selectedAgenceId)
  const setSelectedAgenceId = useAppStore((state) => state.selectedAgenceId && state.setSelectedAgenceId)

  // État local du module de pointage par empreinte digitale
  const [selectedAgentId, setSelectedAgentId] = useState<number | ''>('')
  const [showKioskModal, setShowKioskModal] = useState(false)
  const [quickIdentifiant, setQuickIdentifiant] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    score?: number
    heure?: string
    statut?: string
    agentNom?: string
  } | null>(null)

  // Filtre de vue onglet local si besoin
  const [activeTab, setActiveTab] = useState<'TOUS' | 'FINANCE' | 'PRESENCE' | 'FLOTTE' | 'TRESORERIE'>('TOUS')

  const agenceParam = selectedAgenceId && selectedAgenceId !== 'CONSOLIDE' ? `?agenceId=${selectedAgenceId}` : ''

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-direction-executive', selectedAgenceId],
    queryFn: () => apiRequest<any>(`/api/dashboard/direction-executive${agenceParam}`, { token }),
    enabled: Boolean(token),
    refetchInterval: 30000, // Rafraîchissement automatique toutes les 30s
  })

  // Mutation pour la simulation de scan biométrique d'empreinte digitale autonome
  const scanMutation = useMutation({
    mutationFn: (payload: { agentId?: number; identifiant?: string; modePointage?: string }) => {
      return apiRequest<any>('/api/rh/pointages/scan-empreinte', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...payload,
          modePointage: payload.modePointage || 'EMPREINTE_DIGITALE',
          terminalId: 'BIO-SCAN-OPTIQUE-01',
          typeScan: 'AUTO',
        }),
      })
    },
    onSuccess: (res) => {
      setScanResult({
        success: true,
        message: res.message,
        score: res.pointage?.empreinteMatchScore,
        heure: res.pointage?.heureArrivee || res.pointage?.heureDepart,
        statut: res.pointage?.statut,
        agentNom: res.pointage?.agentNom || res.agent?.nom,
      })
      setIsScanning(false)
      setQuickIdentifiant('')
      // Rafraîchir immédiatement les données du dashboard et des pointages
      queryClient.invalidateQueries({ queryKey: ['dashboard-direction-executive'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-service-summary'] })
      queryClient.invalidateQueries({ queryKey: ['kiosk-pointages'] })
    },
    onError: (err: any) => {
      setScanResult({
        success: false,
        message: err.message || 'Échec de l identification biométrique. Veuillez réessayer.',
      })
      setIsScanning(false)
    },
  })

  const handleTriggerFingerprintScan = (idOrIdentifiant?: number | string) => {
    setIsScanning(true)
    setScanResult(null)
    const target = idOrIdentifiant || selectedAgentId || quickIdentifiant

    // Simulation d'analyse optique (700ms de scan réaliste)
    setTimeout(() => {
      if (typeof target === 'number') {
        scanMutation.mutate({ agentId: target })
      } else if (target) {
        scanMutation.mutate({ identifiant: String(target) })
      } else {
        const first = presences?.agentsDisponibles?.[0]
        if (first) scanMutation.mutate({ agentId: first.id })
      }
    }, 700)
  }

  const ventes = data?.ventesJournalieres
  const depenses = data?.depensesJournalieres
  const presences = data?.presencesAgents
  const flotte = data?.parcVehicules
  const tresorerie = data?.tresorerie

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* 1. BANDEAU DE COMMANDE & SÉLECTEUR D'AGENCE CONSOLIDÉ */}
      <div
        className="panel"
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
              }}
            >
              <ShieldCheck size={20} weight="bold" />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Supervision Exécutive & Consolidation Réseau
            </h1>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: data?.isConsolide ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: data?.isConsolide ? 'var(--accent-strong)' : 'var(--text)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {data?.isConsolide ? (
                <>
                  <Globe size={13} weight="bold" />
                  Vue Réseau Consolidée
                </>
              ) : (
                <>
                  <MapPin size={13} weight="bold" />
                  {data?.agenceNom}
                </>
              )}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Synthèse journalière temps réel : ventes, dépenses d exploitation, pointage biométrique, parc véhicules et trésorerie.
          </p>
        </div>

        {/* SÉLECTEUR RAPIDE D'AGENCE & BOUTON RAFRAÎCHIR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface-2)',
              padding: 3,
              borderRadius: 8,
              border: '1px solid var(--border)',
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedAgenceId && setSelectedAgenceId('CONSOLIDE')}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: !selectedAgenceId || selectedAgenceId === 'CONSOLIDE' ? 'var(--surface)' : 'transparent',
                color: !selectedAgenceId || selectedAgenceId === 'CONSOLIDE' ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: !selectedAgenceId || selectedAgenceId === 'CONSOLIDE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Globe size={13} weight="bold" />
              Consolidé
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgenceId && setSelectedAgenceId(1)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: selectedAgenceId === 1 ? 'var(--surface)' : 'transparent',
                color: selectedAgenceId === 1 ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: selectedAgenceId === 1 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Siège Goma
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgenceId && setSelectedAgenceId(2)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: selectedAgenceId === 2 ? 'var(--surface)' : 'transparent',
                color: selectedAgenceId === 2 ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: selectedAgenceId === 2 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Kinshasa
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgenceId && setSelectedAgenceId(3)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: selectedAgenceId === 3 ? 'var(--surface)' : 'transparent',
                color: selectedAgenceId === 3 ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: selectedAgenceId === 3 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Bukavu
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="secondary-action"
            disabled={isFetching}
            style={{
              padding: '7px 12px',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <ArrowsClockwise size={15} className={isFetching ? 'spin' : ''} />
            <span>{isFetching ? 'Actualisation...' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* 2. LES 5 KPIS MAJEURS DE LA DIRECTION GÉNÉRALE */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {/* KPI 1 : VENTES JOURNALIÈRES */}
        <article className="metric-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>1. Ventes Journalières</span>
            <Receipt size={22} style={{ color: 'var(--accent-strong)' }} />
          </div>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', display: 'block', letterSpacing: '-0.02em' }}>
            ${(ventes?.totalConsolideUsd || 0).toLocaleString()} USD
          </strong>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>CDF: {Math.round(ventes?.totalCdf || 0).toLocaleString()} FC</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-strong)' }}>{ventes?.nombreTransactions || 0} tickets</span>
          </div>
        </article>

        {/* KPI 2 : DÉPENSES JOURNALIÈRES */}
        <article className="metric-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>2. Dépenses Journalières</span>
            <ArrowDownLeft size={22} style={{ color: '#ef4444' }} />
          </div>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', display: 'block', letterSpacing: '-0.02em' }}>
            ${(depenses?.totalConsolideUsd || 0).toLocaleString()} USD
          </strong>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Décaissements & Achats</span>
            <span style={{ fontWeight: 600 }}>{depenses?.nombreOperations || 0} sorties</span>
          </div>
        </article>

        {/* KPI 3 : MARGE D'EXPLOITATION DU JOUR */}
        <article className="metric-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>3. Marge Nette du Jour</span>
            <TrendUp size={22} style={{ color: (depenses?.margeJourUsd || 0) >= 0 ? 'var(--accent-strong)' : '#ef4444' }} />
          </div>
          <strong
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: (depenses?.margeJourUsd || 0) >= 0 ? 'var(--accent-strong)' : '#ef4444',
              display: 'block',
              letterSpacing: '-0.02em',
            }}
          >
            ${(depenses?.margeJourUsd || 0).toLocaleString()} USD
          </strong>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Ventes - Dépenses</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-strong)' }}>Marge: {depenses?.tauxMargeJour || 0}%</span>
          </div>
        </article>

        {/* KPI 4 : PRÉSENCE BIOMÉTRIQUE AGENTS */}
        <article className="metric-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>4. Présences Agents</span>
            <Fingerprint size={22} style={{ color: '#06b6d4' }} />
          </div>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', display: 'block', letterSpacing: '-0.02em' }}>
            {presences?.tauxPresence || 0}%
          </strong>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{presences?.presentsCount || 0} à l heure</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{presences?.retardsCount || 0} retards</span>
            <span style={{ color: 'var(--muted)' }}>/ {presences?.effectifTotal || 0}</span>
          </div>
        </article>

        {/* KPI 5 : TRÉSORERIE DISPONIBLE CONSOLIDÉE */}
        <article className="metric-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>5. Trésorerie Nette</span>
            <Wallet size={22} style={{ color: '#8b5cf6' }} />
          </div>
          <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', display: 'block', letterSpacing: '-0.02em' }}>
            ${(tresorerie?.soldeTotalConsolideUsd || 0).toLocaleString()} USD
          </strong>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Caisses: ${(tresorerie?.totalCaisseUsd || 0).toLocaleString()}</span>
            <span>Banques: ${(tresorerie?.totalBanqueUsd || 0).toLocaleString()}</span>
          </div>
        </article>
      </div>

      {/* 3. SECTION I : SITUATION DES VENTES & DÉPENSES JOURNALIÈRES AVEC DIAGRAMMES INTERACTIFS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 16 }}>
        {/* DIAGRAMME INTERACTIF 1 : COMPARATIF VENTES VS DÉPENSES PAR AGENCE (BAR CHART RECHARTS) */}
        <div className="panel" style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChartBar size={18} style={{ color: 'var(--accent-strong)' }} />
                Ventes vs Dépenses Journalières par Agence
              </h3>
              <small style={{ color: 'var(--muted)' }}>Comparatif en volume USD consolidé (taux réf: 2 850 CDF/$)</small>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
              Interactive BarChart
            </span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventes?.comparatifAgences || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="agenceNom" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip
                  formatter={(val: any, name: any) => [
                    `$${Number(val).toLocaleString()} USD`,
                    name === 'ventesUsd' ? 'Ventes Journalières' : name === 'depensesUsd' ? 'Dépenses du Jour' : 'Marge Nette',
                  ]}
                  contentStyle={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <RechartsLegend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
                <Bar dataKey="ventesUsd" name="Ventes Journalières" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depensesUsd" name="Dépenses Journalières" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margeNetteUsd" name="Marge Nette" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* TABLEAU RÉCAPITULATIF SYNTHÉTIQUE VENTES ET DÉPENSES */}
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '7px 10px' }}>Agence</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Ventes USD</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Ventes CDF</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Total Ventes Eq.</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Dépenses Eq.</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Marge Nette</th>
                </tr>
              </thead>
              <tbody>
                {(ventes?.parAgence || []).map((ag: any) => {
                  const depAg = (depenses?.parAgence || []).find((d: any) => d.agenceId === ag.agenceId)
                  const margeAg = (ag.totalConsolideUsd || 0) - (depAg?.totalConsolideUsd || 0)
                  return (
                    <tr key={ag.agenceId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{ag.agenceNom}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>${ag.ventesUsd.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--muted)' }}>{Math.round(ag.ventesCdf).toLocaleString()} FC</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-strong)' }}>
                        ${ag.totalConsolideUsd.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ef4444' }}>
                        ${(depAg?.totalConsolideUsd || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: margeAg >= 0 ? '#10b981' : '#ef4444' }}>
                        ${margeAg.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* DIAGRAMME INTERACTIF 2 : FLUX INTRA-JOURNALIERS & RÉPARTITION DES DÉPENSES */}
        <div className="panel" style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendUp size={18} style={{ color: 'var(--accent-strong)' }} />
                Progression Horaire des Flux (08h00 - 18h00)
              </h3>
              <small style={{ color: 'var(--muted)' }}>Courbe intra-journalière des encaissements vs décaissements</small>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
              Interactive AreaChart
            </span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventes?.courbeIntraJour || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="heure" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip
                  formatter={(val: any, name: any) => [
                    `$${Number(val).toLocaleString()} USD`,
                    name === 'ventesCumulUsd' ? 'Cumul Ventes' : 'Cumul Dépenses',
                  ]}
                  contentStyle={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                  }}
                />
                <RechartsLegend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
                <Area type="monotone" dataKey="ventesCumulUsd" name="Cumul Ventes USD" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentes)" />
                <Area type="monotone" dataKey="depensesCumulUsd" name="Cumul Dépenses USD" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDepenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* DÉPENSES PAR CATÉGORIE DU JOUR */}
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              Ventilation des Dépenses par Poste
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              {(depenses?.parCategorie || []).map((cat: any, idx: number) => (
                <div key={idx} style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.categorie}
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'block', marginTop: 2 }}>
                    ${cat.montantUsd.toLocaleString()}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600 }}>{cat.pourcentage}% des sorties</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECTION II : MODULE DE PRÉSENCE DES AGENTS AVEC SCAN D'EMPREINTE DIGITALE */}
      <div className="panel" style={{ background: 'var(--surface)', padding: 22, borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', padding: 6, borderRadius: 6, background: '#06b6d418', color: '#06b6d4' }}>
                <Fingerprint size={22} weight="bold" />
              </span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Module de Présence des Agents & Pointage par Empreinte Digitale
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
              Suivi biométrique en temps réel de l assiduité du personnel par agence et consolidé.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              Taux Global : <strong style={{ color: '#10b981' }}>{presences?.tauxPresence || 0}%</strong>
            </span>
            <a
              href={`/api/export/print/presences${selectedAgenceId && selectedAgenceId !== 'CONSOLIDE' ? `?agenceId=${selectedAgenceId}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="secondary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '5px 10px', textDecoration: 'none' }}
              title="Imprimer le registre officiel journalier des présences au format A4"
            >
              <Printer size={15} />
              Imprimer Registre (PDF)
            </a>
            <a
              href={`/api/export/print/presences-mensuel${selectedAgenceId && selectedAgenceId !== 'CONSOLIDE' ? `?agenceId=${selectedAgenceId}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="secondary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '5px 10px', textDecoration: 'none' }}
              title="Imprimer le rapport mensuel d assiduité du personnel"
            >
              <FilePdf size={15} />
              Rapport Mensuel (PDF)
            </a>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {/* 4.A : BORNE BIOMÉTRIQUE INTERACTIVE DE POINTAGE */}
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Fingerprint size={18} style={{ color: '#06b6d4' }} />
                  Borne Biométrique en Scan Continu
                </strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981', background: '#10b98118', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Écoute Active
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKioskModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title="Ouvrir la borne de pointage autonome en mode plein écran"
                  >
                    <ArrowsOut size={13} />
                    Kiosque
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
                Pointage instantané sans sélection préalable : posez le doigt, présentez un badge RFID ou scannez le QR code.
              </p>

              {/* CHAMP RAPIDE DE DOUCHETTE OU BADGE RFID */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (quickIdentifiant.trim()) {
                    handleTriggerFingerprintScan(quickIdentifiant.trim())
                  }
                }}
                style={{ display: 'flex', gap: 6, marginTop: 12 }}
              >
                <input
                  type="text"
                  value={quickIdentifiant}
                  onChange={(e) => setQuickIdentifiant(e.target.value)}
                  placeholder="Scanner badge RFID, QR ou matricule..."
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.78rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={!quickIdentifiant.trim() || isScanning}
                  className="secondary-action"
                  style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700 }}
                >
                  Valider
                </button>
              </form>

              {/* TOUCHES DIRECTES 1-CLIC DES AGENTS */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Touches Rapides 1-Clic Collaborateurs :
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                  {(presences?.agentsDisponibles || []).slice(0, 8).map((ag: any) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => handleTriggerFingerprintScan(ag.id)}
                      disabled={isScanning}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: ag.dejaPointe ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                        color: ag.dejaPointe ? '#10b981' : 'var(--text)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: isScanning ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title={`Émarger immédiatement pour ${ag.nom}`}
                    >
                      <Fingerprint size={13} style={{ color: ag.dejaPointe ? '#10b981' : '#06b6d4' }} />
                      <span>{ag.nom.split(' ')[0]}</span>
                      <small style={{ fontSize: '0.64rem', opacity: 0.8 }}>({ag.matricule})</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* RÉSULTAT DU SCAN BIOMÉTRIQUE */}
              {scanResult && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: scanResult.success ? '#10b98115' : '#ef444415',
                    border: `1px solid ${scanResult.success ? '#10b98150' : '#ef444450'}`,
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: scanResult.success ? '#10b981' : '#ef4444' }}>
                    {scanResult.success ? <CheckCircle size={18} /> : <Warning size={18} />}
                    {scanResult.success ? (scanResult.statut === 'RETARD' ? 'Arrivée (Retard Constaté)' : 'Émargement Conforme') : 'Erreur de Lecture'}
                  </div>
                  <p style={{ margin: '4px 0 0', color: 'var(--text)', fontWeight: 600 }}>{scanResult.agentNom}</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '0.75rem' }}>{scanResult.message}</p>
                  {scanResult.score && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <span>Score : <strong>{scanResult.score}%</strong></span>
                      <span>Heure : <strong>{scanResult.heure}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOUTON D'ACTION SCAN RAPIDE 1-TOUCH */}
            <button
              type="button"
              onClick={() => handleTriggerFingerprintScan()}
              disabled={isScanning}
              className="primary-action"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 8,
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: isScanning ? 'not-allowed' : 'pointer',
                background: isScanning ? 'var(--accent-soft)' : undefined,
                color: isScanning ? 'var(--accent-strong)' : undefined,
              }}
            >
              <Fingerprint size={20} className={isScanning ? 'pulse' : ''} />
              <span>{isScanning ? 'Analyse biométrique en cours...' : 'Poser le Doigt sur le Capteur (1-Touch)'}</span>
            </button>
          </div>

          {/* 4.B : DIAGRAMME CIRCULAIRE RECHARTS DE RÉPARTITION DES PRÉSENCES */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.88rem' }}>Répartition des Statuts de Présence</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Consolidé Réseau</span>
            </div>

            <div style={{ width: '100%', height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={presences?.distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(presences?.distribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`${val} agent(s)`, name]}
                    contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8, fontSize: '0.8rem' }}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.74rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* RÉPARTITION PAR AGENCE */}
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(presences?.parAgence || []).map((ag: any) => (
                <div key={ag.agenceId} style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block' }}>{ag.ville}</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-strong)' }}>{ag.tauxPresence}%</strong>
                  <small style={{ fontSize: '0.66rem', color: 'var(--muted)', display: 'block' }}>{ag.presents + ag.retards}/{ag.effectifTotal} agents</small>
                </div>
              ))}
            </div>
          </div>

          {/* 4.C : HISTORIQUE EN DIRECT DES DERNIERS POINTAGES */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)', overflowY: 'auto', maxHeight: 290 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCounterClockwise size={17} style={{ color: 'var(--accent-strong)' }} />
                Journal des Scans Récents
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Horodatage biométrique</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(presences?.derniersPointages || []).map((pt: any) => (
                <div
                  key={pt.id}
                  style={{
                    background: 'var(--surface)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.76rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Fingerprint size={14} style={{ color: '#06b6d4' }} />
                      <span>{pt.agentNom}</span>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                      {pt.agenceNom} • {pt.heureArrivee}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background:
                          pt.statut === 'PRESENT' ? '#10b98120' : pt.statut === 'RETARD' ? '#f59e0b20' : '#3b82f620',
                        color:
                          pt.statut === 'PRESENT' ? '#10b981' : pt.statut === 'RETARD' ? '#f59e0b' : '#3b82f6',
                      }}
                    >
                      {pt.statut === 'PRESENT' ? 'Présent' : pt.statut === 'RETARD' ? 'Retard' : 'Mission'}
                    </span>
                    {pt.empreinteMatchScore && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>
                        Match: {pt.empreinteMatchScore}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(presences?.derniersPointages || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: '0.78rem' }}>
                  Aucun scan enregistré pour cette journée.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION III : SITUATION DU PARC DES VÉHICULES PAR AGENCE & CONSOLIDÉ */}
      <div className="panel" style={{ background: 'var(--surface)', padding: 22, borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', padding: 6, borderRadius: 6, background: '#3b82f618', color: '#3b82f6' }}>
                <Truck size={22} weight="bold" />
              </span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Situation du Parc des Véhicules & Logistique Réseau
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
              Suivi opérationnel des camions bennes, poids lourds et véhicules de livraison par agence et consolidé.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              Capacité Flotte : <strong style={{ color: 'var(--accent-strong)' }}>{flotte?.capaciteTotaleTonnes || 0} Tonnes</strong> ({flotte?.capaciteTotaleSacs || 0} unités)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* DIAGRAMME CIRCULAIRE RECHARTS : DISPONIBILITÉ DES VÉHICULES */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.88rem' }}>Disponibilité de la Flotte</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                Taux d opération : <strong style={{ color: '#10b981' }}>{flotte?.tauxDisponibilite || 0}%</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={flotte?.distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(flotte?.distribution || []).map((entry: any, index: number) => (
                      <Cell key={`flotte-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`${val} véhicule(s)`, name]}
                    contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8, fontSize: '0.8rem' }}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.74rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* SYNTHÈSE CAPACITÉ PAR AGENCE */}
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(flotte?.parAgence || []).map((ag: any) => (
                <div key={ag.agenceId} style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)', display: 'block' }}>{ag.ville}</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>{ag.capaciteTonnes} T</strong>
                  <small style={{ fontSize: '0.66rem', color: 'var(--muted)', display: 'block' }}>{ag.disponibles}/{ag.total} dispo</small>
                </div>
              ))}
            </div>
          </div>

          {/* LISTE DES VÉHICULES DU PARC EN CARTE DÉTAILLÉE */}
          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {(flotte?.liste || []).map((veh: any) => (
              <div
                key={veh.id}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text)' }}>
                      {veh.plaqueImmatriculation}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{veh.marqueModele}</span>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background:
                        veh.statut === 'DISPONIBLE'
                          ? '#10b98120'
                          : veh.statut === 'EN_COURSE'
                          ? '#3b82f620'
                          : '#f59e0b20',
                      color:
                        veh.statut === 'DISPONIBLE'
                          ? '#10b981'
                          : veh.statut === 'EN_COURSE'
                          ? '#3b82f6'
                          : '#f59e0b',
                    }}
                  >
                    {veh.statut === 'DISPONIBLE' ? 'Disponible' : veh.statut === 'EN_COURSE' ? 'En course' : 'Maintenance'}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'flex', borderTop: '1px solid var(--border)', paddingTop: 6, justifyContent: 'space-between' }}>
                  <span>Chauffeur : <strong style={{ color: 'var(--text)' }}>{veh.chauffeurNom}</strong></span>
                  <span><strong>{veh.capaciteTonnes}T</strong> ({veh.capaciteSacs} unités)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. SECTION IV : SITUATION DE LA TRÉSORERIE PAR AGENCE & CONSOLIDÉ */}
      <div className="panel" style={{ background: 'var(--surface)', padding: 22, borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', padding: 6, borderRadius: 6, background: '#8b5cf618', color: '#8b5cf6' }}>
                <Wallet size={22} weight="bold" />
              </span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Situation de la Trésorerie par Agence & Consolidé
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
              Disponibilité immédiate des caisses physiques et soldes bancaires des agences (Rawbank, Equity BCDC, TMB).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              Total Liquidités : <strong style={{ color: 'var(--accent-strong)' }}>${(tresorerie?.soldeTotalConsolideUsd || 0).toLocaleString()} USD</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          {/* DIAGRAMME EN BARRES RECHARTS : LIQUIDITÉ CAISSE VS BANQUE PAR AGENCE */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.88rem' }}>Répartition Caisses vs Banques (USD)</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Par agence</span>
            </div>

            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tresorerie?.comparatifAgences || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="agenceNom" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()} USD`, name === 'caissesUsd' ? 'Caisses Espèces' : 'Comptes Bancaires']}
                    contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8, fontSize: '0.8rem' }}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.74rem' }} />
                  <Bar dataKey="caissesUsd" name="Caisses Espèces (USD eq)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="banquesUsd" name="Avoirs Bancaires (USD eq)" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLEAU RÉCAPITULATIF DES AVOIRS DE TRÉSORERIE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(tresorerie?.parAgence || []).map((ag: any) => (
              <div
                key={ag.agenceId}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'block' }}>{ag.agenceNom}</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                    <span>Caisse USD : <strong>${ag.caisseUsd.toLocaleString()}</strong></span>
                    <span>Caisse CDF : <strong>{Math.round(ag.caisseCdf).toLocaleString()} FC</strong></span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 12 }}>
                    <span>Banque USD : <strong>${ag.banqueUsd.toLocaleString()}</strong></span>
                    <span>Banque CDF : <strong>{Math.round(ag.banqueCdf).toLocaleString()} FC</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Total Équivalent USD</span>
                  <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-strong)' }}>
                    ${ag.totalUsdEquiv.toLocaleString()}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BORNE DE POINTAGE PERMANENT PLEIN ÉCRAN */}
      <BornePointagePermanent
        isOpen={showKioskModal}
        onClose={() => setShowKioskModal(false)}
        defaultAgenceId={selectedAgenceId !== 'CONSOLIDE' ? selectedAgenceId : undefined}
      />
    </div>
  )
}
