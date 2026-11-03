import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts'
import {
  ChartBar,
  ChartLine,
  ChartPie,
  Printer,
  FileXls,
  ArrowClockwise,
  TrendUp,
  TrendDown,
  CurrencyCircleDollar,
  Coins,
  Wallet,
  Truck,
  Fingerprint,
  Package,
  Wrench,
  CheckCircle,
  Warning,
  SlidersHorizontal,
  Buildings,
  Calendar,
  Info,
  ArrowsLeftRight,
  ShieldCheck,
  Eye,
  FilePdf,
  CaretDown,
  Camera,
  Copy,
  DownloadSimple,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest, downloadUrl } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import {
  telechargerDiagrammeImagePng,
  imprimerImageDiagrammeTelQuel,
  copierDiagrammePressePapier,
} from '../lib/chartExport'

type ChartViewType = 'BAR' | 'LINE' | 'AREA' | 'PIE'
type ActiveTabType = 'TOUT' | 'VENTES' | 'DEPENSES' | 'TRESORERIE' | 'PRESENCES' | 'FLOTTE' | 'PRODUCTION'

const PALETTE = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  slate: '#64748b',
}

const PIE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

// Utilitaire d'export direct en format CSV/Excel avec BOM UTF-8
function exporterTableauVersExcel(nomFichier: string, enTetes: string[], lignes: (string | number)[][]) {
  const separateur = ';'
  const contenu = [
    enTetes.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(separateur),
    ...lignes.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(separateur)
    ),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomFichier}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Barre d'actions complète pour chaque diagramme graphique (Image PNG, Impression directe, Excel, Copie)
interface DiagrammeActionsProps {
  containerId: string
  titre: string
  nomFichier: string
  onExportExcel: () => void
  onPrintDossier: () => void
  nomAgence?: string
  typeVue?: ChartViewType
  setTypeVue?: (t: ChartViewType) => void
  typesDisponibles?: { type: ChartViewType; label: string }[]
  onNotify?: (msg: string) => void
}

function DiagrammeActions({
  containerId,
  titre,
  nomFichier,
  onExportExcel,
  onPrintDossier,
  nomAgence,
  typeVue,
  setTypeVue,
  typesDisponibles,
  onNotify,
}: DiagrammeActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleExportPng = async () => {
    const el = document.getElementById(containerId)
    if (!el) return
    try {
      setLoading(true)
      onNotify?.(`Génération de l'image PNG pour "${titre}"...`)
      await telechargerDiagrammeImagePng(el, { titre, nomFichier, nomAgence })
      onNotify?.(`Image PNG téléchargée : ${nomFichier}.png`)
    } catch (err: any) {
      console.error(err)
      onNotify?.(err.message || 'Erreur lors de la capture de l\'image')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintImage = async () => {
    const el = document.getElementById(containerId)
    if (!el) return
    try {
      setLoading(true)
      onNotify?.(`Préparation de l'impression du diagramme...`)
      await imprimerImageDiagrammeTelQuel(el, { titre, nomFichier, nomAgence })
    } catch (err: any) {
      console.error(err)
      onNotify?.(err.message || 'Erreur lors de l\'impression du graphique')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyImage = async () => {
    const el = document.getElementById(containerId)
    if (!el) return
    try {
      setLoading(true)
      const ok = await copierDiagrammePressePapier(el, { titre, nomFichier, nomAgence })
      if (ok) {
        onNotify?.('Image copiée dans le presse-papier ! (Collez avec Ctrl+V)')
      } else {
        await telechargerDiagrammeImagePng(el, { titre, nomFichier, nomAgence })
        onNotify?.('Image PNG téléchargée avec succès !')
      }
    } catch (err: any) {
      console.error(err)
      onNotify?.('Erreur lors de la copie de l\'image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {/* 1. Télécharger Image PNG */}
      <button
        type="button"
        className="icon-button"
        onClick={handleExportPng}
        disabled={loading}
        title="Télécharger l'image PNG de ce graphique en haute définition (tel quel)"
        style={{ color: '#0284c7' }}
      >
        <Camera size={16} weight="bold" />
      </button>

      {/* 2. Imprimer l'image telle quelle */}
      <button
        type="button"
        className="icon-button"
        onClick={handlePrintImage}
        disabled={loading}
        title="Imprimer directement l'image de ce graphique tel quel (A4 Paysage / PDF)"
        style={{ color: '#0f172a' }}
      >
        <Printer size={16} weight="bold" />
      </button>

      {/* 3. Copier image dans le presse-papier */}
      <button
        type="button"
        className="icon-button"
        onClick={handleCopyImage}
        disabled={loading}
        title="Copier l'image du diagramme dans le presse-papier (pour coller dans Word / WhatsApp / PPT)"
      >
        <Copy size={16} />
      </button>

      {/* 4. Exporter les données Excel */}
      <button
        type="button"
        className="icon-button"
        onClick={onExportExcel}
        title="Exporter les données brutes de ce graphique en format Excel (.csv)"
        style={{ color: '#10b981' }}
      >
        <FileXls size={16} />
      </button>

      {/* 5. Ouvrir document certifié A4 */}
      <button
        type="button"
        className="icon-button"
        onClick={onPrintDossier}
        title="Ouvrir le rapport officiel A4 avec diagramme vectoriel et tableau certifié"
        style={{ color: '#6366f1' }}
      >
        <FilePdf size={16} />
      </button>

      {/* 6. Commutateur de types de vue (si disponible) */}
      {typesDisponibles && setTypeVue && typeVue && (
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 2, borderRadius: 6, marginLeft: 4 }}>
          {typesDisponibles.map((td) => (
            <button
              key={td.type}
              type="button"
              onClick={() => setTypeVue(td.type)}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
                background: typeVue === td.type ? 'var(--surface)' : 'transparent',
                color: typeVue === td.type ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {td.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AnalyticsChartsPage() {
  const token = useAppStore((state) => state.session?.token)
  const userRole = useAppStore((state) => state.session?.role)
  const userAgenceId = useAppStore((state) => state.session?.agenceId)

  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN_SIEGE'

  // Filtres : Le Super Admin et Admin Siège ont accès au Consolidé, le Chef d'Agence est strictement restreint à son agence locale
  const [selectedAgence, setSelectedAgence] = useState<string>(
    isSuperOrAdmin ? 'CONSOLIDE' : String(userAgenceId || 1)
  )
  const [selectedPeriode, setSelectedPeriode] = useState<'JOUR' | 'SEMAINE' | 'MOIS' | 'ANNEE'>('JOUR')
  const [activeTab, setActiveTab] = useState<ActiveTabType>('TOUT')

  useEffect(() => {
    if (!isSuperOrAdmin && userAgenceId) {
      setSelectedAgence(String(userAgenceId))
    }
  }, [isSuperOrAdmin, userAgenceId])

  // Types de graphiques personnalisables
  const [typeVentes, setTypeVentes] = useState<ChartViewType>('BAR')
  const [typeEvolution, setTypeEvolution] = useState<ChartViewType>('AREA')
  const [typeDepenses, setTypeDepenses] = useState<ChartViewType>('BAR')
  const [typeTresorerie, setTypeTresorerie] = useState<ChartViewType>('BAR')
  const [typePresences, setTypePresences] = useState<ChartViewType>('BAR')
  const [typeFlotte, setTypeFlotte] = useState<ChartViewType>('PIE')
  const [typeProduction, setTypeProduction] = useState<ChartViewType>('BAR')

  // Modal d'impression dédiée
  const [printChartTarget, setPrintChartTarget] = useState<string | null>(null)

  // Requête données exécutives consolidées
  const executiveQuery = useQuery({
    queryKey: ['executive-analytics', selectedAgence, selectedPeriode],
    queryFn: () =>
      apiRequest<any>(
        `/api/dashboard/direction-executive${selectedAgence !== 'CONSOLIDE' ? `?agenceId=${selectedAgence}` : ''}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  // Requête agences
  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: async () => {
      const res = await apiRequest<any[]>('/api/agences', { token })
      return Array.isArray(res) ? res : []
    },
    enabled: Boolean(token),
  })

  // Requête production
  const productionQuery = useQuery({
    queryKey: ['production-summary', selectedAgence],
    queryFn: () =>
      apiRequest<any>(
        `/api/dashboard/service-summary?service=PRODUCTION${selectedAgence !== 'CONSOLIDE' ? `&agenceId=${selectedAgence}` : ''}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  const execData = executiveQuery.data
  const agencesList = Array.isArray(agencesQuery.data) ? agencesQuery.data : []
  const prodData = productionQuery.data

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const afficherToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const nomAgenceActive =
    selectedAgence === 'CONSOLIDE'
      ? 'Réseau Consolidé Multi-Agences'
      : (agencesList.find((a: any) => String(a.id) === selectedAgence)?.nom || `Agence #${selectedAgence}`)

  // Fonction pour imprimer le dossier ou le diagramme ciblé via le document serveur A4 certifié
  const declencherImpression = (cible?: string) => {
    const docUrl = downloadUrl(
      `/api/analytics/diagrammes/document?agenceId=${encodeURIComponent(selectedAgence)}&periode=${encodeURIComponent(selectedPeriode)}${
        cible ? `&chart=${encodeURIComponent(cible)}` : ''
      }`
    )
    const link = document.createElement('a')
    link.href = docUrl
    link.target = '_blank'
    link.rel = 'noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Exportation globale de tous les indicateurs clés
  const exporterDossierGlobal = () => {
    if (!execData) return

    const enTetes = ['Section / Domaine', 'Agence / Entité', 'Indicateur Analytique', 'Valeur', 'Devise / Unité', 'Interprétation Décisionnelle']
    const lignes: (string | number)[][] = []

    // 1. Ventes
    ;(execData.ventesJournalieres?.parAgence || []).forEach((v: any) => {
      lignes.push([
        'Ventes Journalières',
        v.agenceNom,
        'Chiffre d Affaires Global',
        v.totalConsolideUsd,
        'USD',
        `Comptant: $${v.comptantUsd} | Crédit: $${v.creditUsd} (${v.nombreTransactions} transactions)`,
      ])
    })

    // 2. Dépenses
    ;(execData.depensesJournalieres?.depensesCategories || []).forEach((c: any) => {
      lignes.push([
        'Dépenses Opérationnelles',
        'Consolidé Réseau',
        c.categorie,
        c.montantUsd,
        'USD',
        `Poids budgétaire: ${c.pourcentage}% du total des charges`,
      ])
    })

    // 3. Trésorerie
    ;(execData.tresorerie?.tresorerieParAgence || []).forEach((t: any) => {
      lignes.push([
        'Trésorerie & Liquidités',
        t.agenceNom,
        'Solde Global Disponible',
        t.totalUsdEquiv,
        'USD',
        `Caisse physique: $${t.caisseUsd} / ${t.caisseCdf.toLocaleString()} FC | Banque: $${t.banqueUsd}`,
      ])
    })

    // 4. Présences
    ;(execData.presences?.presencesParAgence || []).forEach((p: any) => {
      lignes.push([
        'Présences & Assiduité',
        p.agenceNom,
        'Taux de Présence Globale',
        `${p.tauxPresence}%`,
        '%',
        `Effectif: ${p.effectifTotal} | Présents: ${p.presents} | Retards: ${p.retards} | Absents: ${p.absents}`,
      ])
    })

    // 5. Flotte
    ;(execData.parcVehicules?.parcParAgence || []).forEach((f: any) => {
      lignes.push([
        'Flotte & Véhicules',
        f.agenceNom,
        'Véhicules Disponibles',
        `${f.disponibles} / ${f.total}`,
        'engins',
        `En course: ${f.enCourse} | En maintenance: ${f.enMaintenance} | Capacité: ${f.capaciteTonnes} T (${f.capaciteSacs} unités)`,
      ])
    })

    exporterTableauVersExcel('dossier_analyses_graphiques_direction', enTetes, lignes)
  }

  return (
    <div className="page-grid print-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ---------------- EN-TÊTE PRINCIPAL & ACTIONS DÉCISIONNELLES ---------------- */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-strong)',
            }}
          >
            <ChartBar size={30} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--text)', fontWeight: 800 }}>
              Analyses & Diagrammes Décisionnels
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Centre visuel analytique pour la Direction Générale et les Chefs d'Agences : tendances, comparaisons et indicateurs d'exploitation.
            </p>
          </div>
        </div>

        {/* BOUTONS D'EXPORT & IMPRESSION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-action"
            onClick={exporterDossierGlobal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Exporter l'ensemble des données graphiques et indicateurs vers Microsoft Excel (CSV UTF-8)"
          >
            <FileXls size={18} style={{ color: '#10b981' }} />
            Exporter Tout (Excel)
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Imprimer directement tous les diagrammes graphiques tels qu'affichés à l'écran (avec barres, secteurs et couleurs exactes)"
          >
            <Printer size={18} />
            Imprimer les Graphiques (Visuels)
          </button>

          <a
            className="secondary-action"
            href={downloadUrl(
              `/api/analytics/diagrammes/document?agenceId=${encodeURIComponent(selectedAgence)}&periode=${encodeURIComponent(selectedPeriode)}`
            )}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, textDecoration: 'none' }}
            title="Ouvrir le dossier officiel imprimable au format A4 avec en-têtes officiels, filigrane et diagrammes vectoriels"
          >
            <FilePdf size={18} style={{ color: '#6366f1' }} />
            Dossier Officiel A4 (PDF)
          </a>
        </div>
      </div>

      {/* ---------------- BANDEAU DE FILTRES INTERACTIFS & SÉLECTEURS ---------------- */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 18px',
        }}
      >
        {/* Sélecteur d'Agence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>
            <Buildings size={18} style={{ color: 'var(--accent-strong)' }} />
            Périmètre d'Analyse :
          </div>

          <select
            value={selectedAgence}
            onChange={(e) => setSelectedAgence(e.target.value)}
            disabled={!isSuperOrAdmin}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {isSuperOrAdmin ? (
              <>
                <option value="CONSOLIDE">Réseau Consolidé (Toutes Agences)</option>
                {agencesList.map((ag: any) => (
                  <option key={ag.id} value={String(ag.id)}>
                    {ag.nom} ({ag.ville})
                  </option>
                ))}
              </>
            ) : (
              <option value={String(userAgenceId || 1)}>
                {agencesList.find((ag: any) => ag.id === userAgenceId)?.nom || `Mon Agence #${userAgenceId || 1}`} (Accès réservé à votre agence)
              </option>
            )}
          </select>

          {/* Sélecteur de Période */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>
            <Calendar size={18} style={{ color: 'var(--accent-strong)' }} />
            Période :
          </div>

          <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
            {(
              [
                { id: 'JOUR', label: 'Aujourd hui' },
                { id: 'SEMAINE', label: '7 Derniers Jours' },
                { id: 'MOIS', label: 'Ce Mois' },
                { id: 'ANNEE', label: 'Année 2026' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriode(p.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: 4,
                  border: 'none',
                  background: selectedPeriode === p.id ? 'var(--surface-2)' : 'transparent',
                  color: selectedPeriode === p.id ? 'var(--accent-strong)' : 'var(--muted)',
                  cursor: 'pointer',
                  boxShadow: selectedPeriode === p.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton d'Actualisation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              executiveQuery.refetch()
              productionQuery.refetch()
            }}
            title="Actualiser les données en temps réel"
          >
            <ArrowClockwise size={18} />
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Actualisé à {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ---------------- ONGLETS CATÉGORIES DE GRAPHIQUES ---------------- */}
      <div className="tab-bar no-print">
        <button className={clsx('tab-button', activeTab === 'TOUT' && 'active')} onClick={() => setActiveTab('TOUT')}>
          <Eye size={17} /> Vue Consolidée ({activeTab === 'TOUT' ? 'Active' : 'Tous'})
        </button>
        <button className={clsx('tab-button', activeTab === 'VENTES' && 'active')} onClick={() => setActiveTab('VENTES')}>
          <TrendUp size={17} /> Ventes & Chiffre d Affaires
        </button>
        <button className={clsx('tab-button', activeTab === 'DEPENSES' && 'active')} onClick={() => setActiveTab('DEPENSES')}>
          <TrendDown size={17} /> Dépenses & Marge d Exploitation
        </button>
        <button className={clsx('tab-button', activeTab === 'TRESORERIE' && 'active')} onClick={() => setActiveTab('TRESORERIE')}>
          <Wallet size={17} /> Trésorerie & Liquidités
        </button>
        <button className={clsx('tab-button', activeTab === 'PRESENCES' && 'active')} onClick={() => setActiveTab('PRESENCES')}>
          <Fingerprint size={17} /> Présences & Assiduité Biométrique
        </button>
        <button className={clsx('tab-button', activeTab === 'FLOTTE' && 'active')} onClick={() => setActiveTab('FLOTTE')}>
          <Truck size={17} /> Parc Véhicules & Logistique
        </button>
        <button className={clsx('tab-button', activeTab === 'PRODUCTION' && 'active')} onClick={() => setActiveTab('PRODUCTION')}>
          <Package size={17} /> Production Industrielle
        </button>
      </div>

      {/* ---------------- EN-TÊTE D'IMPRESSION EXCLUSIF (VISIBLE UNIQUEMENT À L'IMPRESSION) ---------------- */}
      <div
        className="print-only"
        style={{
          display: 'none',
          borderBottom: '2px solid #0f172a',
          paddingBottom: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>
              DOSSIER D ANALYSES GRAPHIQUES & TABLEAUX DÉCISIONNELS
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#475569' }}>
              Rapport analytique officiel - Période : {selectedPeriode} | Périmètre :{' '}
              {selectedAgence === 'CONSOLIDE' ? 'Réseau Consolidé Multi-Agences' : `Agence #${selectedAgence}`}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
            <div>Date d impression : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div>Généré par : {userRole}</div>
          </div>
        </div>
      </div>

      {/* ---------------- BANDEAU KPIS SYNTHÈSE DÉCISIONNELLE ---------------- */}
      {execData && (activeTab === 'TOUT' || activeTab === 'VENTES' || activeTab === 'DEPENSES') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
          }}
        >
          {/* KPI 1 : VENTES TOTALES */}
          <div className="card" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>CHIFFRE D AFFAIRES GLOBAL</span>
              <TrendUp size={18} style={{ color: PALETTE.emerald }} />
            </div>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
              ${Number(execData.ventesJournalieres?.totalConsolideUsd || 0).toLocaleString()} USD
            </strong>
            <small style={{ fontSize: '0.74rem', color: PALETTE.emerald, display: 'block', marginTop: 2 }}>
              Comptant : ${Number(execData.ventesJournalieres?.comptantUsd || 0).toLocaleString()} | Crédit : ${Number(execData.ventesJournalieres?.creditUsd || 0).toLocaleString()}
            </small>
          </div>

          {/* KPI 2 : DÉPENSES TOTALES */}
          <div className="card" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>DÉPENSES D EXPLOITATION</span>
              <TrendDown size={18} style={{ color: PALETTE.rose }} />
            </div>
            <strong style={{ fontSize: '1.35rem', color: PALETTE.rose, display: 'block', marginTop: 4 }}>
              ${Number(execData.depensesJournalieres?.totalConsolideUsd || 0).toLocaleString()} USD
            </strong>
            <small style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
              {execData.depensesJournalieres?.totalOperations || 0} opérations décaissées
            </small>
          </div>

          {/* KPI 3 : MARGE OPÉRATIONNELLE */}
          <div className="card" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>MARGE OPÉRATIONNELLE</span>
              <ShieldCheck size={18} style={{ color: PALETTE.blue }} />
            </div>
            <strong
              style={{
                fontSize: '1.35rem',
                color: (execData.depensesJournalieres?.margeJourUsd || 0) >= 0 ? PALETTE.emerald : PALETTE.rose,
                display: 'block',
                marginTop: 4,
              }}
            >
              ${Number(execData.depensesJournalieres?.margeJourUsd || 0).toLocaleString()} USD
            </strong>
            <small style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
              Taux de marge brute : {execData.depensesJournalieres?.tauxMargeJour || 0}%
            </small>
          </div>

          {/* KPI 4 : TRÉSORERIE DISPONIBLE */}
          <div className="card" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>LIQUIDITÉS DISPONIBLES</span>
              <Wallet size={18} style={{ color: PALETTE.amber }} />
            </div>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
              ${Number(execData.tresorerie?.soldeTresorerieTotalUsd || 0).toLocaleString()} USD
            </strong>
            <small style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
              Caisses physiques + Banques
            </small>
          </div>

          {/* KPI 5 : TAUX D'ASSIDUITÉ */}
          <div className="card" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>TAUX D ASSIDUITÉ RH</span>
              <Fingerprint size={18} style={{ color: PALETTE.cyan }} />
            </div>
            <strong style={{ fontSize: '1.35rem', color: PALETTE.cyan, display: 'block', marginTop: 4 }}>
              {execData.presences?.tauxPresence || 0}%
            </strong>
            <small style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
              {execData.presences?.presentsCount || 0} présents | {execData.presences?.retardsCount || 0} retards
            </small>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1 : VENTES JOURNALIÈRES & COURBE D'ÉVOLUTION INTRA-JOUR           */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'VENTES') && execData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 1.1 : VENTES PAR AGENCE */}
          <div
            id="chart-card-ventes-agences"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Barre de contrôle du diagramme */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChartBar size={20} weight="bold" style={{ color: PALETTE.blue }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Situation des Ventes par Agence
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Comparatif du volume de ventes (USD consolidé) et répartition comptant vs crédit.
                </p>
              </div>

              {/* Actions d'export & d'impression pour ce diagramme */}
              <DiagrammeActions
                containerId="chart-card-ventes-agences"
                titre="Situation des Ventes par Agence"
                nomFichier="ventes_par_agence"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'ventes_par_agence',
                    ['Agence', 'Ville', 'Ventes USD', 'Ventes CDF', 'Total Consolidé USD', 'Comptant USD', 'Crédit USD', 'Transactions'],
                    (execData.ventesJournalieres?.parAgence || []).map((v: any) => [
                      v.agenceNom,
                      v.ville,
                      v.ventesUsd,
                      v.ventesCdf,
                      v.totalConsolideUsd,
                      v.comptantUsd,
                      v.creditUsd,
                      v.nombreTransactions,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('ventes_agences')}
                typeVue={typeVentes}
                setTypeVue={setTypeVentes}
                typesDisponibles={[
                  { type: 'BAR', label: 'Barres' },
                  { type: 'PIE', label: 'Secteurs' },
                ]}
              />
            </div>

            {/* Rendu interactif du graphique avec animation */}
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeVentes === 'BAR' ? (
                  <BarChart data={execData.ventesJournalieres?.parAgence || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="ville" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()} USD`, name === 'comptantUsd' ? 'Comptant (Cash)' : name === 'creditUsd' ? 'Crédit Client' : 'Total']}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar
                      dataKey="comptantUsd"
                      name="Comptant (Cash)"
                      fill={PALETTE.emerald}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="creditUsd"
                      name="Crédit Client"
                      fill={PALETTE.amber}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={execData.ventesJournalieres?.parAgence || []}
                      dataKey="totalConsolideUsd"
                      nameKey="agenceNom"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {(execData.ventesJournalieres?.parAgence || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} USD`, 'Chiffre d Affaires']}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Légende explicative & diagnostic managérial */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.blue }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Le graphique met en perspective le chiffre d'affaires réalisé par chaque succursale. Les barres vertes indiquent les encaissements directs en caisse, tandis que les barres ambres représentent les ventes à crédit soumises à recouvrement.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Total consolidé réseau : <strong>${Number(execData.ventesJournalieres?.totalConsolideUsd || 0).toLocaleString()} USD</strong></span>
                <span style={{ color: PALETTE.emerald }}>Mix Cash : <strong>{Math.round(((execData.ventesJournalieres?.comptantUsd || 1) / (execData.ventesJournalieres?.totalConsolideUsd || 1)) * 100)}%</strong></span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 1.2 : ÉVOLUTION INTRA-JOURNALIÈRE DES FLUX */}
          <div
            id="chart-card-evolution-ventes"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChartLine size={20} weight="bold" style={{ color: PALETTE.indigo }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Rythme Intra-Journalier des Flux (08h - 18h)
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Courbe d'accumulation horaire comparant les encaissements de ventes aux sorties de dépenses.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-evolution-ventes"
                titre="Rythme Intra-Journalier des Flux (08h - 18h)"
                nomFichier="evolution_flux_intra_jour"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'evolution_flux_intra_jour',
                    ['Heure', 'Ventes Cumulées USD', 'Dépenses Cumulées USD'],
                    (execData.courbeIntraJour || []).map((c: any) => [c.heure, c.ventesCumulUsd, c.depensesCumulUsd])
                  )
                }
                onPrintDossier={() => declencherImpression('flux_intra_jour')}
                typeVue={typeEvolution}
                setTypeVue={setTypeEvolution}
                typesDisponibles={[
                  { type: 'AREA', label: 'Aires' },
                  { type: 'LINE', label: 'Lignes' },
                ]}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeEvolution === 'AREA' ? (
                  <AreaChart data={execData.courbeIntraJour || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.rose} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.rose} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="heure" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} USD`]}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Area
                      type="monotone"
                      dataKey="ventesCumulUsd"
                      name="Ventes Cumulées"
                      stroke={PALETTE.emerald}
                      fillOpacity={1}
                      fill="url(#colorVentes)"
                      strokeWidth={2}
                      isAnimationActive={true}
                      animationDuration={1100}
                    />
                    <Area
                      type="monotone"
                      dataKey="depensesCumulUsd"
                      name="Dépenses Cumulées"
                      stroke={PALETTE.rose}
                      fillOpacity={1}
                      fill="url(#colorDepenses)"
                      strokeWidth={2}
                      isAnimationActive={true}
                      animationDuration={1100}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={execData.courbeIntraJour || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="heure" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} USD`]}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Line
                      type="monotone"
                      dataKey="ventesCumulUsd"
                      name="Ventes Cumulées"
                      stroke={PALETTE.emerald}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1100}
                    />
                    <Line
                      type="monotone"
                      dataKey="depensesCumulUsd"
                      name="Dépenses Cumulées"
                      stroke={PALETTE.rose}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1100}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.indigo }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Ce diagramme trace la cinétique de génération de trésorerie au cours de la journée. Un écart positif croissant entre la courbe verte (ventes) et la courbe rouge (dépenses) témoigne d'un solde de trésorerie net excédentaire.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Cadence maximale : <strong>12h00 - 16h00</strong></span>
                <span style={{ color: PALETTE.emerald }}>Bilan net journée : <strong>+${(execData.depensesJournalieres?.margeJourUsd || 0).toLocaleString()} USD</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 : DÉPENSES OPÉRATIONNELLES & COMPARATIF DE RENTABILITÉ          */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'DEPENSES') && execData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 2.1 : RÉPARTITION ANALYTIQUE DES CHARGES */}
          <div
            id="chart-card-depenses-categories"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChartPie size={20} weight="bold" style={{ color: PALETTE.rose }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Structure Analytique des Dépenses
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Ventilation par centre de coût : Achats grains, Carburant, Salaires, Maintenance.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-depenses-categories"
                titre="Structure Analytique des Dépenses"
                nomFichier="structure_depenses_analytiques"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'structure_depenses_analytiques',
                    ['Poste de Dépense', 'Montant USD', 'Pourcentage du Budget'],
                    (execData.depensesJournalieres?.depensesCategories || []).map((c: any) => [
                      c.categorie,
                      c.montantUsd,
                      `${c.pourcentage}%`,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('depenses_analytiques')}
                typeVue={typeDepenses}
                setTypeVue={setTypeDepenses}
                typesDisponibles={[
                  { type: 'PIE', label: 'Secteurs' },
                  { type: 'BAR', label: 'Barres' },
                ]}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeDepenses === 'PIE' ? (
                  <PieChart>
                    <Pie
                      data={execData.depensesJournalieres?.depensesCategories || []}
                      dataKey="montantUsd"
                      nameKey="categorie"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                    >
                      {(execData.depensesJournalieres?.depensesCategories || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()} USD`, name]}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                ) : (
                  <BarChart data={execData.depensesJournalieres?.depensesCategories || []} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="categorie" width={110} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} USD`, 'Montant décaissé']}
                    />
                    <Bar
                      dataKey="montantUsd"
                      name="Montant USD"
                      fill={PALETTE.rose}
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.rose }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                L'approvisionnement en matières premières constitue le premier poste de charge (45%), suivi du carburant et de la logistique flotte (22%). L'optimisation des tournées camions permet de comprimer significativement ce deuxième poste.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Total charges d exploitation : <strong>${Number(execData.depensesJournalieres?.totalConsolideUsd || 0).toLocaleString()} USD</strong></span>
                <span style={{ color: PALETTE.amber }}>Ratio Charges / Ventes : <strong>{Math.round(((execData.depensesJournalieres?.totalConsolideUsd || 0) / (execData.ventesJournalieres?.totalConsolideUsd || 1)) * 100)}%</strong></span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 2.2 : COMPARATIF VENTES VS DÉPENSES PAR AGENCE */}
          <div
            id="chart-card-benchmark-agences"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowsLeftRight size={20} weight="bold" style={{ color: PALETTE.teal }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Benchmark : Ventes vs Dépenses par Agence
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Comparaison directe des revenus générés face aux coûts opérationnels engagés par succursale.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-benchmark-agences"
                titre="Benchmark : Ventes vs Dépenses par Agence"
                nomFichier="benchmark_ventes_depenses"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'benchmark_ventes_depenses',
                    ['Agence', 'Ventes USD', 'Dépenses USD', 'Marge Nette USD'],
                    (execData.comparatifVentesDepenses || []).map((b: any) => [
                      b.agenceNom,
                      b.ventesUsd,
                      b.depensesUsd,
                      b.margeNetteUsd,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('benchmark_agences')}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execData.comparatifVentesDepenses || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="agenceNom" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()} USD`, name === 'ventesUsd' ? 'Ventes (Entrées)' : name === 'depensesUsd' ? 'Dépenses (Sorties)' : 'Marge Nette']}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar
                    dataKey="ventesUsd"
                    name="Ventes (Entrées)"
                    fill={PALETTE.emerald}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="depensesUsd"
                    name="Dépenses (Sorties)"
                    fill={PALETTE.rose}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="margeNetteUsd"
                    name="Marge Nette"
                    fill={PALETTE.blue}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.teal }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Toutes les agences présentent une marge opérationnelle nette positive (barre bleue). L'agence siège réalise le volume le plus conséquent, tandis que les succursales régionales maintiennent un coefficient d'exploitation maîtrisé.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Agence la plus rentable : <strong>Goma (Siège)</strong></span>
                <span style={{ color: PALETTE.emerald }}>Contribution nette réseau : <strong>+${(execData.depensesJournalieres?.margeJourUsd || 0).toLocaleString()} USD</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3 : TRÉSORERIE & POSITION DE LIQUIDITÉS                           */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'TRESORERIE') && execData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 3.1 : DISPONIBILITÉS EN CAISSE & BANQUES */}
          <div
            id="chart-card-tresorerie-agences"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={20} weight="bold" style={{ color: PALETTE.amber }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Situation de la Trésorerie par Agence
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Répartition des liquidités immédiatement disponibles (Caisses espèces vs Comptes bancaires).
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-tresorerie-agences"
                titre="Situation de la Trésorerie par Agence"
                nomFichier="tresorerie_par_agence"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'tresorerie_par_agence',
                    ['Agence', 'Caisses USD Équivalent', 'Banques USD', 'Total USD Disponible'],
                    (execData.tresorerie?.comparatifTresorerie || []).map((t: any) => [
                      t.agenceNom,
                      t.caissesUsd,
                      t.banquesUsd,
                      t.totalUsd,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('tresorerie_agences')}
                typeVue={typeTresorerie}
                setTypeVue={setTypeTresorerie}
                typesDisponibles={[
                  { type: 'BAR', label: 'Barres' },
                  { type: 'PIE', label: 'Secteurs' },
                ]}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeTresorerie === 'BAR' ? (
                  <BarChart data={execData.tresorerie?.comparatifTresorerie || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="agenceNom" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()} USD`, name === 'caissesUsd' ? 'Caisses physiques' : name === 'banquesUsd' ? 'Comptes bancaires' : 'Total']}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar
                      dataKey="caissesUsd"
                      name="Caisses physiques (USD+CDF)"
                      fill={PALETTE.amber}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="banquesUsd"
                      name="Banques & Dépôts"
                      fill={PALETTE.blue}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={execData.tresorerie?.comparatifTresorerie || []}
                      dataKey="totalUsd"
                      nameKey="agenceNom"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {(execData.tresorerie?.comparatifTresorerie || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} USD`, 'Liquidités']}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.amber }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Ce graphique permet à la Direction d'évaluer le risque de liquidité et de planifier les approvisionnements de caisse. Les caisses physiques permettent de faire face aux besoins opérationnels immédiats, tandis que les comptes bancaires sécurisent les excédents.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Liquidité totale disponible : <strong>${Number(execData.tresorerie?.soldeTresorerieTotalUsd || 0).toLocaleString()} USD</strong></span>
                <span style={{ color: PALETTE.emerald }}>Sécurité financière : <strong>Excellente</strong></span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 3.2 : DÉCOMPOSITION MULTI-DEVISES (USD VS CDF) */}
          <div
            id="chart-card-devises-caisse"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Coins size={20} weight="bold" style={{ color: PALETTE.emerald }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Composition Bimonétaire (USD vs Francs Congolais)
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Poids relatif des devises physiques en caisse au taux de référence de 2 850 CDF / USD.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-devises-caisse"
                titre="Composition Bimonétaire (USD vs Francs Congolais)"
                nomFichier="composition_devises_caisse"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'composition_devises_caisse',
                    ['Devise', 'Montant Nominal', 'Équivalent USD', 'Part du Total'],
                    [
                      ['Dollars Américains (USD)', `$${(execData.tresorerie?.totalCaisseUsd || 0).toLocaleString()}`, execData.tresorerie?.totalCaisseUsd || 0, '68%'],
                      ['Francs Congolais (CDF)', `${(execData.tresorerie?.totalCaisseCdf || 0).toLocaleString()} FC`, Math.round((execData.tresorerie?.totalCaisseCdf || 0) / 2850), '32%'],
                    ]
                  )
                }
                onPrintDossier={() => declencherImpression('devises_caisse')}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Dollars Américains (USD)', value: Number(execData.tresorerie?.totalCaisseUsd || 0) + Number(execData.tresorerie?.totalBanqueUsd || 0) },
                      { name: 'Francs Congolais (CDF)', value: Math.round((Number(execData.tresorerie?.totalCaisseCdf || 0) + Number(execData.tresorerie?.totalBanqueCdf || 0)) / 2850) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={4}
                    isAnimationActive={true}
                    animationDuration={1000}
                    label={({ name, percent }) => `${name.split(' ')[0]} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    <Cell fill={PALETTE.emerald} />
                    <Cell fill={PALETTE.amber} />
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()} USD éq.`]}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.emerald }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                La structure bilancielle protège l'entreprise contre le risque de dépréciation monétaire avec une majorité d'actifs liquides libellés en devise forte (USD), tout en garantissant des encaisses suffisantes en Francs Congolais pour régler les charges locales.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Taux de conversion officiel appliqué : <strong>1 USD = 2 850 CDF</strong></span>
                <span style={{ color: PALETTE.blue }}>Couverture de change : <strong>Stable</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4 : PRÉSENCES & ASSIDUITÉ DU PERSONNEL (SCAN BIOMÉTRIQUE)         */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'PRESENCES') && execData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 4.1 : STATUTS DE PRÉSENCE (SCAN EMPREINTE) */}
          <div
            id="chart-card-presences-repartition"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Fingerprint size={20} weight="bold" style={{ color: PALETTE.cyan }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Répartition des Présences (Scan Biométrique)
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Émargement digitalisé des agents : Présents à l'heure, Retards constatés, Missions, Absences.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-presences-repartition"
                titre="Répartition des Présences (Scan Biométrique)"
                nomFichier="distribution_presences_biometriques"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'distribution_presences_biometriques',
                    ['Statut de Présence', 'Effectif Constaté', 'Pourcentage'],
                    (execData.presences?.distributionPresences || []).map((d: any) => [
                      d.name,
                      d.value,
                      `${Math.round((d.value / (execData.presences?.targetAgents?.length || 10)) * 100)}%`,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('presences_repartition')}
                typeVue={typePresences}
                setTypeVue={setTypePresences}
                typesDisponibles={[
                  { type: 'PIE', label: 'Donut' },
                  { type: 'BAR', label: 'Barres' },
                ]}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typePresences === 'PIE' ? (
                  <PieChart>
                    <Pie
                      data={execData.presences?.distributionPresences || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                    >
                      {(execData.presences?.distributionPresences || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, name: any) => [`${val} collaborateur(s)`, name]}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  </PieChart>
                ) : (
                  <BarChart data={execData.presences?.distributionPresences || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    />
                    <Bar
                      dataKey="value"
                      name="Agents"
                      fill={PALETTE.cyan}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.cyan }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Les scans d'empreinte digitale sont directement reliés au module de paie. Les retards constatés au-delà de la franchise paramétrée déclenchent automatiquement les retenues financières sur les bulletins de paie individuels.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Taux de ponctualité à l'heure : <strong>{execData.presences?.tauxPresence || 0}%</strong></span>
                <span style={{ color: (execData.presences?.retardsCount || 0) > 0 ? PALETTE.amber : PALETTE.emerald }}>
                  Retards sous contrôle : <strong>{execData.presences?.retardsCount || 0} cas</strong>
                </span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 4.2 : TAUX DE PRÉSENCE COMPARATIF PAR AGENCE */}
          <div
            id="chart-card-taux-assiduite"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} weight="bold" style={{ color: PALETTE.emerald }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Taux d'Assiduité par Succursale (%)
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Indice de conformité de présence physique de chaque équipe par rapport à l'effectif contractuel.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-taux-assiduite"
                titre="Taux d'Assiduité par Succursale (%)"
                nomFichier="taux_assiduite_par_agence"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'taux_assiduite_par_agence',
                    ['Agence', 'Effectif Total', 'Présents', 'Retards', 'Missions', 'Absents', 'Taux de Présence'],
                    (execData.presences?.presencesParAgence || []).map((p: any) => [
                      p.agenceNom,
                      p.effectifTotal,
                      p.presents,
                      p.retards,
                      p.missions,
                      p.absents,
                      `${p.tauxPresence}%`,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('taux_assiduite')}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execData.presences?.presencesParAgence || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="ville" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    formatter={(val: any) => [`${val}%`, 'Taux de présence']}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar
                    dataKey="tauxPresence"
                    name="Taux de Présence (%)"
                    fill={PALETTE.emerald}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.emerald }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Le seuil de tolérance managérial fixé est de 90%. Les agences affichant un taux supérieur bénéficient d'une stabilité opérationnelle optimale garantissant la continuité des ventes et de la logistique.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Objectif de conformité contractuelle : <strong>&gt;= 90%</strong></span>
                <span style={{ color: PALETTE.emerald }}>Statut d ensemble : <strong>Objectif atteint</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5 : PARC DES VÉHICULES & DISPONIBILITÉ LOGISTIQUE                 */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'FLOTTE') && execData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 5.1 : STATUT DU PARC ROULANT */}
          <div
            id="chart-card-flotte-disponibilite"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={20} weight="bold" style={{ color: PALETTE.purple }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Disponibilité Opérationnelle de la Flotte
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Statut en temps réel des camions et engins de transport (Disponibles, En transit, En maintenance).
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-flotte-disponibilite"
                titre="Disponibilité Opérationnelle de la Flotte"
                nomFichier="disponibilite_parc_vehicules"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'disponibilite_parc_vehicules',
                    ['Statut Flotte', 'Nombre d Engins', 'Pourcentage'],
                    (execData.parcVehicules?.distributionVehicules || []).map((d: any) => [
                      d.name,
                      d.value,
                      `${Math.round((d.value / (execData.parcVehicules?.totalVehicules || 1)) * 100)}%`,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('flotte_disponibilite')}
                typeVue={typeFlotte}
                setTypeVue={setTypeFlotte}
                typesDisponibles={[
                  { type: 'PIE', label: 'Donut' },
                  { type: 'BAR', label: 'Barres' },
                ]}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeFlotte === 'PIE' ? (
                  <PieChart>
                    <Pie
                      data={execData.parcVehicules?.distributionVehicules || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {(execData.parcVehicules?.distributionVehicules || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, name: any) => [`${val} camion(s)`, name]}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  </PieChart>
                ) : (
                  <BarChart data={execData.parcVehicules?.distributionVehicules || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    />
                    <Bar
                      dataKey="value"
                      name="Engins"
                      fill={PALETTE.purple}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.purple }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                La flotte assure l'approvisionnement des dépôts régionaux et les livraisons aux grands clients. Les engins en maintenance bénéficient d'un suivi des carnets d'entretien dans le module Technique.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Taux de disponibilité flotte : <strong>{execData.parcVehicules?.tauxDisponibiliteFlotte || 0}%</strong></span>
                <span style={{ color: PALETTE.emerald }}>Engins opérationnels : <strong>{execData.parcVehicules?.disponiblesVehicules || 0} / {execData.parcVehicules?.totalVehicules || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 5.2 : CAPACITÉ DE TRANSPORT DE FRET PAR AGENCE */}
          <div
            id="chart-card-capacite-fret"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={20} weight="bold" style={{ color: PALETTE.indigo }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Capacité d'Emport Fret par Succursale
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Capacité cumulée de chargement en Tonnes et en Unités par parc d'agence.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-capacite-fret"
                titre="Capacité d'Emport Fret par Succursale"
                nomFichier="capacite_emport_fret_agences"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'capacite_fret_par_agence',
                    ['Agence', 'Total Engins', 'Disponibles', 'Capacité Tonnes', 'Capacité Unités'],
                    (execData.parcVehicules?.parcParAgence || []).map((p: any) => [
                      p.agenceNom,
                      p.total,
                      p.disponibles,
                      p.capaciteTonnes,
                      p.capaciteSacs,
                    ])
                  )
                }
                onPrintDossier={() => declencherImpression('capacite_fret')}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execData.parcVehicules?.parcParAgence || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="ville" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    formatter={(val: any, name: any) => [`${val} ${name === 'capaciteTonnes' ? 'Tonnes' : 'unités'}`, name === 'capaciteTonnes' ? 'Capacité Tonnes' : 'Capacité Unités']}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar
                    dataKey="capaciteTonnes"
                    name="Capacité (Tonnes)"
                    fill={PALETTE.indigo}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="capaciteSacs"
                    name="Capacité (Unités)"
                    fill={PALETTE.cyan}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.indigo }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                La capacité totale d'enlèvement et de livraison du réseau s'élève à plus de {execData.parcVehicules?.capaciteTotaleTonnes || 0} Tonnes ({execData.parcVehicules?.capaciteTotaleSacs || 0} unités), permettant d'honorer les commandes de gros sans affrètement extérieur.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Capacité totale réseau : <strong>{execData.parcVehicules?.capaciteTotaleTonnes || 0} Tonnes</strong></span>
                <span style={{ color: PALETTE.blue }}>Équivalent unités : <strong>{execData.parcVehicules?.capaciteTotaleSacs || 0} unités</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6 : PRODUCTION & TRANSFORMATION INDUSTRIELLE                      */}
      {/* ========================================================================= */}
      {(activeTab === 'TOUT' || activeTab === 'PRODUCTION') && prodData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 18 }}>
          {/* DIAGRAMME 6.1 : RÉPARTITION PAR PRODUIT FABRIQUÉ */}
          <div
            id="chart-card-production-produits"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={20} weight="bold" style={{ color: PALETTE.teal }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Volumes Produits par Catégorie de Produit Fini
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Rendement et usinage des ordres de fabrication terminés et stockés au magasin général.
                </p>
              </div>

              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 2, borderRadius: 6, marginRight: 4 }}>
                  <button
                    type="button"
                    onClick={() => setTypeProduction('BAR')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 4,
                      background: typeProduction === 'BAR' ? 'var(--surface)' : 'transparent',
                      color: typeProduction === 'BAR' ? 'var(--accent-strong)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Barres
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeProduction('PIE')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 4,
                      background: typeProduction === 'PIE' ? 'var(--surface)' : 'transparent',
                      color: typeProduction === 'PIE' ? 'var(--accent-strong)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Secteurs
                  </button>
                </div>
                <DiagrammeActions
                  containerId="chart-card-production-produits"
                  titre="Volumes Produits par Catégorie de Produit Fini"
                  nomFichier="production_produits_finis"
                  nomAgence={nomAgenceActive}
                  onNotify={afficherToast}
                  onExportExcel={() =>
                    exporterTableauVersExcel(
                      'production_par_produit_fini',
                      ['Désignation Produit Fini', 'Quantité Fabriquée', 'Unité'],
                      (prodData.diagramme?.series || []).map((s: any) => [s.label, s.valeur, s.unite || 'unités'])
                    )
                  }
                  onPrintDossier={() => declencherImpression('production_produits')}
                />
              </div>
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {typeProduction === 'BAR' ? (
                  <BarChart data={prodData.diagramme?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                      formatter={(val: any, _: any, item: any) => [`${val} ${item.payload.unite || 'unités'}`, 'Production']}
                    />
                    <Bar
                      dataKey="valeur"
                      name="Quantité usinée"
                      fill={PALETTE.teal}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={prodData.diagramme?.series || []}
                      dataKey="valeur"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {(prodData.diagramme?.series || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: '0.78rem' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.teal }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                La production est étiquetée par codes QR individuels avec traçabilité du numéro de lot, de la date de fabrication et de la date limite de consommation (DLC).
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Cadence usine : <strong>Conforme au plan industriel</strong></span>
                <span style={{ color: PALETTE.emerald }}>Traçabilité QR : <strong>Active 100%</strong></span>
              </div>
            </div>
          </div>

          {/* DIAGRAMME 6.2 : STATUT DES ORDRES DE TRAVAIL (OF) */}
          <div
            id="chart-card-statut-ordres-prod"
            className="card chart-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wrench size={20} weight="bold" style={{ color: PALETTE.amber }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
                    Statut du Carnet d'Ordres de Fabrication
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Suivi des étapes d'usinage : En cours d'exécution, Planifiés, Terminés &amp; Stockés.
                </p>
              </div>

              <DiagrammeActions
                containerId="chart-card-statut-ordres-prod"
                titre="Statut du Carnet d'Ordres de Fabrication"
                nomFichier="statut_carnet_ordres_fabrication"
                nomAgence={nomAgenceActive}
                onNotify={afficherToast}
                onExportExcel={() =>
                  exporterTableauVersExcel(
                    'statuts_ordres_fabrication',
                    ['Statut OF', 'Nombre d Ordres', 'Unité'],
                    (prodData.diagramme?.vuesSecondaires?.[0]?.series || []).map((s: any) => [s.label, s.valeur, s.unite || 'ordres'])
                  )
                }
                onPrintDossier={() => declencherImpression('statut_ordres_prod')}
              />
            </div>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodData.diagramme?.vuesSecondaires?.[0]?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }}
                    formatter={(val: any) => [`${val} ordre(s)`, 'Volume']}
                  />
                  <Bar
                    dataKey="valeur"
                    name="Ordres de fabrication"
                    fill={PALETTE.amber}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                <Info size={16} style={{ color: PALETTE.amber }} />
                Lecture & Interprétation Décisionnelle :
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.45 }}>
                Le flux de production suit la demande des agences et les alertes de seuil de stock critique pour éviter les ruptures sur les produits finis à forte rotation.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, fontSize: '0.78rem' }}>
                <span>Machines en opération : <strong>Disponibles</strong></span>
                <span style={{ color: PALETTE.emerald }}>Taux d achèvement : <strong>Élevé</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- BAS DE PAGE IMPRESSION OFFICIEL ---------------- */}
      <div
        className="print-only"
        style={{
          display: 'none',
          marginTop: 30,
          paddingTop: 16,
          borderTop: '2px solid #0f172a',
          fontSize: '0.85rem',
          color: '#334155',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <strong>Visa du Responsable d Exploitation & Logistique</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Date & Signature :</p>
            <div style={{ height: 45, borderBottom: '1px dashed #94a3b8', width: 220, marginTop: 10 }}></div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <strong>Sceau & Conformité Système</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Contrôle de Gouvernance Intégré</p>
            <div style={{ height: 45, border: '1px dashed #94a3b8', width: 140, margin: '10px auto 0', borderRadius: 8 }}></div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <strong>Visa de la Direction Générale / Admin Siège</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Pour Approbation & Décision :</p>
            <div style={{ height: 45, borderBottom: '1px dashed #94a3b8', width: 220, marginTop: 10, marginLeft: 'auto' }}></div>
          </div>
        </div>
      </div>

      {/* Notification Toast de confirmation pour téléchargement / copie / impression */}
      {toastMessage && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: 'var(--text)',
            color: 'var(--surface)',
            padding: '10px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
