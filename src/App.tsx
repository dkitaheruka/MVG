import {
  ArrowsClockwise,
  Bank,
  Barcode,
  Bell,
  Books,
  Buildings,
  Calculator,
  CaretRight,
  ChartLineUp,
  ClipboardText,
  CurrencyCircleDollar,
  Desktop,
  DeviceMobile,
  FilePdf,
  Gauge,
  List,
  LockKey,
  Moon,
  Package,
  QrCode,
  Receipt,
  ShieldCheck,
  SignOut,
  Sun,
  TrendUp,
  UserCircleGear,
  UsersThree,
  WarningCircle,
  WifiHigh,
  WifiSlash,
  X,
  Plus,
  Trash,
  Printer,
  UserPlus,
  CheckCircle,
  XCircle,
  ShoppingCart,
  ClockCounterClockwise,
  ArrowUpRight,
  ArrowDownLeft,
  MagnifyingGlass,
  Wallet,
  Truck,
  Tag,
  PencilSimple,
  DownloadSimple,
  FloppyDisk,
  Wrench,
  FileXls,
  Coins,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { apiRequest, downloadUrl } from './lib/api'
import { PurchasesPage } from './pages/PurchasesPage'
import { StockTransfersPage } from './pages/StockTransfersPage'
import { PayrollPage } from './pages/PayrollPage'
import { MaintenancePage } from './pages/MaintenancePage'
import {
  listOfflineOperations,
  saveOfflineOperation,
  syncPendingOperations,
} from './lib/offline'
import { parseJwt } from './lib/jwt'
import { useAppStore } from './stores/appStore'
import { useT } from './i18n'
import type {
  CartItem,
  Client,
  CompteCaisse,
  EcritureComptable,
  LigneFinanciere,
  Permission,
  PermissionCode,
  PlanComptable,
  RapportPerformance,
  RoleUtilisateur,
  ServiceEntreprise,
  ServicePerformance,
  StockAgence,
  SyncOperation,
  TauxChangeAgence,
  Transaction,
  Vente,
  RapprochementBancaire,
  BonLivraison,
  DirectionKpis,
  EtatBesoin,
  EntretienTechnique,
} from './types'

type NavItem = {
  to: string
  labelKey: ReturnType<typeof useT> extends (key: infer K) => string ? K : never
  icon: typeof Gauge
  permission: PermissionCode
}

const navItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'dashboard', icon: Gauge, permission: 'dashboard.voir' },
  { to: '/ventes', labelKey: 'sales', icon: Receipt, permission: 'ventes.voir' },
  { to: '/stock', labelKey: 'stock', icon: Package, permission: 'stocks.voir' },
  { to: '/achats', labelKey: 'purchases', icon: ShoppingCart, permission: 'achats.gerer' },
  { to: '/transferts', labelKey: 'transfers', icon: Truck, permission: 'transferts.gerer' },
  { to: '/maintenance', labelKey: 'maintenance', icon: Wrench, permission: 'flotte.gerer' },
  { to: '/production', labelKey: 'production', icon: Barcode, permission: 'production.gerer' },
  { to: '/tresorerie', labelKey: 'treasury', icon: Bank, permission: 'tresorerie.voir' },
  { to: '/paie', labelKey: 'payroll', icon: UsersThree, permission: 'rh.gerer' },
  { to: '/comptabilite', labelKey: 'accounting', icon: Books, permission: 'comptabilite.plan_gerer' },
  { to: '/reporting', labelKey: 'reporting', icon: ChartLineUp, permission: 'reporting.voir' },
  { to: '/admin', labelKey: 'admin', icon: ShieldCheck, permission: 'roles.gerer' },
  { to: '/sync', labelKey: 'sync', icon: ArrowsClockwise, permission: 'sync.voir' },
]

function useToken() {
  return useAppStore((state) => state.session?.token)
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return online
}

function App() {
  const session = useAppStore((state) => state.session)

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/*" element={session ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

function LoginPage() {
  const t = useT()
  const setSession = useAppStore((state) => state.setSession)
  const [email, setEmail] = useState('dkitaheruka@gmail.com')
  const [password, setPassword] = useState('admin123')
  const [deviceType, setDeviceType] = useState<'WEB' | 'MOBILE'>('WEB')
  const [deviceId, setDeviceId] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (twoFactor) {
        return apiRequest<{ token: string }>('/api/auth/verify-2fa', {
          method: 'POST',
          body: JSON.stringify({ email, code }),
          deviceType,
          deviceId,
        })
      }

      return apiRequest<{ token: string } | string>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        deviceType,
        deviceId,
      })
    },
    onSuccess: (result) => {
      if (typeof result === 'string') {
        if (result === '2FA_REQUIRED') {
          setTwoFactor(true)
          setMessage('Code 2FA requis. Vérifiez le canal configuré côté backend.')
          return
        }
        if (result === 'PASSWORD_CHANGE_REQUIRED') {
          setMessage('Changement de mot de passe requis avant de continuer.')
          return
        }
      }

      if (typeof result !== 'string') {
        setSession(parseJwt(result.token))
      }
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Connexion impossible'),
  })

  return (
    <main className="login-page">
      <section className="login-panel" aria-label={t('login')}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <Buildings size={26} weight="duotone" />
          </div>
          <div>
            <h1>Matabishi ERP</h1>
            <p>Suite de gestion commerciale, stock, production et finance.</p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            loginMutation.mutate()
          }}
        >
          <label>
            {t('email')}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          {!twoFactor && (
            <label>
              {t('password')}
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </label>
          )}
          {twoFactor && (
            <label>
              Code 2FA
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required />
            </label>
          )}

          <div className="segmented">
            <button type="button" className={clsx(deviceType === 'WEB' && 'active')} onClick={() => setDeviceType('WEB')}>
              <Desktop size={18} /> Web
            </button>
            <button type="button" className={clsx(deviceType === 'MOBILE' && 'active')} onClick={() => setDeviceType('MOBILE')}>
              <DeviceMobile size={18} /> Mobile
            </button>
          </div>

          {deviceType === 'MOBILE' && (
            <label>
              Identifiant appareil
              <input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="ex: MATABISHI-GOMA-001" />
            </label>
          )}

          {message && <p className="form-message">{message}</p>}

          <button className="primary-action" type="submit" disabled={loginMutation.isPending}>
            <LockKey size={18} />
            {loginMutation.isPending ? 'Connexion...' : t('signIn')}
          </button>

          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Profils de test & simulation des rôles :
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { email: 'dkitaheruka@gmail.com', label: 'Super Admin' },
                { email: 'admin.siege@mvg.cd', label: 'Admin Siège' },
                { email: 'chef.goma@mvg.cd', label: 'Chef Agence' },
                { email: 'vendeur.goma@mvg.cd', label: 'Vendeur' },
                { email: 'caissier.goma@mvg.cd', label: 'Caissière' },
                { email: 'magasinier.goma@mvg.cd', label: 'Magasinier' },
                { email: 'comptable.senior@mvg.cd', label: 'Comptable Senior' },
              ].map((p) => (
                <button
                  key={p.email}
                  type="button"
                  className="secondary-action"
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  onClick={() => {
                    setEmail(p.email)
                    setPassword('admin123')
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
      <aside className="login-aside">
        <h2>Conçu pour une exploitation multi-agences</h2>
        <div className="login-feature"><ShieldCheck size={22} /> Rôles personnalisés et permissions fines</div>
        <div className="login-feature"><DeviceMobile size={22} /> Appareils mobiles autorisés pour vendeurs</div>
        <div className="login-feature"><WifiSlash size={22} /> Opérations terrain hors ligne avec synchronisation</div>
        <div className="login-feature"><QrCode size={22} /> QR lots générés à la production et lus à la vente</div>
      </aside>
    </main>
  )
}

function AppShell() {
  const t = useT()
  const location = useLocation()
  const online = useOnlineStatus()
  const session = useAppStore((state) => state.session)
  const theme = useAppStore((state) => state.theme)
  const language = useAppStore((state) => state.language)
  const setTheme = useAppStore((state) => state.setTheme)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const setSession = useAppStore((state) => state.setSession)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const printProposal = useAppStore((state) => state.printProposal)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)
  const can = useAppStore((state) => state.can)

  const visibleNav = navItems.filter((item) => can(item.permission))
  const currentTitle = visibleNav.find((item) => location.pathname.startsWith(item.to))?.labelKey ?? 'dashboard'

  return (
    <div className="app-shell">
      <aside className={clsx('sidebar', sidebarOpen && 'open')}>
        <div className="sidebar-head">
          <div className="brand-mark"><Buildings size={24} weight="duotone" /></div>
          <div>
            <strong>Matabishi</strong>
            <span>ERP Pro Max</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Fermer menu">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Navigation principale">
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                <Icon size={20} />
                <span>{t(item.labelKey)}</span>
                <CaretRight size={14} className="nav-caret" />
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="session-card">
            <UserCircleGear size={22} />
            <div>
              <strong>{session?.role}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
          <button className="secondary-action" onClick={() => setSession(null)}>
            <SignOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir menu">
            <List size={22} />
          </button>
          <div>
            <span className="topbar-kicker">{t('app')}</span>
            <h2>{t(currentTitle)}</h2>
          </div>
          <div className="topbar-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <UserCircleGear size={17} />
              <select
                value={session?.email}
                onChange={async (e) => {
                  const targetEmail = e.target.value
                  try {
                    const res = await apiRequest<{ token: string }>('/api/auth/login', {
                      method: 'POST',
                      body: JSON.stringify({ email: targetEmail, password: 'demo' }),
                    })
                    setSession(parseJwt(res.token))
                  } catch (err) {
                    console.error(err)
                  }
                }}
                style={{ padding: '3px 6px', fontSize: '0.78rem', border: 'none', background: 'transparent' }}
                aria-label="Changer de rôle actif"
              >
                <option value="dkitaheruka@gmail.com">David (Super Admin)</option>
                <option value="admin.siege@mvg.cd">Direction (Admin Siège)</option>
                <option value="chef.goma@mvg.cd">Kasereka (Chef Goma)</option>
                <option value="vendeur.goma@mvg.cd">Mwamba (Vendeur)</option>
                <option value="caissier.goma@mvg.cd">Sophie (Caissière)</option>
                <option value="magasinier.goma@mvg.cd">Baraka (Magasinier)</option>
                <option value="comptable.senior@mvg.cd">Kambale (Comptable Sr)</option>
                <option value="comptable@mvg.cd">Claire (Comptable)</option>
              </select>
            </div>
            <span className={clsx('network-pill', online ? 'online' : 'offline')}>
              {online ? <WifiHigh size={17} /> : <WifiSlash size={17} />}
              {online ? 'En ligne' : 'Hors ligne'}
            </span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as never)} aria-label="Langue">
              <option value="fr">FR</option>
              <option value="sw">SW</option>
              <option value="en">EN</option>
            </select>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Changer thème">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ventes" element={<SalesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/achats" element={<PurchasesPage />} />
            <Route path="/transferts" element={<StockTransfersPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/tresorerie" element={<TreasuryPage />} />
            <Route path="/paie" element={<PayrollPage />} />
            <Route path="/comptabilite" element={<AccountingPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/sync" element={<SyncPage />} />
          </Routes>
        </main>
      </div>

      {printProposal && (
        <div className="modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: 520, textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>{printProposal.title}</h3>
            {printProposal.ref && (
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 10 }}>
                Référence officielle : <strong>{printProposal.ref}</strong>
              </div>
            )}
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '0 0 20px', lineHeight: 1.45 }}>
              {printProposal.subtitle || "L'opération a été enregistrée avec succès. Souhaitez-vous imprimer le document officiel correspondant maintenant ?"}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={printProposal.primaryDocUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-action"
                style={{ padding: '10px 16px', fontSize: '0.92rem', justifyContent: 'center', textDecoration: 'none' }}
                onClick={() => setPrintProposal(null)}
              >
                <Printer size={18} /> Imprimer {printProposal.primaryDocName}
              </a>

              {printProposal.secondaryDocUrl && (
                <a
                  href={printProposal.secondaryDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-action"
                  style={{ padding: '10px 16px', fontSize: '0.92rem', justifyContent: 'center', textDecoration: 'none' }}
                  onClick={() => setPrintProposal(null)}
                >
                  <Printer size={18} /> Imprimer {printProposal.secondaryDocName}
                </a>
              )}

              <button
                type="button"
                className="secondary-action"
                style={{ marginTop: 4, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                onClick={() => setPrintProposal(null)}
              >
                Continuer sans imprimer (Fermer)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardPage() {
  const token = useToken()
  const { data, isLoading, error } = useQuery({
    queryKey: ['rapport-global'],
    queryFn: () => apiRequest<RapportPerformance>('/api/reporting/siege/global', { token }),
    enabled: Boolean(token),
  })

  const metrics = [
    { label: 'Recettes USD', value: money(data?.totalRecettesUsd), icon: CurrencyCircleDollar },
    { label: 'Recettes CDF', value: money(data?.totalRecettesCdf, 'CDF'), icon: Calculator },
    { label: 'Consolidé USD', value: money(data?.totalConsolideUsd), icon: TrendUp },
    { label: 'Transactions', value: data?.nombreTransactions ?? 0, icon: ClipboardText },
  ]

  return (
    <section className="page-grid">
      <div className="hero-band">
        <div>
          <p className="section-label">Vue siège</p>
          <h1>Pilotage opérationnel multi-agences</h1>
          <p>Suivez ventes, stock, caisse, production, crédits, audit et synchronisation depuis un tableau de bord unique.</p>
        </div>
        <div className="hero-status">
          <Bell size={24} />
          <strong>3 validations à surveiller</strong>
          <span>Crédits, sorties de caisse, stocks négatifs</span>
        </div>
      </div>

      {error && <Notice type="warning" text="Le backend ne répond pas encore pour le reporting. L’interface reste prête à consommer l’API." />}

      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article className="metric-card" key={metric.label}>
              <Icon size={23} />
              <span>{metric.label}</span>
              <strong>{isLoading ? '...' : metric.value}</strong>
            </article>
          )
        })}
      </div>

      <div className="two-column">
        <Panel title="Flux de validation" icon={ShieldCheck}>
          <WorkflowRow label="Vente crédit" value="Chef agence" status="En attente" />
          <WorkflowRow label="Sortie caisse" value="Chef agence" status="Contrôle solde" />
          <WorkflowRow label="Stock négatif offline" value="Chef agence" status="Correction" />
          <WorkflowRow label="Prix agence" value="Admin siège" status="Historisé" />
        </Panel>
        <Panel title="Architecture terrain" icon={DeviceMobile}>
          <div className="feature-list">
            <Feature icon={WifiSlash} text="Vente hors ligne jusqu’à deux semaines avec file locale IndexedDB." />
            <Feature icon={QrCode} text="QR lot signé, sans prix embarqué, prix récupéré par agence." />
            <Feature icon={WarningCircle} text="Rappel simple si expiration inférieure à deux mois, sans blocage." />
          </div>
        </Panel>
      </div>
    </section>
  )
}

function SalesPage() {
  const token = useToken()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const session = useAppStore((state) => state.session)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'credits' | 'clients' | 'livraisons'>('pos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [paymentMode, setPaymentMode] = useState<'CASH_USD' | 'CASH_CDF' | 'CREDIT'>('CASH_USD')
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [activeReceipt, setActiveReceipt] = useState<Vente | null>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientAddress, setNewClientAddress] = useState('')
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [repaymentClient, setRepaymentClient] = useState<any | null>(null)
  const [repaymentMontant, setRepaymentMontant] = useState('')
  const [repaymentDevise, setRepaymentDevise] = useState<'USD' | 'CDF'>('USD')
  const [repaymentCaisseId, setRepaymentCaisseId] = useState<number | ''>(1)
  const [repaymentError, setRepaymentError] = useState<string | null>(null)
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<number | ''>('')
  const [modeTransport, setModeTransport] = useState<'ENLEVEMENT_MAGASIN' | 'VEHICULE_CLIENT' | 'FLOTTE_ENTREPRISE'>('ENLEVEMENT_MAGASIN')
  const [clientVehicule, setClientVehicule] = useState('')
  const [clientChauffeur, setClientChauffeur] = useState('')

  // Formulaire Bon de Livraison
  const [showNewBLModal, setShowNewBLModal] = useState(false)
  const [blVenteId, setBlVenteId] = useState<number | ''>('')
  const [blClientNom, setBlClientNom] = useState('')
  const [blClientTel, setBlClientTel] = useState('')
  const [blAdresse, setBlAdresse] = useState('')
  const [blModeTransport, setBlModeTransport] = useState<'ENLEVEMENT_MAGASIN' | 'VEHICULE_CLIENT' | 'FLOTTE_ENTREPRISE'>('ENLEVEMENT_MAGASIN')
  const [blClientVehicule, setBlClientVehicule] = useState('')
  const [blClientChauffeur, setBlClientChauffeur] = useState('')
  const [blVehiculeId, setBlVehiculeId] = useState<number | ''>('')
  const [blSacs, setBlSacs] = useState('50')
  const [blPoidsKg, setBlPoidsKg] = useState('1250')
  const [blObservations, setBlObservations] = useState('')

  const flotteQuery = useQuery({
    queryKey: ['flotte-vehicules'],
    queryFn: () => apiRequest<any[]>('/api/flotte/vehicules', { token }),
    enabled: Boolean(token),
  })

  // 1. Données du stock de l'agence
  const stockQuery = useQuery({
    queryKey: ['stock-agence', agenceId],
    queryFn: () => apiRequest<StockAgence[]>(`/api/stocks/agence/${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  // 2. Taux de change actif
  const rateQuery = useQuery({
    queryKey: ['taux-actif', agenceId],
    queryFn: () => apiRequest<TauxChangeAgence>(`/api/parametrage/agences/${agenceId}/taux/actif`, { token }),
    enabled: Boolean(token),
    retry: false,
  })
  const tauxActif = rateQuery.data?.taux ?? 2850

  // 2b. Prix spécifiques d'agence
  const prixAgenceQuery = useQuery({
    queryKey: ['prix-agence', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/parametrage/articles/prix?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  // 3. Liste des clients
  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiRequest<Client[]>('/api/clients', { token }),
    enabled: Boolean(token),
  })

  // 4. Historique des ventes
  const salesQuery = useQuery({
    queryKey: ['ventes-agence', agenceId],
    queryFn: () => apiRequest<Vente[]>(`/api/ventes?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token) && activeTab === 'history',
  })

  // 5. Ventes à crédit en attente (Chef d'agence)
  const creditsQuery = useQuery({
    queryKey: ['ventes-credits-attente', agenceId],
    queryFn: () => apiRequest<Vente[]>(`/api/ventes?agenceId=${agenceId}&statutCredit=EN_ATTENTE`, { token }),
    enabled: Boolean(token) && activeTab === 'credits',
  })

  // 6. Bons de livraison
  const livraisonsQuery = useQuery({
    queryKey: ['livraisons', agenceId],
    queryFn: () => apiRequest<BonLivraison[]>(`/api/logistique/livraisons?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const createBLMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/logistique/livraisons', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          venteId: blVenteId || undefined,
          clientNom: blClientNom,
          clientTelephone: blClientTel,
          adresseLivraison: blAdresse,
          modeTransport: blModeTransport,
          clientVehicule: blClientVehicule || undefined,
          clientChauffeur: blClientChauffeur || undefined,
          vehiculeId: blModeTransport === 'FLOTTE_ENTREPRISE' ? (blVehiculeId || undefined) : undefined,
          quantiteSacs: Number(blSacs),
          poidsTotalKg: Number(blPoidsKg),
          observations: blObservations,
        }),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['livraisons'] })
      queryClient.invalidateQueries({ queryKey: ['flotte-vehicules'] })
      setShowNewBLModal(false)
      setBlClientNom('')
      setBlAdresse('')
      setBlObservations('')
      if (res && res.id) {
        setPrintProposal({
          title: 'Bon de Livraison (BL) Émis !',
          ref: res.numeroBL || `BL-${res.id}`,
          subtitle: `Le bon de livraison pour ${res.clientNom || 'le client'} a été validé. Imprimez le document officiel :`,
          primaryDocName: 'Bon de Livraison Officiel',
          primaryDocUrl: `/api/logistique/livraisons/${res.id}/document`,
        })
      }
    },
  })

  const updateBLStatutMutation = useMutation({
    mutationFn: ({ id, statut, recepteurNom }: { id: number; statut: string; recepteurNom?: string }) =>
      apiRequest(`/api/logistique/livraisons/${id}/statut`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          statut,
          recepteurNom,
          recepteurSignature: statut === 'LIVRE' ? 'SIGNATURE_CERTIFIEE_DECHARGE' : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livraisons'] })
      queryClient.invalidateQueries({ queryKey: ['flotte-vehicules'] })
    },
  })

  // Mutateurs
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Le panier est vide')

      const totalUsd = cart.reduce((acc, item) => acc + item.prix * item.quantite, 0)
      const selectedClient = clientsQuery.data?.find((c) => c.id === selectedClientId)

      if (!online) {
        // Enregistrement hors ligne dans IndexedDB
        const offlineSale: Vente = {
          id: Date.now(),
          referenceVente: `OFF-${Date.now().toString().slice(-6)}`,
          agence: { id: agenceId, nom: 'Mon Agence', estSiege: false },
          vendeur: { email: session?.email ?? 'vendeur@mvg.cd' },
          client: selectedClient ?? { nom: 'Client Comptant' },
          montantTotal: totalUsd,
          devise: paymentMode === 'CASH_CDF' ? 'CDF' : 'USD',
          estCredit: paymentMode === 'CREDIT',
          statutCredit: paymentMode === 'CREDIT' ? 'EN_ATTENTE' : 'AUCUN',
          dateVente: new Date().toISOString(),
          details: cart.map((item) => ({
            article: { id: item.articleId, designation: item.designation, uniteMesure: item.uniteMesure },
            quantite: item.quantite,
            prixUnitaireApplique: item.prix,
          })),
        }

        await saveOfflineOperation({
          id: crypto.randomUUID(),
          type: 'VENTE',
          createdAt: new Date().toISOString(),
          status: 'LOCAL',
          payload: offlineSale,
        })

        return offlineSale
      }

      // Enregistrement de la vente (Mode En ligne ou Hors-Ligne)
      const payload: Vente = {
        agence: { id: agenceId, nom: 'Agence locale', estSiege: false },
        client: selectedClient ? { id: selectedClient.id, nom: selectedClient.nom } : undefined,
        montantTotal: totalUsd,
        devise: paymentMode === 'CASH_CDF' ? 'CDF' : 'USD',
        estCredit: paymentMode === 'CREDIT',
        details: cart.map((item) => ({
          article: { id: item.articleId, designation: item.designation },
          quantite: item.quantite,
          prixUnitaireApplique: item.prix,
        })),
      }

      if (!navigator.onLine) {
        // Enregistrement local direct dans IndexedDB
        const offlineId = `OFF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const localVente: Vente = {
          ...payload,
          id: -Date.now(),
          referenceVente: `OFF-${Date.now()}`,
          dateVente: new Date().toISOString(),
        }
        await saveOfflineOperation({
          id: offlineId,
          type: 'VENTE',
          payload: localVente,
          createdAt: new Date().toISOString(),
          status: 'LOCAL',
        })
        return localVente
      }

      try {
        return await apiRequest<Vente>('/api/ventes/nouvelle', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        })
      } catch (err: any) {
        // En cas de panne de réseau inattendue, sauvegarde de secours locale
        const offlineId = `OFF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const localVente: Vente = {
          ...payload,
          id: -Date.now(),
          referenceVente: `OFF-${Date.now()}`,
          dateVente: new Date().toISOString(),
        }
        await saveOfflineOperation({
          id: offlineId,
          type: 'VENTE',
          payload: localVente,
          createdAt: new Date().toISOString(),
          status: 'LOCAL',
          errorMessage: 'Enregistré localement suite à perte de connectivité',
        })
        return localVente
      }
    },
    onSuccess: (savedVente) => {
      setActiveReceipt(savedVente)
      setCart([])
      setCheckoutMessage(null)
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['sync-operations'] })
      if (savedVente && savedVente.id && savedVente.id > 0) {
        setPrintProposal({
          title: 'Vente Validée et Encaissée !',
          ref: savedVente.referenceVente || `VNT-${savedVente.id}`,
          subtitle: `Paiement de $${savedVente.montantTotal} ${savedVente.devise} enregistré. Choisissez le document officiel à imprimer :`,
          primaryDocName: 'Facture / Ticket de Caisse',
          primaryDocUrl: `/api/ventes/${savedVente.id}/facture`,
          secondaryDocName: 'Bon de Livraison (BL)',
          secondaryDocUrl: `/api/ventes/${savedVente.id}/bon-livraison`,
        })
      }
    },
    onError: (err) => {
      setCheckoutMessage(err instanceof Error ? err.message : 'Échec de la validation de la vente')
    },
  })

  const validerCreditMutation = useMutation({
    mutationFn: (id: number) => apiRequest<Vente>(`/api/ventes/credits/${id}/valider`, { method: 'POST', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventes-credits-attente'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
    },
  })

  const rejeterCreditMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<Vente>(`/api/ventes/credits/${id}/rejeter`, {
        method: 'POST',
        token,
        body: JSON.stringify({ motif: 'Rejeté par chef agence' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventes-credits-attente'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
    },
  })

  const createClientMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<Client>('/api/clients', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newClientName,
          telephone: newClientPhone,
          adresse: newClientAddress,
          soldeDette: 0,
        }),
      })
    },
    onSuccess: (nouveauClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSelectedClientId(nouveauClient.id ?? null)
      setShowNewClientModal(false)
      setNewClientName('')
      setNewClientPhone('')
      setNewClientAddress('')
    },
  })

  const reimburseMutation = useMutation({
    mutationFn: () => {
      if (!repaymentClient) throw new Error('Aucun client sélectionné')
      return apiRequest(`/api/clients/${repaymentClient.id}/rembourser`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          montant: Number(repaymentMontant),
          devise: repaymentDevise,
          caisseId: repaymentCaisseId,
          agenceId,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setRepaymentClient(null)
      setRepaymentMontant('')
      setRepaymentError(null)
    },
    onError: (err: any) => setRepaymentError(err.message || 'Erreur lors du remboursement'),
  })

  const demandeAnnulationMutation = useMutation({
    mutationFn: (venteId: number) =>
      apiRequest(`/api/ventes/${venteId}/demande-annulation`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
    },
    onError: (err: any) => alert(err.message || 'Erreur lors de la demande d annulation'),
  })

  const validerAnnulationMutation = useMutation({
    mutationFn: (venteId: number) =>
      apiRequest(`/api/ventes/${venteId}/valider-annulation`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
    },
    onError: (err: any) => alert(err.message || 'Erreur lors de la validation d annulation'),
  })

  // Gestion du panier
  function addToCart(stock: StockAgence) {
    if (!stock.article) return
    const articleId = stock.article.id
    const existing = cart.find((item) => item.articleId === articleId)
    const stockDispo = stock.quantite ?? 0
    const specialPrice = (prixAgenceQuery.data ?? []).find(
      (p: any) => p.articleId === articleId && p.statut === 'VALIDE' && p.actif
    )
    const prix = specialPrice ? specialPrice.prix : (stock.article.prixVenteStandard ?? 10.0)

    if (existing) {
      if (existing.quantite + 1 > stockDispo) {
        alert('Stock disponible insuffisant pour cet article !')
        return
      }
      setCart(cart.map((item) => (item.articleId === articleId ? { ...item, quantite: item.quantite + 1 } : item)))
    } else {
      if (stockDispo < 1) {
        alert('Stock épuisé pour cet article !')
        return
      }
      setCart([
        ...cart,
        {
          articleId,
          designation: stock.article.designation,
          codeUnique: stock.article.codeUnique,
          uniteMesure: stock.article.uniteMesure,
          prix,
          quantite: 1,
          stockDisponible: stockDispo,
          numeroLot: stock.numeroLot,
          dateExpiration: stock.dateExpiration,
        },
      ])
    }
  }

  function updateQty(articleId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.articleId === articleId) {
            const next = item.quantite + delta
            if (next > item.stockDisponible) {
              alert('Quantité supérieure au stock disponible')
              return item
            }
            return next > 0 ? { ...item, quantite: next } : null
          }
          return item
        })
        .filter((item): item is CartItem => item !== null),
    )
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    const match = (stockQuery.data ?? []).find(
      (s) =>
        s.article?.codeUnique?.toLowerCase() === barcodeInput.trim().toLowerCase() ||
        s.numeroLot?.toLowerCase() === barcodeInput.trim().toLowerCase() ||
        s.article?.designation.toLowerCase().includes(barcodeInput.trim().toLowerCase()),
    )

    if (match) {
      addToCart(match)
      setBarcodeInput('')
    } else {
      alert(`Produit introuvable pour "${barcodeInput}"`)
    }
  }

  // Filtrage du catalogue
  const catalog = (stockQuery.data ?? []).filter((stock) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      stock.article?.designation.toLowerCase().includes(q) ||
      stock.article?.codeUnique?.toLowerCase().includes(q) ||
      stock.numeroLot?.toLowerCase().includes(q)
    )
  })

  const totalUsd = cart.reduce((acc, item) => acc + item.prix * item.quantite, 0)
  const totalCdf = Math.round(totalUsd * tauxActif)
  const selectedClient = clientsQuery.data?.find((c) => c.id === selectedClientId)
  const pendingCreditsCount = creditsQuery.data?.length ?? 0

  return (
    <section className="page-grid">
      <div className="module-header">
        <div className="module-icon">
          <Receipt size={28} weight="duotone" />
        </div>
        <div>
          <h1>Vente & Caisse POS</h1>
          <p>Terminal de point de vente, encaissement bidevise USD/CDF, gestion des crédits et tickets thermiques.</p>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="pos-tabs">
        <button
          className={clsx('pos-tab-btn', activeTab === 'pos' && 'active')}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingCart size={19} />
          Terminal POS (Caisse)
        </button>
        <button
          className={clsx('pos-tab-btn', activeTab === 'history' && 'active')}
          onClick={() => setActiveTab('history')}
        >
          <ClockCounterClockwise size={19} />
          Historique des Ventes
        </button>
        <button
          className={clsx('pos-tab-btn', activeTab === 'credits' && 'active')}
          onClick={() => setActiveTab('credits')}
        >
          <WarningCircle size={19} />
          Crédits en Attente
          {pendingCreditsCount > 0 && <span className="badge">{pendingCreditsCount}</span>}
        </button>
        <button
          className={clsx('pos-tab-btn', activeTab === 'clients' && 'active')}
          onClick={() => setActiveTab('clients')}
        >
          <UsersThree size={19} />
          Clients & Dettes
        </button>
        <button
          className={clsx('pos-tab-btn', activeTab === 'livraisons' && 'active')}
          onClick={() => setActiveTab('livraisons')}
        >
          <Truck size={19} />
          Bons de Livraison (BL) ({livraisonsQuery.data?.length ?? 0})
        </button>
      </div>

      {/* ONGLET 1 : TERMINAL POS */}
      {activeTab === 'pos' && (
        <div className="pos-layout">
          {/* CATALOGUE PRODUITS */}
          <div className="pos-catalog">
            <div className="pos-toolbar">
              <form onSubmit={handleBarcodeSubmit} className="pos-search" style={{ maxWidth: '280px' }}>
                <input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scanner code barre / lot..."
                  autoFocus
                />
              </form>
              <div className="pos-search">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un article ou désignation..."
                />
              </div>
              <div className="pos-rate-badge">
                <CurrencyCircleDollar size={18} />
                1 USD = {tauxActif.toLocaleString()} CDF
              </div>
            </div>

            {stockQuery.isLoading && <p>Chargement du catalogue...</p>}

            <div className="pos-product-grid">
              {catalog.map((stock) => {
                const dispo = stock.quantite ?? 0
                const prixUsd = stock.article?.prixVenteStandard ?? 10.0
                const prixCdf = Math.round(prixUsd * tauxActif)
                const isOutOfStock = dispo <= 0
                const isLow = dispo > 0 && dispo <= (stock.seuilAlerte ?? 5)

                return (
                  <article key={stock.id} className="pos-product-card">
                    <header>
                      <h4>{stock.article?.designation ?? 'Article inconnu'}</h4>
                      <span
                        className={clsx(
                          'stock-pill',
                          isOutOfStock ? 'out-of-stock' : isLow ? 'low-stock' : 'in-stock',
                        )}
                      >
                        {isOutOfStock ? 'Épuisé' : `${dispo} ${stock.article?.uniteMesure ?? 'U'}`}
                      </span>
                    </header>

                    <div className="price-block">
                      <span className="price-usd">${prixUsd.toFixed(2)}</span>
                      <span className="price-cdf">{prixCdf.toLocaleString()} CDF</span>
                      {stock.numeroLot && (
                        <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.74rem' }}>
                          Lot: {stock.numeroLot}
                        </small>
                      )}
                    </div>

                    <button
                      className="add-btn"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(stock)}
                    >
                      <Plus size={16} />
                      Ajouter
                    </button>
                  </article>
                )
              })}

              {!stockQuery.isLoading && catalog.length === 0 && (
                <p style={{ gridColumn: '1 / -1', color: 'var(--muted)', padding: '24px 0' }}>
                  Aucun article trouvé dans les stocks de cette agence.
                </p>
              )}
            </div>
          </div>

          {/* PANIER DE COMMANDE */}
          <aside className="pos-cart">
            <div className="pos-cart-header">
              <h3>
                <ShoppingCart size={22} />
                Panier ({cart.reduce((a, b) => a + b.quantite, 0)})
              </h3>
              {cart.length > 0 && (
                <button
                  className="icon-button"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => setCart([])}
                  title="Vider le panier"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>

            {/* SÉLECTEUR CLIENT */}
            <div className="pos-cart-client">
              <label style={{ fontSize: '0.86rem' }}>Client</label>
              <div className="pos-cart-client-row">
                <select
                  value={selectedClientId ?? ''}
                  onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Client Comptant (Anonyme) --</option>
                  {(clientsQuery.data ?? []).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom} {client.telephone ? `(${client.telephone})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowNewClientModal(true)}
                  title="Nouveau Client"
                >
                  <UserPlus size={18} />
                </button>
              </div>

              {selectedClient && (selectedClient.soldeDette ?? 0) > 0 && (
                <div className="debt-alert">
                  <WarningCircle size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Dette en cours : ${selectedClient.soldeDette?.toFixed(2)} USD
                </div>
              )}
            </div>

            {/* ARTICLES DANS LE PANIER */}
            <div className="pos-cart-items">
              {cart.map((item) => (
                <div key={item.articleId} className="pos-cart-item">
                  <div>
                    <span className="item-title">{item.designation}</span>
                    <span className="item-sub">
                      ${item.prix.toFixed(2)} × {item.quantite} = ${(item.prix * item.quantite).toFixed(2)}
                    </span>
                  </div>

                  <div className="mini-stepper">
                    <button onClick={() => updateQty(item.articleId, -1)}>-</button>
                    <span>{item.quantite}</span>
                    <button onClick={() => updateQty(item.articleId, 1)}>+</button>
                  </div>

                  <button
                    className="icon-button"
                    style={{ width: '28px', height: '28px', border: 0, background: 'transparent' }}
                    onClick={() => updateQty(item.articleId, -item.quantite)}
                  >
                    <Trash size={15} color="var(--danger)" />
                  </button>
                </div>
              ))}

              {cart.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '24px 0' }}>
                  Votre panier est vide. Cliquez sur un article pour l'ajouter.
                </p>
              )}
            </div>

            {/* TOTAUX & MODE DE RÈGLEMENT */}
            <div className="pos-cart-totals">
              <div className="pos-total-row">
                <span>Total à Payer :</span>
                <strong>${totalUsd.toFixed(2)} USD</strong>
              </div>
              <div className="pos-total-row">
                <span className="cdf">Équivalent en Francs Congolais :</span>
                <span className="cdf" style={{ fontWeight: 700 }}>
                  {totalCdf.toLocaleString()} CDF
                </span>
              </div>

              <div style={{ margin: '8px 0 4px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Règlement :</span>
              </div>
              <div className="pos-payment-mode">
                <button
                  type="button"
                  className={clsx(paymentMode === 'CASH_USD' && 'active')}
                  onClick={() => setPaymentMode('CASH_USD')}
                >
                  Cash USD
                </button>
                <button
                  type="button"
                  className={clsx(paymentMode === 'CASH_CDF' && 'active')}
                  onClick={() => setPaymentMode('CASH_CDF')}
                >
                  Cash CDF
                </button>
                <button
                  type="button"
                  className={clsx(paymentMode === 'CREDIT' && 'active')}
                  onClick={() => {
                    if (!selectedClientId) {
                      alert('Veuillez sélectionner un client enregistré avant de vendre à crédit !')
                      return
                    }
                    setPaymentMode('CREDIT')
                  }}
                >
                  Crédit
                </button>
              </div>

              {checkoutMessage && <p className="form-message">{checkoutMessage}</p>}

              <button
                className="primary-action"
                style={{ width: '100%', marginTop: 8 }}
                disabled={cart.length === 0 || checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
              >
                <Receipt size={18} />
                {checkoutMutation.isPending
                  ? 'Encaissement...'
                  : paymentMode === 'CREDIT'
                    ? 'Soumettre Vente à Crédit'
                    : 'Encaisser & Imprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ONGLET 2 : HISTORIQUE DES VENTES */}
      {activeTab === 'history' && (
        <div className="page-grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Journal certifié des ventes ({salesQuery.data?.length ?? 0} opérations enregistrées)
            </span>
            <a
              href={`/api/export/excel/ventes?agenceId=${agenceId}`}
              className="secondary-action"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '6px 14px', textDecoration: 'none' }}
            >
              <FileXls size={17} /> Exporter Journal des Ventes Excel (.xlsx)
            </a>
          </div>
          <DataTable
            columns={['Réf Vente', 'Date', 'Client', 'Total', 'Devise', 'Règlement', 'Statut Crédit', 'Annulation / Contrôle', 'Actions']}
            loading={salesQuery.isLoading}
            rows={(salesQuery.data ?? []).map((v: any) => [
              v.referenceVente ?? `VTE-${v.id}`,
              v.dateVente ? new Date(v.dateVente).toLocaleString('fr-FR') : '-',
              v.client?.nom ?? 'Client Comptant',
              `$${v.montantTotal?.toFixed(2)}`,
              v.devise ?? 'USD',
              v.estCredit ? 'CRÉDIT' : 'CASH',
              v.statutCredit ?? 'AUCUN',
              v.statutAnnulation === 'ANNULEE' ? (
                <span className="badge badge-danger">Vente Annulée</span>
              ) : v.statutAnnulation === 'EN_ATTENTE' ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="badge badge-warning">Annulation demandée</span>
                  <button
                    className="primary-action"
                    style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                    onClick={() => validerAnnulationMutation.mutate(v.id)}
                  >
                    Valider
                  </button>
                </div>
              ) : (
                <button
                  className="secondary-action"
                  style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--danger)' }}
                  onClick={() => demandeAnnulationMutation.mutate(v.id)}
                >
                  Demander annulation
                </button>
              ),
              v.id ? (
                <button
                  key={v.id}
                  className="secondary-action"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  onClick={() => setActiveReceipt(v)}
                >
                  <Printer size={15} /> Voir Ticket
                </button>
              ) : (
                '-'
              ),
            ])}
            emptyText="Aucune vente enregistrée pour le moment."
          />
        </div>
      )}

      {/* ONGLET 3 : VALIDATION DES CRÉDITS */}
      {activeTab === 'credits' && (
        <div className="page-grid">
          <Notice
            type="info"
            text="Espace réservé au Chef d'Agence : examinez la solvabilité et la dette actuelle des clients avant d'approuver ou refuser une vente à crédit."
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Réf Vente</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Dette Actuelle</th>
                  <th>Montant Crédit</th>
                  <th>Actions Chef</th>
                </tr>
              </thead>
              <tbody>
                {(creditsQuery.data ?? []).map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.referenceVente ?? `VTE-${v.id}`}</strong>
                    </td>
                    <td>{v.dateVente ? new Date(v.dateVente).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>
                      <strong>{v.client?.nom ?? 'Client Inconnu'}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>{v.client?.telephone ?? 'Pas de contact'}</small>
                    </td>
                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                      ${(v.client?.soldeDette ?? 0).toFixed(2)} USD
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-strong)' }}>
                      ${v.montantTotal?.toFixed(2)} {v.devise}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="primary-action"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--success)' }}
                          disabled={validerCreditMutation.isPending}
                          onClick={() => v.id && validerCreditMutation.mutate(v.id)}
                        >
                          <CheckCircle size={15} /> Approuver
                        </button>
                        <button
                          className="secondary-action"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--danger)' }}
                          disabled={rejeterCreditMutation.isPending}
                          onClick={() => v.id && rejeterCreditMutation.mutate(v.id)}
                        >
                          <XCircle size={15} /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(creditsQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                      Aucune vente à crédit en attente de validation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ONGLET 4 : GESTION DES CLIENTS & DETTES */}
      {activeTab === 'clients' && (
        <div className="page-grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Suivi du portefeuille client, plafonds autorisés et encaissements de créances.</p>
            <button className="primary-action" onClick={() => setShowNewClientModal(true)}>
              <UserPlus size={18} /> Nouveau Client
            </button>
          </div>

          <DataTable
            columns={['Nom du Client', 'Téléphone', 'Adresse', 'Encours Dette', 'Limite Crédit', 'Actions']}
            loading={clientsQuery.isLoading}
            rows={(clientsQuery.data ?? []).map((c: any) => [
              c.nom,
              c.telephone ?? '-',
              c.adresse ?? '-',
              (c.soldeDette ?? 0) > 0 ? (
                <span key={c.id} style={{ color: 'var(--danger)', fontWeight: 800 }}>
                  ${c.soldeDette?.toFixed(2)} USD
                </span>
              ) : (
                <span key={c.id} style={{ color: 'var(--success)' }}>
                  $0.00
                </span>
              ),
              `$${(c.limiteCredit ?? 1000).toFixed(2)} USD`,
              (c.soldeDette ?? 0) > 0 ? (
                <button
                  key={c.id}
                  className="primary-action"
                  style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setRepaymentClient(c)
                    setRepaymentMontant(String(c.soldeDette))
                  }}
                >
                  <Wallet size={15} /> Encaisser dette
                </button>
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>À jour</span>
              ),
            ])}
            emptyText="Aucun client enregistré."
          />
        </div>
      )}

      {/* ONGLET 5 : BONS DE LIVRAISON CLIENTS & LOGISTIQUE */}
      {activeTab === 'livraisons' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>Suivi des Livraisons & Bons de Livraison (BL)</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Affectation des camions de la minoterie, suivi en temps réel du trajet et décharges clients signées.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewBLModal(true)}>
              <Plus size={17} /> Nouveau Bon de Livraison (BL)
            </button>
          </div>

          <DataTable
            columns={['N° BL', 'Date', 'Client & Téléphone', 'Destination / Adresse', 'Camion & Chauffeur', 'Chargement (Sacs / Poids)', 'Statut Trajet', 'Actions']}
            loading={livraisonsQuery.isLoading}
            rows={(livraisonsQuery.data ?? []).map((bl) => [
              <strong key={'nbl-' + bl.id}>{bl.numeroBL}</strong>,
              new Date(bl.dateCreation).toLocaleDateString('fr-FR'),
              <div key={'cl-' + bl.id}>
                <strong>{bl.clientNom}</strong>
                {bl.clientTelephone && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{bl.clientTelephone}</div>}
              </div>,
              bl.adresseLivraison,
              <div key={'vh-' + bl.id}>
                <strong>{bl.vehicule?.plaqueImmatriculation ?? 'Camion non assigné'}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Chauffeur : {bl.chauffeurNom ?? bl.vehicule?.chauffeurNom ?? 'À assigner'}</div>
              </div>,
              <div key={'ch-' + bl.id}>
                <strong>{bl.quantiteSacs} sacs</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{bl.poidsTotalKg.toLocaleString('fr-FR')} kg ({((bl.poidsTotalKg)/1000).toFixed(2)} T)</div>
              </div>,
              <span
                key={'st-' + bl.id}
                className={clsx(
                  'badge',
                  bl.statut === 'LIVRE' && 'badge-success',
                  bl.statut === 'EN_TRANSIT' && 'badge-warning',
                  bl.statut === 'PREPARATION' && 'badge-neutral',
                  bl.statut === 'ANNULE' && 'badge-danger'
                )}
              >
                {bl.statut === 'LIVRE' ? 'Livré (Déchargé)' : bl.statut === 'EN_TRANSIT' ? 'En transit (Sur route)' : 'En préparation'}
              </span>,
              <div key={'act-' + bl.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {bl.statut === 'PREPARATION' && (
                  <button
                    className="primary-action"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => updateBLStatutMutation.mutate({ id: bl.id, statut: 'EN_TRANSIT' })}
                    title="Départ du camion minoterie"
                  >
                    Départ camion
                  </button>
                )}
                {bl.statut === 'EN_TRANSIT' && (
                  <button
                    className="primary-action"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', background: '#16a34a' }}
                    onClick={() => {
                      const nom = prompt('Nom de la personne ayant réceptionné et signé la décharge :') || 'Client / Dépôt'
                      updateBLStatutMutation.mutate({ id: bl.id, statut: 'LIVRE', recepteurNom: nom })
                    }}
                    title="Confirmer la livraison et la décharge"
                  >
                    Valider Décharge
                  </button>
                )}
                {bl.venteId && (
                  <a
                    className="secondary-action"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    href={downloadUrl(`/api/ventes/${bl.venteId}/bon-livraison${bl.vehiculeId ? `?vehiculeId=${bl.vehiculeId}` : ''}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FilePdf size={14} /> Imprimer BL
                  </a>
                )}
              </div>,
            ])}
            emptyText="Aucun bon de livraison enregistré pour cette agence."
          />
        </div>
      )}

      {/* MODAL : NOUVEAU BON DE LIVRAISON */}
      {showNewBLModal && (
        <div className="modal-overlay" onClick={() => setShowNewBLModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Générer un Bon de Livraison (BL)</h3>
              <button className="icon-button" onClick={() => setShowNewBLModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Émission du bordereau de livraison officiel conforme aux mentions légales de l'entreprise.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createBLMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Vente liée (Optionnelle)
                <select
                  value={blVenteId}
                  onChange={(e) => {
                    const vId = e.target.value ? Number(e.target.value) : ''
                    setBlVenteId(vId)
                    const v = (salesQuery.data ?? []).find((s) => s.id === vId)
                    if (v) {
                      setBlClientNom(v.client?.nom ?? 'Client')
                      setBlClientTel(v.client?.telephone ?? '')
                      setBlAdresse(v.client?.adresse ?? 'Dépôt client')
                      const totalSacs = (v.details || []).reduce((sum, d) => sum + (d.quantite || 0), 0)
                      if (totalSacs > 0) {
                        setBlSacs(totalSacs.toString())
                        setBlPoidsKg((totalSacs * 25).toString())
                      }
                    }
                  }}
                >
                  <option value="">Livraison hors-vente directe (ou choisir une vente récente...)</option>
                  {(salesQuery.data ?? []).slice(0, 10).map((v) => (
                    <option key={'v-' + v.id} value={v.id}>
                      {v.referenceVente} - {v.client?.nom} ({money(v.montantTotal, 'USD')})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Nom du Client Destinataire
                  <input
                    required
                    value={blClientNom}
                    onChange={(e) => setBlClientNom(e.target.value)}
                    placeholder="ex: Boulangerie Moderne"
                  />
                </label>
                <label>
                  Téléphone Contact
                  <input
                    value={blClientTel}
                    onChange={(e) => setBlClientTel(e.target.value)}
                    placeholder="ex: +243 997 000 111"
                  />
                </label>
              </div>

              <label>
                Adresse complète de Livraison
                <input
                  required
                  value={blAdresse}
                  onChange={(e) => setBlAdresse(e.target.value)}
                  placeholder="ex: Quartier Katindo, Avenue Principale N° 12, Goma"
                />
              </label>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Mode d'Acheminement / Transport</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    className={clsx('tab-btn', blModeTransport === 'ENLEVEMENT_MAGASIN' && 'active')}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center' }}
                    onClick={() => setBlModeTransport('ENLEVEMENT_MAGASIN')}
                  >
                    🏪 Retrait Comptoir
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', blModeTransport === 'VEHICULE_CLIENT' && 'active')}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center' }}
                    onClick={() => setBlModeTransport('VEHICULE_CLIENT')}
                  >
                    🚗 Véhicule Client
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', blModeTransport === 'FLOTTE_ENTREPRISE' && 'active')}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center' }}
                    onClick={() => setBlModeTransport('FLOTTE_ENTREPRISE')}
                  >
                    🚚 Flotte Société
                  </button>
                </div>
              </div>

              {blModeTransport === 'ENLEVEMENT_MAGASIN' && (
                <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
                  ✓ Le client retire directement ses sacs au magasin/dépôt. Aucun véhicule de transport n'est mobilisé.
                </div>
              )}

              {blModeTransport === 'VEHICULE_CLIENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
                  <label>
                    Véhicule du Client (Plaque / Modèle)
                    <input
                      placeholder="ex: Canter 4812AB/19 ou Pick-up"
                      value={blClientVehicule}
                      onChange={(e) => setBlClientVehicule(e.target.value)}
                    />
                  </label>
                  <label>
                    Chauffeur / Convoyeur du Client
                    <input
                      placeholder="ex: M. Justin (Porteur client)"
                      value={blClientChauffeur}
                      onChange={(e) => setBlClientChauffeur(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {blModeTransport === 'FLOTTE_ENTREPRISE' && (
                <label>
                  Camion & Chauffeur Affecté (Flotte MVG)
                  <select
                    value={blVehiculeId}
                    onChange={(e) => setBlVehiculeId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Sélectionner un véhicule de la flotte minoterie...</option>
                    {(flotteQuery.data ?? []).map((v: any) => (
                      <option key={'cam-' + v.id} value={v.id}>
                        {v.plaqueImmatriculation} - {v.marqueModele} (Chauffeur: {v.chauffeurNom}) - {v.statut}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Quantité de Sacs
                  <input
                    required
                    type="number"
                    min="1"
                    value={blSacs}
                    onChange={(e) => {
                      setBlSacs(e.target.value)
                      setBlPoidsKg((Number(e.target.value) * 25).toString())
                    }}
                  />
                </label>
                <label>
                  Poids Total Estimé (kg)
                  <input
                    required
                    type="number"
                    min="1"
                    value={blPoidsKg}
                    onChange={(e) => setBlPoidsKg(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Instructions / Observations
                <input
                  value={blObservations}
                  onChange={(e) => setBlObservations(e.target.value)}
                  placeholder="ex: Livraison matinale prioritaire avant 10h"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewBLModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createBLMutation.isPending}>
                  {createBLMutation.isPending ? 'Génération...' : 'Émettre le Bon de Livraison'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : ENCAISSEMENT / REMBOURSEMENT DE DETTE */}
      {repaymentClient && (
        <div className="modal-overlay" onClick={() => setRepaymentClient(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Règlement de dette client</h3>
              <button className="icon-button" onClick={() => setRepaymentClient(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '8px 0 16px', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Client : <strong>{repaymentClient.nom}</strong> | Dette restante : <strong>${repaymentClient.soldeDette?.toFixed(2)} USD</strong>
            </p>
            {repaymentError && (
              <div className="notice warning" style={{ marginBottom: 12 }}>{repaymentError}</div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                reimburseMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Montant versé
                <input
                  type="number"
                  step="0.01"
                  required
                  value={repaymentMontant}
                  onChange={(e) => setRepaymentMontant(e.target.value)}
                />
              </label>
              <label>
                Devise de versement
                <select value={repaymentDevise} onChange={(e) => setRepaymentDevise(e.target.value as 'USD' | 'CDF')}>
                  <option value="USD">USD (Dollar américain)</option>
                  <option value="CDF">CDF (Franc congolais au taux du jour)</option>
                </select>
              </label>
              <label>
                Caisse d encaissement
                <select value={repaymentCaisseId} onChange={(e) => setRepaymentCaisseId(Number(e.target.value))}>
                  <option value="1">Caisse Principale USD/CDF</option>
                  <option value="2">Caisse Ventes Comptoir</option>
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setRepaymentClient(null)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={reimburseMutation.isPending}>
                  {reimburseMutation.isPending ? 'Enregistrement...' : 'Valider encaissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVEAU CLIENT */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Nouveau Client</h3>
              <button className="icon-button" onClick={() => setShowNewClientModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createClientMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Nom complet / Entreprise
                <input
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="ex: Ets Kivu Commerce"
                />
              </label>
              <label>
                Numéro de téléphone
                <input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="ex: +243 999 123 456"
                />
              </label>
              <label>
                Adresse / Ville
                <input
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="ex: Av. du Commerce, Goma"
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setShowNewClientModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createClientMutation.isPending}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : TICKET DE CAISSE THERMIQUE IMPRIMABLE */}
      {activeReceipt && (
        <div className="modal-overlay" onClick={() => setActiveReceipt(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '20px 10px' }}>
          <div
            className="receipt-preview-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#0284c7 #f1f5f9',
              width: 'min(100%, 480px)',
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* EN-TETE DE VISUALISATION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0369a1', fontWeight: 700, fontSize: '0.95rem' }}>
                <Receipt size={20} />
                <span>Reçu d'Encaissement & Expédition</span>
              </div>
              <button className="icon-button" onClick={() => setActiveReceipt(null)} title="Fermer (Échap)">
                <X size={18} />
              </button>
            </div>

            <div className="thermal-ticket">
              <div className="ticket-header">
                <h3>MATABISHI MVG SARL</h3>
                <p style={{ margin: 0, fontSize: 11 }}>SYSTEME DE GESTION COMMERCIALE</p>
                <p style={{ margin: 0, fontSize: 11 }}>Agence : {activeReceipt.agence?.nom ?? 'Goma'}</p>
                <div className="ticket-line" />
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {activeReceipt.estCredit ? 'FACTURE DE VENTE' : 'REÇU DE CAISSE'}
                </p>
                <p style={{ margin: 0 }}>Réf : {activeReceipt.referenceVente ?? `VTE-${activeReceipt.id}`}</p>
                <p style={{ margin: 0 }}>
                  Date :{' '}
                  {activeReceipt.dateVente ? new Date(activeReceipt.dateVente).toLocaleString('fr-FR') : '-'}
                </p>
                <p style={{ margin: 0 }}>Client : {activeReceipt.client?.nom ?? 'Client Comptant'}</p>
              </div>

              <div className="ticket-line" />

              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Article</th>
                    <th style={{ textAlign: 'center' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>P.U</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeReceipt.details ?? []).map((d, index) => (
                    <tr key={index}>
                      <td>{d.article?.designation ?? 'Article'}</td>
                      <td style={{ textAlign: 'center' }}>{d.quantite}</td>
                      <td style={{ textAlign: 'right' }}>${d.prixUnitaireApplique?.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        ${((d.prixUnitaireApplique ?? 0) * d.quantite).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ticket-line" />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}>
                <span>TOTAL :</span>
                <span>
                  ${activeReceipt.montantTotal?.toFixed(2)} {activeReceipt.devise ?? 'USD'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#444' }}>
                <span>Équivalent CDF :</span>
                <span>{(Math.round((activeReceipt.montantTotal ?? 0) * tauxActif)).toLocaleString()} CDF</span>
              </div>

              <div className="ticket-line" />

              <div style={{ textAlign: 'center', fontSize: 11 }}>
                <span>
                  Règlement :{' '}
                  {activeReceipt.estCredit
                    ? `CRÉDIT (${activeReceipt.statutCredit ?? 'EN_ATTENTE'})`
                    : 'PAIEMENT COMPTANT (CASH)'}
                </span>
              </div>

              <div className="ticket-line" />
              <div style={{ fontSize: 11, textAlign: 'left', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <strong>Transport & Enlèvement :</strong><br/>
                {modeTransport === 'ENLEVEMENT_MAGASIN' && '🏪 Retrait direct au comptoir / dépôt par le client'}
                {modeTransport === 'VEHICULE_CLIENT' && `🚗 Véhicule client : ${clientVehicule || 'Véhicule client'} ${clientChauffeur ? `(Chauffeur: ${clientChauffeur})` : ''}`}
                {modeTransport === 'FLOTTE_ENTREPRISE' && `🚚 Camion société : ${flotteQuery.data?.find((v: any) => v.id === selectedVehiculeId)?.marqueModele || 'Flotte Minoterie MVG'}`}
              </div>

              <div className="ticket-footer">
                <p style={{ margin: 0 }}>Les marchandises vendues ne sont ni reprises ni échangées.</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>MERCI POUR VOTRE VISITE !</p>
              </div>
            </div>

            {/* CHOIX MODE DE LIVRAISON / TRANSPORT */}
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, fontSize: '0.85rem' }}>
                <Truck size={17} style={{ color: 'var(--primary)' }} />
                <span>Mode de transport pour le Bon de Livraison (BL) :</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                <button
                  type="button"
                  className={clsx('tab-btn', modeTransport === 'ENLEVEMENT_MAGASIN' && 'active')}
                  style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setModeTransport('ENLEVEMENT_MAGASIN')}
                >
                  🏪 Retrait Comptoir
                </button>
                <button
                  type="button"
                  className={clsx('tab-btn', modeTransport === 'VEHICULE_CLIENT' && 'active')}
                  style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setModeTransport('VEHICULE_CLIENT')}
                >
                  🚗 Véhicule Client
                </button>
                <button
                  type="button"
                  className={clsx('tab-btn', modeTransport === 'FLOTTE_ENTREPRISE' && 'active')}
                  style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setModeTransport('FLOTTE_ENTREPRISE')}
                >
                  🚚 Camion Société
                </button>
              </div>

              {modeTransport === 'ENLEVEMENT_MAGASIN' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  ✓ Le client retire directement ses sacs au magasin / dépôt. Aucun camion de l'entreprise n'est immobilisé.
                </div>
              )}

              {modeTransport === 'VEHICULE_CLIENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ fontSize: '0.8rem' }}>
                    Véhicule du client
                    <input
                      placeholder="ex: Dyna 8492AB/19 ou Moto"
                      value={clientVehicule}
                      onChange={(e) => setClientVehicule(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.8rem' }}>
                    Chauffeur du client
                    <input
                      placeholder="ex: M. Justin"
                      value={clientChauffeur}
                      onChange={(e) => setClientChauffeur(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    />
                  </label>
                </div>
              )}

              {modeTransport === 'FLOTTE_ENTREPRISE' && (
                <label style={{ fontSize: '0.8rem' }}>
                  Camion de l'entreprise
                  <select
                    value={selectedVehiculeId}
                    onChange={(e) => setSelectedVehiculeId(e.target.value ? Number(e.target.value) : '')}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                  >
                    <option value="">Sélectionner un véhicule de la flotte minoterie...</option>
                    {(flotteQuery.data ?? []).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.plaqueImmatriculation} - {v.marqueModele} ({v.chauffeurNom})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* BOUTONS D'ACTION */}
            <div className="receipt-modal-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {activeReceipt.id && !String(activeReceipt.id).startsWith('OFF-') && (
                <>
                  <a
                    className="secondary-action"
                    href={downloadUrl(`/api/ventes/${activeReceipt.id}/recu-pdf`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FilePdf size={17} /> Facture A4
                  </a>
                  <a
                    className="secondary-action"
                    href={downloadUrl(
                      `/api/ventes/${activeReceipt.id}/bon-livraison?modeTransport=${modeTransport}&clientVehicule=${encodeURIComponent(clientVehicule)}&clientChauffeur=${encodeURIComponent(clientChauffeur)}&vehiculeId=${selectedVehiculeId || ''}`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <Truck size={17} /> Bon de Livraison (BL)
                  </a>
                </>
              )}
              <button className="primary-action" onClick={() => window.print()}>
                <Printer size={17} /> Imprimer Ticket 80mm
              </button>
              <button className="secondary-action" onClick={() => setActiveReceipt(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function StockPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const [activeTab, setActiveTab] = useState<'inventory' | 'corrections' | 'catalogue'>('inventory')
  const [showModal, setShowModal] = useState(false)
  const [showNewArticleModal, setShowNewArticleModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedStockId, setSelectedStockId] = useState<number | ''>('')
  const [quantiteNouvelle, setQuantiteNouvelle] = useState('')
  const [motif, setMotif] = useState('')

  // Formulaire nouvel article
  const [newArtCode, setNewArtCode] = useState('')
  const [newArtDesignation, setNewArtDesignation] = useState('')
  const [newArtType, setNewArtType] = useState<'PRODUIT_FINI' | 'MATIERE_PREMIERE'>('PRODUIT_FINI')
  const [newArtUnite, setNewArtUnite] = useState('Sac 25kg')
  const [newArtPrix, setNewArtPrix] = useState('20.0')
  const [newArtAlerte, setNewArtAlerte] = useState(true)

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock', agenceId],
    queryFn: () => apiRequest<StockAgence[]>(`/api/stocks/agence/${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const { data: correctionsData, isLoading: correctionsLoading } = useQuery({
    queryKey: ['stock-corrections', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/stocks/corrections?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => apiRequest<any[]>('/api/articles', { token }),
    enabled: Boolean(token),
  })

  const createArticleMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/articles', {
        method: 'POST',
        token,
        body: JSON.stringify({
          codeUnique: newArtCode,
          designation: newArtDesignation,
          type: newArtType,
          uniteMesure: newArtUnite,
          prixVenteStandard: Number(newArtPrix) || 0,
          alerteExpiration: newArtAlerte,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      setShowNewArticleModal(false)
      setNewArtCode('')
      setNewArtDesignation('')
      setNewArtPrix('20.0')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la création de l article'),
  })

  const createCorrectionMutation = useMutation({
    mutationFn: () => {
      const selected = stockData?.find((s) => s.id === Number(selectedStockId))
      if (!selected) throw new Error('Veuillez sélectionner un article en stock')
      return apiRequest('/api/stocks/corrections', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          articleId: selected.article?.id,
          numeroLot: selected.numeroLot || 'SANS_LOT',
          quantiteNouvelle: Number(quantiteNouvelle),
          motif,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-corrections'] })
      setShowModal(false)
      setSelectedStockId('')
      setQuantiteNouvelle('')
      setMotif('')
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la soumission de la demande'),
  })

  const validerCorrectionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/stocks/corrections/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-corrections'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Impossible de valider cette correction'),
  })

  const rejeterCorrectionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/stocks/corrections/${id}/rejeter`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-corrections'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors du rejet'),
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader title="Gestion des stocks et lots" text="Suivi en temps réel des stocks, numéros de lots, DLUO et circuit de correction validé." icon={Package} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="secondary-action"
            href={downloadUrl(`/api/stocks/export/inventaire?agenceId=${agenceId}`)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <FilePdf size={18} /> État des Stocks PMP
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/stocks?agenceId=${agenceId}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <FileXls size={18} /> Exporter Stocks Excel (.xlsx)
          </a>
          <button className="secondary-action" onClick={() => setShowNewArticleModal(true)}>
            <Plus size={18} /> Nouvel Article / Matière
          </button>
          <button className="primary-action" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Demander un ajustement
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
        <button className={clsx('tab-button', activeTab === 'inventory' && 'active')} onClick={() => setActiveTab('inventory')}>
          <Package size={17} /> Inventaire et lots ({stockData?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'catalogue' && 'active')} onClick={() => setActiveTab('catalogue')}>
          <Tag size={17} /> Catalogue Général ({articlesData?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'corrections' && 'active')} onClick={() => setActiveTab('corrections')}>
          <ArrowsClockwise size={17} /> Demandes d ajustement ({correctionsData?.filter((c) => c.statut === 'EN_ATTENTE').length ?? 0} en attente)
        </button>
      </div>

      {activeTab === 'catalogue' && (
        <DataTable
          columns={['Code', 'Désignation Produit / Matière', 'Type', 'Conditionnement', 'Prix Vente Standard', 'DLUO']}
          loading={articlesLoading}
          rows={(articlesData ?? []).map((art: any) => [
            <strong key={'c-code-' + art.id}>{art.codeUnique}</strong>,
            art.designation,
            <span
              key={'c-type-' + art.id}
              className={clsx('badge', art.type === 'PRODUIT_FINI' ? 'badge-success' : 'badge-warning')}
            >
              {art.type === 'PRODUIT_FINI' ? 'Produit Fini (Vente)' : 'Matière Première (Usine)'}
            </span>,
            art.uniteMesure,
            art.type === 'PRODUIT_FINI' ? `$${Number(art.prixVenteStandard || 0).toFixed(2)} USD` : 'Coût PMP d achat',
            art.alerteExpiration ? (
              <span key={'c-dl-' + art.id} className="badge badge-info">Péremption surveillée</span>
            ) : (
              <span key={'c-dl-' + art.id} style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Non périssable</span>
            ),
          ])}
          emptyText="Aucun article enregistré."
        />
      )}

      {activeTab === 'inventory' && (
        <DataTable
          columns={['Article', 'Numéro de lot', 'Quantité', 'Date expiration', 'Seuil alerte', 'État stock']}
          loading={stockLoading}
          rows={(stockData ?? []).map((stock) => {
            const isLow = (stock.quantite ?? 0) <= (stock.seuilAlerte ?? 20)
            return [
              stock.article?.designation ?? 'Article',
              stock.numeroLot ?? '-',
              <strong>{stock.quantite ?? 0} {stock.article?.uniteMesure ?? 'unités'}</strong>,
              stock.dateExpiration ?? '-',
              stock.seuilAlerte ?? '-',
              <span className={clsx('badge', isLow ? 'badge-danger' : 'badge-success')}>
                {isLow ? 'Seuil critique' : 'Disponible'}
              </span>,
            ]
          })}
          emptyText="Aucun stock enregistré pour cette agence."
        />
      )}

      {activeTab === 'corrections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
            <strong>Circuit de contrôle :</strong> Les ajustements demandés par le magasinier doivent être approuvés par le Chef d agence. En vertu de la règle des deux personnes, le demandeur ne peut pas valider sa propre demande.
          </div>
          <DataTable
            columns={['Date', 'Article', 'Lot', 'Actuel', 'Ajustement', 'Motif', 'Demandeur', 'Statut', 'Actions']}
            loading={correctionsLoading}
            rows={(correctionsData ?? []).map((cor: any) => [
              cor.dateDemande ? new Date(cor.dateDemande).toLocaleDateString() : '-',
              cor.article?.designation ?? 'Article',
              cor.numeroLot ?? '-',
              cor.quantiteActuelle,
              <strong>{cor.quantiteNouvelle}</strong>,
              cor.motif ?? '-',
              cor.demandeur ?? 'Magasinier',
              <span className={clsx('badge', cor.statut === 'VALIDE' ? 'badge-success' : cor.statut === 'REJETE' ? 'badge-danger' : 'badge-warning')}>
                {cor.statut === 'VALIDE' ? 'Validé' : cor.statut === 'REJETE' ? 'Rejeté' : 'En attente'}
              </span>,
              cor.statut === 'EN_ATTENTE' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="primary-action" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => validerCorrectionMutation.mutate(cor.id)}>
                    Valider
                  </button>
                  <button className="secondary-action" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => rejeterCorrectionMutation.mutate(cor.id)}>
                    Rejeter
                  </button>
                </div>
              ) : (
                <span>Traité</span>
              ),
            ])}
            emptyText="Aucune demande d ajustement enregistrée."
          />
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Demander une correction d inventaire</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Soumettez un ajustement justifié de stock pour examen par le chef d agence.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createCorrectionMutation.mutate(); }}>
              <label>
                Article et lot
                <select value={selectedStockId} onChange={(e) => setSelectedStockId(Number(e.target.value))} required>
                  <option value="">Sélectionner une ligne d inventaire</option>
                  {(stockData ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.article?.designation} - Lot {s.numeroLot} (Actuel: {s.quantite})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ marginTop: 12 }}>
                Nouvelle quantité constatée
                <input type="number" min="0" value={quantiteNouvelle} onChange={(e) => setQuantiteNouvelle(e.target.value)} required />
              </label>
              <label style={{ marginTop: 12 }}>
                Motif de la régularisation
                <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex: Écart inventaire physique, avarie constatée..." required />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createCorrectionMutation.isPending}>
                  {createCorrectionMutation.isPending ? 'Enregistrement...' : 'Soumettre au chef'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEL ARTICLE / MATIERE */}
      {showNewArticleModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ajouter un article ou une matière première</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Créez n importe quel produit fini (farine de manioc, pain, provende, huile...) ou matière première agricole / emballage.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createArticleMutation.mutate(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <label>
                  Code Unique (Réf)
                  <input
                    value={newArtCode}
                    onChange={(e) => setNewArtCode(e.target.value)}
                    placeholder="ex: MAN-001, SOJ-RAW"
                    required
                  />
                </label>
                <label>
                  Désignation du produit ou matière
                  <input
                    value={newArtDesignation}
                    onChange={(e) => setNewArtDesignation(e.target.value)}
                    placeholder="ex: Farine de Manioc Panifiable Extra 25kg"
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Classification / Rôle
                  <select
                    value={newArtType}
                    onChange={(e) => setNewArtType(e.target.value as 'PRODUIT_FINI' | 'MATIERE_PREMIERE')}
                  >
                    <option value="PRODUIT_FINI">Produit Fini (Destiné à la vente / POS)</option>
                    <option value="MATIERE_PREMIERE">Matière Première (Pour mouture / transformation usine)</option>
                  </select>
                </label>
                <label>
                  Unité de mesure & conditionnement
                  <input
                    value={newArtUnite}
                    onChange={(e) => setNewArtUnite(e.target.value)}
                    placeholder="ex: Sac 25kg, Sac 50kg, Tonne, Litre, Carton..."
                    required
                  />
                </label>
              </div>

              {newArtType === 'PRODUIT_FINI' && (
                <label style={{ marginTop: 12 }}>
                  Prix de vente standard ($ USD)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newArtPrix}
                    onChange={(e) => setNewArtPrix(e.target.value)}
                    required
                  />
                </label>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 14 }}>
                <input
                  type="checkbox"
                  checked={newArtAlerte}
                  onChange={(e) => setNewArtAlerte(e.target.checked)}
                />
                <span>Activer la surveillance DLUO (Date limite de consommation / FEFO)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewArticleModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createArticleMutation.isPending}>
                  {createArticleMutation.isPending ? 'Création...' : 'Créer l article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function ProductionPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)
  const [activeTab, setActiveTab] = useState<'ordres' | 'recettes'>('ordres')
  const [showNewOrdreModal, setShowNewOrdreModal] = useState(false)
  const [showNewRecetteModal, setShowNewRecetteModal] = useState(false)
  const [newRecetteFiniId, setNewRecetteFiniId] = useState<number | ''>(7)
  const [newRecetteMatiereId, setNewRecetteMatiereId] = useState<number | ''>(9)
  const [newRecetteQte, setNewRecetteQte] = useState('0.032')

  const [clotureOrdre, setClotureOrdre] = useState<any | null>(null)
  const [quantiteReelle, setQuantiteReelle] = useState('')
  const [pertes, setPertes] = useState('')
  const [articleFiniId, setArticleFiniId] = useState<number | ''>(7)
  const [quantitePrevue, setQuantitePrevue] = useState('50')
  const [generatedLotInfo, setGeneratedLotInfo] = useState<{ ordre: any; numeroLot: string } | null>(null)
  const [bonProductionOrdre, setBonProductionOrdre] = useState<any | null>(null)

  const { data: ordres, isLoading: ordresLoading } = useQuery({
    queryKey: ['production-ordres'],
    queryFn: () => apiRequest<any[]>('/api/production/ordres', { token }),
    enabled: Boolean(token),
  })

  const { data: recettesList, isLoading: recettesLoading } = useQuery({
    queryKey: ['production-recettes'],
    queryFn: () => apiRequest<any[]>('/api/production/recettes', { token }),
    enabled: Boolean(token),
  })

  const { data: articlesList } = useQuery({
    queryKey: ['articles'],
    queryFn: () => apiRequest<any[]>('/api/articles', { token }),
    enabled: Boolean(token),
  })

  const createOrdreMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/production/ordres', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          articleFiniId: Number(articleFiniId),
          quantitePrevue: Number(quantitePrevue),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-ordres'] })
      setShowNewOrdreModal(false)
    },
  })

  const createRecetteMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/production/recettes', {
        method: 'POST',
        token,
        body: JSON.stringify({
          articleFiniId: Number(newRecetteFiniId),
          articleMatiereId: Number(newRecetteMatiereId),
          quantiteRequise: Number(newRecetteQte),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-recettes'] })
      setShowNewRecetteModal(false)
    },
  })

  const cloturerOrdreMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string; ordre: any; numeroLot: string }>(`/api/production/ordres/${clotureOrdre.id}/cloturer`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          quantiteReelle: Number(quantiteReelle),
          pertes: Number(pertes),
        }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production-ordres'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setGeneratedLotInfo(res)
      const finishedOrdreId = clotureOrdre?.id
      setClotureOrdre(null)
      setQuantiteReelle('')
      setPertes('')
      if (res && res.numeroLot) {
        setPrintProposal({
          title: 'Lot de Production Clôturé & Entré en Stock !',
          ref: res.numeroLot,
          subtitle: `L'ordre de fabrication a été clôturé avec succès et les sacs de farine ont été crédités en stock. Imprimez le bon officiel :`,
          primaryDocName: 'Bon de Production Officiel',
          primaryDocUrl: `/api/production/ordres/${finishedOrdreId}/document`,
        })
      }
    },
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader title="Production et traçabilité des lots" text="Gestion des ordres de fabrication, composition matières et étiquetage sécurisé." icon={Barcode} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-action" onClick={() => setShowNewRecetteModal(true)}>
            <Plus size={17} /> Nouvelle Recette
          </button>
          <button className="primary-action" onClick={() => setShowNewOrdreModal(true)}>
            <Plus size={18} /> Nouvel ordre de fabrication
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'ordres' && 'active')} onClick={() => setActiveTab('ordres')}>
          <Barcode size={17} /> Ordres de fabrication ({ordres?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'recettes' && 'active')} onClick={() => setActiveTab('recettes')}>
          <Books size={17} /> Fiches recettes techniques ({recettesList?.length ?? 0})
        </button>
      </div>

      {activeTab === 'ordres' && (
        <DataTable
          columns={['Réf. Ordre', 'Produit fabriqué', 'Quantité prévue', 'Quantité réelle', 'Statut', 'Lot généré', 'Date', 'Action']}
          loading={ordresLoading}
          rows={(ordres ?? []).map((op: any) => [
            <strong key={'ref-' + op.id}>{op.codeOrdre}</strong>,
            op.articleFini?.designation ?? 'Produit fini',
            `${op.quantitePrevue} ${op.articleFini?.uniteMesure ?? ''}`,
            op.quantiteReelle ? `${op.quantiteReelle} ${op.articleFini?.uniteMesure ?? ''}` : '-',
            <span key={'st-' + op.id} className={clsx('badge', op.statut === 'TERMINE' ? 'badge-success' : 'badge-warning')}>
              {op.statut === 'TERMINE' ? 'Terminé' : 'En cours'}
            </span>,
            op.lotCree ? <code key={'lt-' + op.id} style={{ fontSize: '0.85rem' }}>{op.lotCree}</code> : '-',
            op.dateCreation ? new Date(op.dateCreation).toLocaleDateString() : '-',
            op.statut === 'EN_COURS' ? (
              <button
                key={'btn-clot-' + op.id}
                className="primary-action"
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                onClick={() => {
                  setClotureOrdre(op)
                  setQuantiteReelle(String(op.quantitePrevue))
                  setPertes('0')
                }}
              >
                Clôturer
              </button>
            ) : (
              <div key={'actions-' + op.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  href={downloadUrl(`/api/production/ordres/${op.id}/fiche-a4`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FilePdf size={15} /> Fiche A4
                </a>
                <button
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={() => setGeneratedLotInfo({ ordre: op, numeroLot: op.lotCree || 'LOT-PROD' })}
                >
                  <QrCode size={15} /> Étiquette
                </button>
                <button
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={() => setBonProductionOrdre(op)}
                >
                  <Printer size={15} /> Aperçu
                </button>
              </div>
            ),
          ])}
          emptyText="Aucun ordre de fabrication en cours."
        />
      )}

      {activeTab === 'recettes' && (
        <div className="page-grid">
          <DataTable
            columns={['Produit fini', 'Matière première requise', 'Quantité nécessaire par unité']}
            loading={recettesLoading}
            rows={(recettesList ?? []).map((rec: any) => [
              <strong key={'rec-art-' + rec.id}>{rec.articleFini?.designation}</strong>,
              rec.articleMatiere?.designation,
              `${rec.quantiteRequise} ${rec.articleMatiere?.uniteMesure ?? ''} / ${rec.articleFini?.uniteMesure ?? ''}`,
            ])}
            emptyText="Aucune recette enregistrée."
          />
        </div>
      )}

      {showNewOrdreModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Lancer un ordre de fabrication</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              La planification réserve les matières premières requises selon la recette homologuée.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createOrdreMutation.mutate(); }}>
              <label>
                Produit fini à fabriquer
                <select value={articleFiniId} onChange={(e) => setArticleFiniId(Number(e.target.value))} required>
                  {(articlesList ?? [])
                    .filter((a: any) => a.type === 'PRODUIT_FINI')
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.designation} ({a.uniteMesure})
                      </option>
                    ))}
                </select>
              </label>
              <label style={{ marginTop: 12 }}>
                Quantité prévue (en unités / sacs)
                <input type="number" min="1" value={quantitePrevue} onChange={(e) => setQuantitePrevue(e.target.value)} required />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewOrdreModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createOrdreMutation.isPending}>
                  {createOrdreMutation.isPending ? 'Lancement...' : 'Créer l ordre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE RECETTE TECHNIQUE */}
      {showNewRecetteModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ajouter une recette / formule de fabrication</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Définit le ratio de matière première (maïs grain brut, blé brut) requis par unité de produit fini.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createRecetteMutation.mutate(); }}>
              <label>
                Produit fini
                <select value={newRecetteFiniId} onChange={(e) => setNewRecetteFiniId(Number(e.target.value))} required>
                  {(articlesList ?? [])
                    .filter((a: any) => a.type === 'PRODUIT_FINI')
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>{a.designation} ({a.uniteMesure})</option>
                    ))}
                </select>
              </label>
              <label style={{ marginTop: 12 }}>
                Matière première requise
                <select value={newRecetteMatiereId} onChange={(e) => setNewRecetteMatiereId(Number(e.target.value))} required>
                  {(articlesList ?? [])
                    .filter((a: any) => a.type === 'MATIERE_PREMIERE')
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>{a.designation} ({a.uniteMesure})</option>
                    ))}
                </select>
              </label>
              <label style={{ marginTop: 12 }}>
                Quantité matière nécessaire par sac / unité produit
                <input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  value={newRecetteQte}
                  onChange={(e) => setNewRecetteQte(e.target.value)}
                  placeholder="ex: 0.032 (32 kg par sac de 25kg)"
                  required
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewRecetteModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createRecetteMutation.isPending}>
                  {createRecetteMutation.isPending ? 'Enregistrement...' : 'Enregistrer la formule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clotureOrdre && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Clôturer l ordre {clotureOrdre.codeOrdre}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              En clôturant la fabrication, le système déduit les matières premières et génère automatiquement un numéro de lot prêt pour le POS.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); cloturerOrdreMutation.mutate(); }}>
              <label>
                Quantité réelle conforme obtenue
                <input type="number" min="0" value={quantiteReelle} onChange={(e) => setQuantiteReelle(e.target.value)} required />
              </label>
              <label style={{ marginTop: 12 }}>
                Pertes ou rebuts de production
                <input type="number" min="0" value={pertes} onChange={(e) => setPertes(e.target.value)} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setClotureOrdre(null)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={cloturerOrdreMutation.isPending}>
                  {cloturerOrdreMutation.isPending ? 'Validation...' : 'Valider clôture et créer le lot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedLotInfo && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <h3>Fiche traçabilité et étiquette lot</h3>
            <div style={{ margin: '16px 0', padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <QrCode size={36} />
                <div>
                  <strong>{generatedLotInfo.numeroLot}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Signature HMAC-SHA256 intégrée</div>
                </div>
              </div>
              <div style={{ fontSize: '0.88rem', display: 'grid', gap: 6 }}>
                <div><strong>Produit :</strong> {generatedLotInfo.ordre?.articleFini?.designation || 'Produit MVG'}</div>
                <div><strong>Quantité :</strong> {generatedLotInfo.ordre?.quantiteReelle || generatedLotInfo.ordre?.quantitePrevue} unités</div>
                <div><strong>Date fabrication :</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Date expiration :</strong> 2027-06-30</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="primary-action" onClick={() => setGeneratedLotInfo(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* BON DE FABRICATION / PRODUCTION IMPRIMABLE */}
      {bonProductionOrdre && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>BON DE FABRICATION & PRODUCTION</h3>
                <small style={{ color: 'var(--muted)' }}>MINOTERIE VOLCAN GRANDS-LACS - MVG SARL</small>
              </div>
              <Barcode size={32} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Code Ordre :</strong> {bonProductionOrdre.codeOrdre}</div>
              <div><strong>Date de création :</strong> {new Date(bonProductionOrdre.dateCreation).toLocaleDateString()}</div>
              <div><strong>Produit Fini :</strong> {bonProductionOrdre.articleFini?.designation || 'Farine / Produit Fini'}</div>
              <div><strong>Quantité Prévue :</strong> {bonProductionOrdre.quantitePrevue} unités</div>
              <div><strong>Quantité Réelle Produite :</strong> <strong>{bonProductionOrdre.quantiteReelle || bonProductionOrdre.quantitePrevue} unités</strong></div>
              <div><strong>Numéro de Lot Généré (FEFO) :</strong> <code>{bonProductionOrdre.lotCree || 'LOT-2609-01'}</code></div>
              <div style={{ margin: '8px 0', padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
                <strong>Consommation Matières Premières (BOM) :</strong>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  - Ingrédients déduits selon la formule homologuée en vigueur
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: 2 }}>
                  - Statut traçabilité : Contrôle conformité laboratoire validé
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--muted)', marginTop: 8 }}>
                <span>Visa Responsable Minoterie</span>
                <span>Visa Contrôle Qualité</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="primary-action" onClick={() => setBonProductionOrdre(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function TreasuryPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const can = useAppStore((state) => state.can)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'caisses' | 'etats-besoin' | 'demandes' | 'historique' | 'rapprochement'>('etats-besoin')
  const [showNewDemandeModal, setShowNewDemandeModal] = useState(false)
  const [showNewCaisseModal, setShowNewCaisseModal] = useState(false)
  const [showVirementModal, setShowVirementModal] = useState(false)
  const [showNewRapprochementModal, setShowNewRapprochementModal] = useState(false)
  const [selectedRapprochement, setSelectedRapprochement] = useState<RapprochementBancaire | null>(null)
  const [activeVoucher, setActiveVoucher] = useState<Transaction | null>(null)
  const [rejectionModalTx, setRejectionModalTx] = useState<Transaction | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  // Formulaires & Modales États de Besoin
  const [showNewEBModal, setShowNewEBModal] = useState(false)
  const [showDecaissementModal, setShowDecaissementModal] = useState(false)
  const [selectedEBForDecaissement, setSelectedEBForDecaissement] = useState<EtatBesoin | null>(null)
  const [decaissementCaisseId, setDecaissementCaisseId] = useState<number | ''>('')
  const [ebService, setEbService] = useState('Production & Meunerie')
  const [ebMotif, setEbMotif] = useState('')
  const [ebMontant, setEbMontant] = useState('')
  const [ebDevise, setEbDevise] = useState<'USD' | 'CDF'>('USD')
  const [ebCompte, setEbCompte] = useState('605')
  const [ebObservations, setEbObservations] = useState('')
  const [ebFilter, setEbFilter] = useState<'TOUS' | 'SOUMIS' | 'APPROUVE_CHEF' | 'DECAISSE' | 'REJETE'>('TOUS')

  // Requête États de Besoin
  const etatsBesoinQuery = useQuery({
    queryKey: ['etats-besoin', agenceId],
    queryFn: () => apiRequest<EtatBesoin[]>(`/api/etats-besoin?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  // Mutations États de Besoin
  const createEBMutation = useMutation({
    mutationFn: () =>
      apiRequest<EtatBesoin>('/api/etats-besoin', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          serviceDemandeur: ebService,
          motif: ebMotif,
          montant: Number(ebMontant),
          devise: ebDevise,
          compteImputation: ebCompte,
          observations: ebObservations,
        }),
      }),
    onSuccess: (newEB) => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      setShowNewEBModal(false)
      setEbMotif('')
      setEbMontant('')
      setEbObservations('')
      setActionError(null)
      setPrintProposal({
        title: 'État de Besoin Initié avec Succès !',
        ref: newEB.numeroEB,
        subtitle: `La demande de fonds (${newEB.montant} ${newEB.devise}) pour "${newEB.serviceDemandeur}" a été transmise au visa du Chef d'Agence.`,
        primaryDocName: "Aperçu de l'État de Besoin",
        primaryDocUrl: `/api/etats-besoin/${newEB.id}/bon-decaissement`,
      })
    },
    onError: (err: any) => setActionError(err.message || "Erreur lors de l'initiation de l'état de besoin"),
  })

  const validerChefEBMutation = useMutation({
    mutationFn: (ebId: number) =>
      apiRequest<{ message: string; etatBesoin: EtatBesoin }>(`/api/etats-besoin/${ebId}/valider-chef`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la validation hiérarchique'),
  })

  const decaissementEBMutation = useMutation({
    mutationFn: ({ ebId, caisseId }: { ebId: number; caisseId: number }) =>
      apiRequest<{ message: string; etatBesoin: EtatBesoin; numeroPieceCaisse: string }>(`/api/etats-besoin/${ebId}/decaissement`, {
        method: 'POST',
        token,
        body: JSON.stringify({ caisseId }),
      }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setShowDecaissementModal(false)
      setSelectedEBForDecaissement(null)
      setActionError(null)
      setPrintProposal({
        title: 'Fonds Décaissés au Guichet Caisse !',
        ref: res.numeroPieceCaisse,
        subtitle: `L'état de besoin a été payé et déduit du solde physique. Imprimez le bon officiel de décaissement et décharge de caisse :`,
        primaryDocName: 'Bon de Décaissement & Décharge',
        primaryDocUrl: `/api/etats-besoin/${res.etatBesoin?.id || vars.ebId}/bon-decaissement`,
      })
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors du décaissement en caisse'),
  })

  const rejeterEBMutation = useMutation({
    mutationFn: ({ ebId, motifRejet }: { ebId: number; motifRejet: string }) =>
      apiRequest(`/api/etats-besoin/${ebId}/rejeter`, {
        method: 'POST',
        token,
        body: JSON.stringify({ motifRejet }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      setActionError(null)
    },
  })

  // Formulaire Rapprochement bancaire
  const [rapCompteCaisseId, setRapCompteCaisseId] = useState<number | ''>('')
  const [rapDateDebut, setRapDateDebut] = useState('2026-09-01')
  const [rapDateFin, setRapDateFin] = useState('2026-09-30')
  const [rapSoldeDebut, setRapSoldeDebut] = useState('')
  const [rapSoldeFin, setRapSoldeFin] = useState('')
  const [rapDevise, setRapDevise] = useState<'USD' | 'CDF'>('USD')

  // Formulaire virement interne Caisse <-> Banque
  const [virementSourceId, setVirementSourceId] = useState<number | ''>('')
  const [virementDestId, setVirementDestId] = useState<number | ''>('')
  const [virementMontant, setVirementMontant] = useState('')
  const [virementDevise, setVirementDevise] = useState<'USD' | 'CDF'>('USD')
  const [virementBordereau, setVirementBordereau] = useState('')
  const [virementMotif, setVirementMotif] = useState('')

  // Formulaire nouvelle demande
  const [mouvementType, setMouvementType] = useState<'SORTIE' | 'ENTREE'>('SORTIE')
  const [selectedCaisseId, setSelectedCaisseId] = useState<number | ''>('')
  const [montant, setMontant] = useState('')
  const [devise, setDevise] = useState<'USD' | 'CDF'>('USD')
  const [selectedCompte, setSelectedCompte] = useState('605')
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('')
  const [libelle, setLibelle] = useState('')

  // Formulaire nouvelle caisse
  const [nomCaisse, setNomCaisse] = useState('')
  const [soldeInitialUsd, setSoldeInitialUsd] = useState('0')
  const [soldeInitialCdf, setSoldeInitialCdf] = useState('0')

  // Requêtes
  const caissesQuery = useQuery({
    queryKey: ['caisses', agenceId],
    queryFn: () => apiRequest<CompteCaisse[]>(`/api/tresorerie/caisses?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const transactionsQuery = useQuery({
    queryKey: ['transactions', agenceId],
    queryFn: () => apiRequest<Transaction[]>(`/api/tresorerie?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const servicesQuery = useQuery({
    queryKey: ['services-entreprise'],
    queryFn: () => apiRequest<ServiceEntreprise[]>('/api/comptabilite/services', { token }),
    enabled: Boolean(token),
  })

  const planQuery = useQuery({
    queryKey: ['plan-comptable'],
    queryFn: () => apiRequest<PlanComptable[]>('/api/comptabilite/plan', { token }),
    enabled: Boolean(token),
  })

  const rapprochementsQuery = useQuery({
    queryKey: ['rapprochements', agenceId],
    queryFn: () => apiRequest<RapprochementBancaire[]>(`/api/tresorerie/rapprochements?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const createRapprochementMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/tresorerie/rapprochements', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          compteCaisseId: Number(rapCompteCaisseId),
          dateDebut: rapDateDebut,
          dateFin: rapDateFin,
          soldeDebutReleve: Number(rapSoldeDebut) || 0,
          soldeFinReleve: Number(rapSoldeFin) || 0,
          devise: rapDevise,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapprochements'] })
      setShowNewRapprochementModal(false)
      setRapSoldeDebut('')
      setRapSoldeFin('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.message || 'Erreur lors de la création de l état de rapprochement')
    },
  })

  const pointerMutation = useMutation({
    mutationFn: ({ rapId, operationId }: { rapId: number; operationId: string }) =>
      apiRequest(`/api/tresorerie/rapprochements/${rapId}/pointer`, {
        method: 'POST',
        token,
        body: JSON.stringify({ operationId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapprochements'] })
    },
  })

  const validerRapprochementMutation = useMutation({
    mutationFn: (rapId: number) =>
      apiRequest(`/api/tresorerie/rapprochements/${rapId}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapprochements'] })
      setSelectedRapprochement(null)
    },
  })

  // Mutations
  const virementMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/tresorerie/transfert-interne', {
        method: 'POST',
        token,
        body: JSON.stringify({
          sourceCaisseId: Number(virementSourceId),
          destinationCaisseId: Number(virementDestId),
          montant: Number(virementMontant),
          devise: virementDevise,
          referenceBordereau: virementBordereau,
          motif: virementMotif,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setShowVirementModal(false)
      setVirementMontant('')
      setVirementBordereau('')
      setVirementMotif('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.message || 'Erreur lors du virement interne')
    },
  })

  // Mutations
  const createDemandeMutation = useMutation({
    mutationFn: () =>
      apiRequest<Transaction>('/api/tresorerie/demande', {
        method: 'POST',
        token,
        body: JSON.stringify({
          type: mouvementType,
          montant: Number(montant),
          devise,
          libelle,
          caisse: selectedCaisseId ? { id: Number(selectedCaisseId) } : undefined,
          compteComptable: { numero: selectedCompte },
          service: selectedServiceId ? { id: Number(selectedServiceId) } : undefined,
          agence: { id: agenceId },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowNewDemandeModal(false)
      setMontant('')
      setLibelle('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.message || 'Erreur lors de la création de la demande')
    },
  })

  const createCaisseMutation = useMutation({
    mutationFn: () =>
      apiRequest<CompteCaisse>('/api/tresorerie/caisses', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: nomCaisse,
          soldeUsd: Number(soldeInitialUsd),
          soldeCdf: Number(soldeInitialCdf),
          agence: { id: agenceId },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      setShowNewCaisseModal(false)
      setNomCaisse('')
      setSoldeInitialUsd('0')
      setSoldeInitialCdf('0')
    },
    onError: (err: any) => {
      setActionError(err.message || 'Erreur lors de la création de la caisse')
    },
  })

  const validerMutation = useMutation({
    mutationFn: (txId: string) =>
      apiRequest<Transaction>(`/api/tresorerie/valider/${txId}`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.message || 'Impossible de valider la transaction. Vérifiez le solde disponible.')
    },
  })

  const rejeterMutation = useMutation({
    mutationFn: ({ txId, motif }: { txId: string; motif: string }) =>
      apiRequest<Transaction>(`/api/tresorerie/rejeter/${txId}`, {
        method: 'POST',
        token,
        body: JSON.stringify({ motif }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setRejectionModalTx(null)
      setRejectionReason('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err.message || 'Erreur lors du rejet de la transaction')
    },
  })

  const caisses = caissesQuery.data ?? []
  const allTx = transactionsQuery.data ?? []
  const pendingTx = allTx.filter((t) => t.statut === 'EN_ATTENTE')

  // Totaux consolidés des caisses
  const totalUsd = caisses.reduce((acc, c) => acc + (c.soldeUsd ?? 0), 0)
  const totalCdf = caisses.reduce((acc, c) => acc + (c.soldeCdf ?? 0), 0)

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader
          title="Trésorerie et Caisses"
          text="Gestion bidevise USD/CDF, circuit d'approbation et contrôle anti-solde négatif."
          icon={Bank}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="primary-action" style={{ background: '#0284c7' }} onClick={() => setShowNewEBModal(true)}>
            <Coins size={17} /> Nouvel État de Besoin
          </button>
          <a
            className="secondary-action"
            href={`/api/export/excel/etats-besoin?agenceId=${agenceId}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            title="Exporter tous les états de besoin au format Excel"
          >
            <FileXls size={17} color="#16a34a" /> Excel États de Besoin
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/tresorerie?agenceId=${agenceId}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            title="Exporter les mouvements de trésorerie au format Excel"
          >
            <FileXls size={17} color="#16a34a" /> Excel Trésorerie
          </a>
          <button className="secondary-action" onClick={() => setShowNewCaisseModal(true)}>
            <Plus size={17} /> Nouveau Compte
          </button>
          <button className="secondary-action" onClick={() => setShowVirementModal(true)}>
            <ArrowsClockwise size={17} /> Virement Caisse ↔ Banque
          </button>
          <button className="secondary-action" onClick={() => setShowNewRapprochementModal(true)}>
            <CheckCircle size={17} /> Rapprochement Bancaire
          </button>
          <button className="primary-action" onClick={() => setShowNewDemandeModal(true)}>
            <Plus size={17} /> Mouvement Direct
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

      {/* Cartes métriques */}
      <div className="metric-grid">
        <article className="metric-card">
          <CurrencyCircleDollar size={23} />
          <span>Disponibilités USD</span>
          <strong>{money(totalUsd, 'USD')}</strong>
        </article>
        <article className="metric-card">
          <Calculator size={23} />
          <span>Disponibilités CDF</span>
          <strong>{money(totalCdf, 'CDF')}</strong>
        </article>
        <article className="metric-card">
          <Coins size={23} />
          <span>États de Besoin Actifs</span>
          <strong style={{ color: (etatsBesoinQuery.data ?? []).filter((e) => e.statut !== 'DECAISSE' && e.statut !== 'REJETE').length > 0 ? '#0284c7' : 'inherit' }}>
            {(etatsBesoinQuery.data ?? []).filter((e) => e.statut !== 'DECAISSE' && e.statut !== 'REJETE').length}
          </strong>
        </article>
        <article className="metric-card">
          <Wallet size={23} />
          <span>Comptes de Caisse</span>
          <strong>{caisses.length}</strong>
        </article>
      </div>

      {/* Navigation sous-onglets */}
      <div className="tabs-header">
        <button
          className={clsx('tab-btn', activeTab === 'etats-besoin' && 'active')}
          onClick={() => setActiveTab('etats-besoin')}
        >
          <Coins size={17} /> États de Besoin & Décaissements ({(etatsBesoinQuery.data ?? []).length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'caisses' && 'active')}
          onClick={() => setActiveTab('caisses')}
        >
          <Wallet size={17} /> Caisses ({caisses.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'demandes' && 'active')}
          onClick={() => setActiveTab('demandes')}
        >
          <ClockCounterClockwise size={17} /> Mouvements en attente ({pendingTx.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'historique' && 'active')}
          onClick={() => setActiveTab('historique')}
        >
          <ClipboardText size={17} /> Tous les Mouvements ({allTx.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'rapprochement' && 'active')}
          onClick={() => setActiveTab('rapprochement')}
        >
          <CheckCircle size={17} /> Rapprochements Bancaires ({rapprochementsQuery.data?.length ?? 0})
        </button>
      </div>

      {/* TAB : ÉTATS DE BESOIN & DEMANDES DE FONDS */}
      {activeTab === 'etats-besoin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* BANDEAU DE GOUVERNANCE DU CIRCUIT DE VALIDATION */}
          <div style={{ background: 'var(--panel-bg)', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
                <Coins size={18} color="#0284c7" />
                Circuit d'Approbation Hiérarchique & Décaissement Caisse
              </strong>
              <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
                1. Initiation par n'importe quel service $\rightarrow$ 2. Visa & Approbation par le Chef d'Agence $\rightarrow$ 3. Contrôle & Décaissement physique par le Caissier (avec Bon officiel & Décharge).
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['TOUS', 'SOUMIS', 'APPROUVE_CHEF', 'DECAISSE', 'REJETE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={clsx('tab-button', ebFilter === st && 'active')}
                  style={{ fontSize: '0.76rem', padding: '3px 8px' }}
                  onClick={() => setEbFilter(st)}
                >
                  {st === 'TOUS' ? 'Tous' : st === 'SOUMIS' ? 'En attente Chef' : st === 'APPROUVE_CHEF' ? 'Prêts à décaisser' : st === 'DECAISSE' ? 'Décaissés' : 'Rejetés'}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={['N° EB / Date', 'Service & Demandeur', 'Motif / Justification', 'Montant', 'Compte', 'Statut', 'Pièce Caisse', 'Actions']}
            loading={etatsBesoinQuery.isLoading}
            rows={(etatsBesoinQuery.data ?? [])
              .filter((eb) => ebFilter === 'TOUS' || eb.statut === ebFilter)
              .map((eb) => [
                <div key={eb.id + '-ref'}>
                  <strong>{eb.numeroEB}</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                    {new Date(eb.dateDemande).toLocaleDateString('fr-FR')}
                  </div>
                </div>,
                <div key={eb.id + '-srv'}>
                  <div style={{ fontWeight: 600 }}>{eb.serviceDemandeur}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{eb.demandeurNom}</div>
                </div>,
                <div key={eb.id + '-mtf'} style={{ maxWidth: 260 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={eb.motif}>
                    {eb.motif}
                  </div>
                  {eb.entretienTechniqueId && (
                    <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>
                      • Rattaché à Intervention #{eb.entretienTechniqueId}
                    </span>
                  )}
                </div>,
                <strong key={eb.id + '-mnt'} style={{ color: eb.devise === 'USD' ? '#0284c7' : '#16a34a' }}>
                  {money(eb.montant, eb.devise)}
                </strong>,
                <code key={eb.id + '-cpt'} style={{ fontSize: '0.75rem' }}>{eb.compteImputation || '605'}</code>,
                <span
                  key={eb.id + '-stat'}
                  className={clsx(
                    'badge',
                    eb.statut === 'DECAISSE' && 'badge-success',
                    eb.statut === 'APPROUVE_CHEF' && 'badge-neutral',
                    eb.statut === 'SOUMIS' && 'badge-warning',
                    eb.statut === 'REJETE' && 'badge-danger'
                  )}
                  style={{ fontSize: '0.74rem' }}
                >
                  {eb.statut === 'DECAISSE' ? 'Décaissé' : eb.statut === 'APPROUVE_CHEF' ? 'Validé Chef' : eb.statut === 'SOUMIS' ? 'En attente Chef' : 'Rejeté'}
                </span>,
                <div key={eb.id + '-pcs'} style={{ fontSize: '0.8rem' }}>
                  {eb.numeroPieceCaisse ? <strong>{eb.numeroPieceCaisse}</strong> : '-'}
                  {eb.caissierNom && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{eb.caissierNom}</div>}
                </div>,
                <div key={eb.id + '-acts'} style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                  {eb.statut === 'SOUMIS' && (
                    <>
                      <button
                        type="button"
                        className="primary-action"
                        style={{ padding: '3px 8px', fontSize: '0.74rem', background: '#0284c7' }}
                        onClick={() => validerChefEBMutation.mutate(eb.id)}
                        disabled={validerChefEBMutation.isPending}
                        title="Valider la demande de fonds en tant que Chef d'Agence"
                      >
                        <CheckCircle size={14} /> Visa Chef
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '3px 8px', fontSize: '0.74rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => {
                          const r = prompt('Motif du refus de cet état de besoin :')
                          if (r) rejeterEBMutation.mutate({ ebId: eb.id, motifRejet: r })
                        }}
                        title="Rejeter cet état de besoin"
                      >
                        <XCircle size={14} /> Refuser
                      </button>
                    </>
                  )}

                  {eb.statut === 'APPROUVE_CHEF' && (
                    <button
                      type="button"
                      className="primary-action"
                      style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#16a34a' }}
                      onClick={() => {
                        setSelectedEBForDecaissement(eb)
                        setShowDecaissementModal(true)
                      }}
                      title="Libérer les fonds et émettre le bon de décaissement"
                    >
                      <Coins size={15} /> Décaisser
                    </button>
                  )}

                  <a
                    href={`/api/etats-besoin/${eb.id}/bon-decaissement`}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-action"
                    style={{ padding: '3px 8px', fontSize: '0.74rem', textDecoration: 'none' }}
                    title="Imprimer le bon officiel de décaissement et décharge de caisse"
                  >
                    <Printer size={15} /> Bon
                  </a>
                </div>,
              ])}
            emptyText="Aucun état de besoin enregistré pour ce filtre."
          />
        </div>
      )}

      {/* TAB 1 : CAISSES */}
      {activeTab === 'caisses' && (
        <div>
          <div className="caisse-grid">
            {caisses.map((c) => (
              <div className="caisse-card" key={c.id}>
                <div className="caisse-card-header">
                  <strong>{c.nom}</strong>
                  <span className="badge badge-neutral">Agence #{c.agence?.id ?? agenceId}</span>
                </div>
                <div className="caisse-balances">
                  <div className="balance-item">
                    <span>Solde USD</span>
                    <strong style={{ color: (c.soldeUsd ?? 0) < 0 ? 'var(--danger)' : 'var(--text)' }}>
                      {money(c.soldeUsd, 'USD')}
                    </strong>
                  </div>
                  <div className="balance-item">
                    <span>Solde CDF</span>
                    <strong style={{ color: (c.soldeCdf ?? 0) < 0 ? 'var(--danger)' : 'var(--text)' }}>
                      {money(c.soldeCdf, 'CDF')}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
            {caisses.length === 0 && !caissesQuery.isLoading && (
              <p style={{ color: 'var(--muted)' }}>Aucun compte de caisse enregistré pour cette agence.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2 : DEMANDES EN ATTENTE */}
      {activeTab === 'demandes' && (
        <DataTable
          columns={['Date', 'Réf.', 'Type', 'Libellé / Motif', 'Montant', 'Caisse', 'Service', 'Actions']}
          loading={transactionsQuery.isLoading}
          rows={pendingTx.map((tx) => [
            tx.dateCreation ? new Date(tx.dateCreation).toLocaleDateString('fr-FR') : '-',
            tx.referenceInterne ?? '-',
            <span
              key={tx.id + '-type'}
              className={clsx('badge', tx.type === 'ENTREE' ? 'badge-success' : 'badge-danger')}
            >
              {tx.type === 'ENTREE' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              {tx.type}
            </span>,
            tx.libelle,
            <strong key={tx.id + '-mnt'} style={{ color: tx.type === 'ENTREE' ? '#16a34a' : '#dc2626' }}>
              {money(tx.montant, tx.devise)}
            </strong>,
            tx.caisse?.nom ?? 'Caisse standard',
            tx.service?.nom ?? 'Général',
            <div key={tx.id + '-acts'} style={{ display: 'flex', gap: 6 }}>
              {can('tresorerie.valider') && (
                <>
                  <button
                    className="primary-action"
                    style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#16a34a' }}
                    onClick={() => tx.id && validerMutation.mutate(tx.id)}
                    disabled={validerMutation.isPending}
                    title="Valider la transaction"
                  >
                    <CheckCircle size={15} /> Valider
                  </button>
                  <button
                    className="secondary-action"
                    style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => setRejectionModalTx(tx)}
                    title="Refuser la demande"
                  >
                    <XCircle size={15} /> Refuser
                  </button>
                </>
              )}
              <button
                className="secondary-action"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setActiveVoucher(tx)}
                title="Aperçu du bon de caisse"
              >
                <Printer size={15} /> Bon
              </button>
            </div>,
          ])}
          emptyText="Aucune demande de caisse en attente."
        />
      )}

      {/* TAB 3 : TOUS LES MOUVEMENTS */}
      {activeTab === 'historique' && (
        <DataTable
          columns={['Date', 'Réf.', 'Type', 'Libellé', 'Montant', 'Statut', 'Caisse', 'Validateur', 'Bon']}
          loading={transactionsQuery.isLoading}
          rows={allTx.map((tx) => [
            tx.dateCreation ? new Date(tx.dateCreation).toLocaleDateString('fr-FR') : '-',
            tx.referenceInterne ?? '-',
            <span
              key={tx.id + '-type'}
              className={clsx('badge', tx.type === 'ENTREE' ? 'badge-success' : 'badge-danger')}
            >
              {tx.type === 'ENTREE' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              {tx.type}
            </span>,
            tx.libelle,
            <strong key={tx.id + '-mnt'} style={{ color: tx.type === 'ENTREE' ? '#16a34a' : '#dc2626' }}>
              {money(tx.montant, tx.devise)}
            </strong>,
            <span
              key={tx.id + '-stat'}
              className={clsx(
                'badge',
                tx.statut === 'VALIDE' && 'badge-success',
                tx.statut === 'EN_ATTENTE' && 'badge-warning',
                tx.statut === 'REJETE' && 'badge-danger'
              )}
            >
              {tx.statut}
            </span>,
            tx.caisse?.nom ?? '-',
            tx.validateur?.nom ?? tx.validateur?.email ?? '-',
            <button
              key={tx.id + '-prt'}
              className="icon-button"
              onClick={() => setActiveVoucher(tx)}
              title="Imprimer bon de caisse"
            >
              <Printer size={16} />
            </button>,
          ])}
          emptyText="Aucun mouvement de caisse enregistré."
        />
      )}

      {/* TAB 4 : RAPPROCHEMENT BANCAIRE */}
      {activeTab === 'rapprochement' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>États de Rapprochement Bancaire (Rawbank & Equity BCDC)</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Concordance mensuelle entre le solde comptable de l'ERP et les extraits de compte bancaires réels.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewRapprochementModal(true)}>
              <Plus size={17} /> Nouvel État de Rapprochement
            </button>
          </div>

          <DataTable
            columns={['Compte Bancaire', 'Période Extrait', 'Solde Relevé', 'Solde Comptable ERP', 'Écart Constaté', 'Statut', 'Auteur & Clôture', 'Action']}
            loading={rapprochementsQuery.isLoading}
            rows={(rapprochementsQuery.data ?? []).map((r) => [
              <strong key={'cp-' + r.id}>{r.compte?.nom ?? `Compte #${r.compteCaisseId}`}</strong>,
              `${new Date(r.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(r.dateFin).toLocaleDateString('fr-FR')}`,
              <strong key={'sfr-' + r.id}>{money(r.soldeFinReleve, r.devise)}</strong>,
              money(r.soldeComptable, r.devise),
              <strong
                key={'ec-' + r.id}
                style={{ color: Math.abs(r.ecart) < 0.01 ? '#16a34a' : '#dc2626' }}
              >
                {money(r.ecart, r.devise)} {Math.abs(r.ecart) < 0.01 ? '✓ Justifié' : '⚠ Écart'}
              </strong>,
              <span
                key={'st-' + r.id}
                className={clsx('badge', r.statut === 'VALIDE' ? 'badge-success' : 'badge-warning')}
              >
                {r.statut === 'VALIDE' ? 'Clôturé & Validé' : 'En cours de pointage'}
              </span>,
              `${r.auteur} ${r.dateCloture ? 'le ' + new Date(r.dateCloture).toLocaleDateString('fr-FR') : ''}`,
              <button
                key={'btn-' + r.id}
                className="secondary-action"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setSelectedRapprochement(r)}
              >
                Pointer / Fiche
              </button>,
            ])}
            emptyText="Aucun état de rapprochement bancaire créé."
          />
        </div>
      )}

      {/* MODAL : NOUVEAU RAPPROCHEMENT BANCAIRE */}
      {showNewRapprochementModal && (
        <div className="modal-overlay" onClick={() => setShowNewRapprochementModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Initier un Rapprochement Bancaire</h3>
              <button className="icon-button" onClick={() => setShowNewRapprochementModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '6px 0 14px' }}>
              Saisissez les informations de l'extrait de compte bancaire officiel pour conciliation.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createRapprochementMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Compte Bancaire
                <select
                  required
                  value={rapCompteCaisseId}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : ''
                    setRapCompteCaisseId(id)
                    const found = caisses.find((c) => c.id === id)
                    if (found) {
                      setRapSoldeDebut(found.soldeUsd.toString())
                      setRapSoldeFin(found.soldeUsd.toString())
                    }
                  }}
                >
                  <option value="">Sélectionner un compte bancaire...</option>
                  {caisses.map((c) => (
                    <option key={'bnk-' + c.id} value={c.id}>
                      {c.nom} {c.numeroCompteBancaire ? `(${c.numeroCompteBancaire})` : ''} - Solde: {money(c.soldeUsd, 'USD')} / {money(c.soldeCdf, 'CDF')}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Date début relevé
                  <input
                    type="date"
                    required
                    value={rapDateDebut}
                    onChange={(e) => setRapDateDebut(e.target.value)}
                  />
                </label>
                <label>
                  Date fin relevé
                  <input
                    type="date"
                    required
                    value={rapDateFin}
                    onChange={(e) => setRapDateFin(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Devise
                  <select
                    value={rapDevise}
                    onChange={(e) => setRapDevise(e.target.value as 'USD' | 'CDF')}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </label>
                <label>
                  Solde début extrait
                  <input
                    type="number"
                    step="any"
                    value={rapSoldeDebut}
                    onChange={(e) => setRapSoldeDebut(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label>
                Solde de clôture sur l'extrait bancaire (Relevé papier / PDF)
                <input
                  required
                  type="number"
                  step="any"
                  value={rapSoldeFin}
                  onChange={(e) => setRapSoldeFin(e.target.value)}
                  placeholder="ex: 28400.00"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewRapprochementModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createRapprochementMutation.isPending}>
                  {createRapprochementMutation.isPending ? 'Initialisation...' : 'Créer l État de Rapprochement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : FICHE DE POINTAGE & RAPPROCHEMENT DÉTAILLÉE */}
      {selectedRapprochement && (
        <div className="modal-overlay" onClick={() => setSelectedRapprochement(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Fiche de Rapprochement Bancaire #{selectedRapprochement.id}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Compte : {selectedRapprochement.compte?.nom ?? `Compte #${selectedRapprochement.compteCaisseId}`} | Période : {selectedRapprochement.dateDebut} au {selectedRapprochement.dateFin}
                </span>
              </div>
              <button className="icon-button" onClick={() => setSelectedRapprochement(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="metric-grid" style={{ marginTop: 12, marginBottom: 12 }}>
              <article className="metric-card">
                <span>Solde Relevé Bancaire</span>
                <strong>{money(selectedRapprochement.soldeFinReleve, selectedRapprochement.devise)}</strong>
              </article>
              <article className="metric-card">
                <span>Solde Comptable ERP</span>
                <strong>{money(selectedRapprochement.soldeComptable, selectedRapprochement.devise)}</strong>
              </article>
              <article className="metric-card">
                <span>Écart Rapprochement</span>
                <strong style={{ color: Math.abs(selectedRapprochement.ecart) < 0.01 ? '#16a34a' : '#dc2626' }}>
                  {money(selectedRapprochement.ecart, selectedRapprochement.devise)}
                </strong>
              </article>
            </div>

            <div style={{ margin: '8px 0', fontSize: '0.85rem', fontWeight: 600 }}>
              Pointage des opérations de trésorerie bancaire :
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
              {allTx.filter((t) => t.caisseId === selectedRapprochement.compteCaisseId || t.caisse?.type === 'BANQUE').length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>Aucun mouvement bancaire à pointer.</div>
              ) : (
                allTx
                  .filter((t) => t.caisseId === selectedRapprochement.compteCaisseId || t.caisse?.type === 'BANQUE')
                  .map((t) => {
                    const isPointe = selectedRapprochement.operationsPointees.includes(String(t.id))
                    return (
                      <div
                        key={'pt-' + t.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          borderBottom: '1px solid var(--border)',
                          background: isPointe ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={isPointe}
                            onChange={() => pointerMutation.mutate({ rapId: selectedRapprochement.id, operationId: String(t.id) })}
                          />
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.referenceInterne}</span>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{t.libelle}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: t.type === 'ENTREE' ? '#16a34a' : '#dc2626', fontSize: '0.85rem' }}>
                            {t.type === 'ENTREE' ? '+' : '-'} {money(t.montant, t.devise)}
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{new Date(t.dateCreation ?? '').toLocaleDateString('fr-FR')}</div>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {selectedRapprochement.operationsPointees.length} opération(s) pointée(s).
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setSelectedRapprochement(null)}>
                  Fermer
                </button>
                {selectedRapprochement.statut !== 'VALIDE' && (
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => validerRapprochementMutation.mutate(selectedRapprochement.id)}
                    disabled={validerRapprochementMutation.isPending}
                  >
                    <CheckCircle size={17} /> Valider & Clôturer l État
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE DEMANDE DE CAISSE */}
      {showNewDemandeModal && (
        <div className="modal-overlay" onClick={() => setShowNewDemandeModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Nouvelle Demande de Caisse</h3>
              <button className="icon-button" onClick={() => setShowNewDemandeModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createDemandeMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12, marginTop: 12 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Type d'opération
                  <select
                    value={mouvementType}
                    onChange={(e) => setMouvementType(e.target.value as 'SORTIE' | 'ENTREE')}
                  >
                    <option value="SORTIE">Sortie (Dépense / Achat)</option>
                    <option value="ENTREE">Entrée (Recette / Apport)</option>
                  </select>
                </label>

                <label>
                  Compte de caisse
                  <select
                    value={selectedCaisseId}
                    onChange={(e) => setSelectedCaisseId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Sélectionner une caisse</option>
                    {caisses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.soldeUsd}$ / {c.soldeCdf} CDF)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Montant
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Devise
                  <select value={devise} onChange={(e) => setDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Compte OHADA
                  <select value={selectedCompte} onChange={(e) => setSelectedCompte(e.target.value)}>
                    {(planQuery.data ?? []).map((cp) => (
                      <option key={cp.numero} value={cp.numero}>
                        {cp.numero} - {cp.libelle}
                      </option>
                    ))}
                    {(planQuery.data ?? []).length === 0 && (
                      <>
                        <option value="605">605 - Autres achats & charges</option>
                        <option value="601">601 - Achats matières premières</option>
                        <option value="661">661 - Salaires & Personnel</option>
                        <option value="706">706 - Ventes de services</option>
                        <option value="701">701 - Ventes produits finis</option>
                      </>
                    )}
                  </select>
                </label>

                <label>
                  Département (Analytique)
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Sélectionner un service</option>
                    {(servicesQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Libellé / Justification précise
                <input
                  required
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="ex: Carburant générateur agence, Fournitures bureau..."
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewDemandeModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createDemandeMutation.isPending}>
                  Soumettre la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE CAISSE */}
      {showNewCaisseModal && (
        <div className="modal-overlay" onClick={() => setShowNewCaisseModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Nouveau Compte Caisse</h3>
              <button className="icon-button" onClick={() => setShowNewCaisseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createCaisseMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12, marginTop: 12 }}
            >
              <label>
                Nom du compte
                <input
                  required
                  value={nomCaisse}
                  onChange={(e) => setNomCaisse(e.target.value)}
                  placeholder="ex: Caisse Principale, M-Pesa Agence, Airtel Money"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Solde initial USD
                  <input
                    type="number"
                    step="0.01"
                    value={soldeInitialUsd}
                    onChange={(e) => setSoldeInitialUsd(e.target.value)}
                  />
                </label>

                <label>
                  Solde initial CDF
                  <input
                    type="number"
                    step="1"
                    value={soldeInitialCdf}
                    onChange={(e) => setSoldeInitialCdf(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewCaisseModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createCaisseMutation.isPending}>
                  Créer la caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MOTIF DE REJET */}
      {rejectionModalTx && (
        <div className="modal-overlay" onClick={() => setRejectionModalTx(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Rejeter la demande de caisse</h3>
              <button className="icon-button" onClick={() => setRejectionModalTx(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '8px 0' }}>
              Transaction : <strong>{rejectionModalTx.referenceInterne}</strong> — {money(rejectionModalTx.montant, rejectionModalTx.devise)}
            </p>
            <label style={{ display: 'grid', gap: 6 }}>
              Motif du rejet
              <input
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="ex: Justificatif manquant, Dépense non autorisée..."
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="secondary-action" onClick={() => setRejectionModalTx(null)}>
                Annuler
              </button>
              <button
                className="primary-action"
                style={{ background: '#dc2626' }}
                onClick={() =>
                  rejectionModalTx.id &&
                  rejeterMutation.mutate({ txId: rejectionModalTx.id, motif: rejectionReason })
                }
                disabled={rejeterMutation.isPending}
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : VIREMENT INTERNE CAISSE <-> BANQUE */}
      {showVirementModal && (
        <div className="modal-overlay" onClick={() => setShowVirementModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Virement Interne de Fonds (Caisse ↔ Banque)</h3>
              <button className="icon-button" onClick={() => setShowVirementModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '6px 0 14px' }}>
              Dépôt des recettes d espèces en banque, retrait bancaire pour approvisionnement de caisse, ou transfert entre caisses.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                virementMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Compte émetteur (Source débitée)
                <select
                  required
                  value={virementSourceId}
                  onChange={(e) => setVirementSourceId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Sélectionner le compte source...</option>
                  {caisses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} — Dispo: ${c.soldeUsd?.toFixed(2)} USD / {c.soldeCdf?.toLocaleString()} CDF
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Compte bénéficiaire (Destination créditée)
                <select
                  required
                  value={virementDestId}
                  onChange={(e) => setVirementDestId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Sélectionner le compte destination...</option>
                  {caisses
                    .filter((c) => c.id !== Number(virementSourceId))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} — Actuel: ${c.soldeUsd?.toFixed(2)} USD / {c.soldeCdf?.toLocaleString()} CDF
                      </option>
                    ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <label>
                  Devise
                  <select
                    value={virementDevise}
                    onChange={(e) => setVirementDevise(e.target.value as 'USD' | 'CDF')}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </label>

                <label>
                  Montant à virer
                  <input
                    required
                    type="number"
                    step="any"
                    min="1"
                    value={virementMontant}
                    onChange={(e) => setVirementMontant(e.target.value)}
                    placeholder="ex: 1500"
                  />
                </label>
              </div>

              <label>
                Réf. Bordereau de Versement / Chèque
                <input
                  required
                  value={virementBordereau}
                  onChange={(e) => setVirementBordereau(e.target.value)}
                  placeholder="ex: Bordereau Rawbank #048291, Chèque Equity #108"
                />
              </label>

              <label>
                Motif / Justification du transfert
                <input
                  value={virementMotif}
                  onChange={(e) => setVirementMotif(e.target.value)}
                  placeholder="ex: Versement recettes de ventes comptoir du jour"
                />
              </label>

              <div className="notice info" style={{ fontSize: '0.82rem', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <strong>Schéma SYSCOHADA :</strong> L opération débite et crédite automatiquement le compte <code>585 (Virements internes de fonds)</code>. Le solde du compte source diminue et celui du compte récepteur augmente instantanément.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" className="secondary-action" onClick={() => setShowVirementModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={virementMutation.isPending}>
                  {virementMutation.isPending ? 'Exécution...' : 'Exécuter le virement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : BON DE CAISSE IMPRIMABLE */}
      {activeVoucher && (
        <div className="modal-overlay" onClick={() => setActiveVoucher(null)}>
          <div className="receipt-preview-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="voucher-ticket">
              <div className="voucher-header">
                <h2>MATABISHI MVG SARL</h2>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#555' }}>BON DE TRÉSORERIE INTERNE</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#555' }}>Agence : {activeVoucher.agence?.nom ?? 'Goma'}</p>
              </div>

              <div className="voucher-meta">
                <div>
                  <strong>Réf : </strong>{activeVoucher.referenceInterne ?? '-'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Date : </strong>
                  {activeVoucher.dateCreation ? new Date(activeVoucher.dateCreation).toLocaleDateString('fr-FR') : '-'}
                </div>
                <div>
                  <strong>Nature : </strong>{activeVoucher.type === 'ENTREE' ? 'ENCAISSEMENT' : 'DÉCAISSEMENT'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Statut : </strong>{activeVoucher.statut}
                </div>
                <div>
                  <strong>Caisse : </strong>{activeVoucher.caisse?.nom ?? '-'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Service : </strong>{activeVoucher.service?.nom ?? '-'}
                </div>
              </div>

              <div className="voucher-amount-box">
                <div className="amount-label">Montant de l'opération</div>
                <div className="amount-val">{money(activeVoucher.montant, activeVoucher.devise)}</div>
              </div>

              <div style={{ fontSize: '0.85rem', marginBottom: 14 }}>
                <strong>Motif : </strong>
                <span>{activeVoucher.libelle}</span>
              </div>

              <div className="voucher-signatures">
                <div className="signature-box">
                  <span>Demandeur / Bénéficiaire</span>
                  <div className="sign-line">
                    {activeVoucher.createur?.nom ?? activeVoucher.createur?.email ?? 'Signature'}
                  </div>
                </div>
                <div className="signature-box">
                  <span>Approbation Chef / Caissier</span>
                  <div className="sign-line">
                    {activeVoucher.validateur?.nom ?? activeVoucher.validateur?.email ?? 'Signature'}
                  </div>
                </div>
              </div>
            </div>

            <div className="receipt-modal-actions">
              <button className="primary-action" onClick={() => window.print()}>
                <Printer size={17} /> Imprimer Bon
              </button>
              <button className="secondary-action" onClick={() => setActiveVoucher(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AccountingPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)

  const [activeTab, setActiveTab] = useState<'journal' | 'balance' | 'performance' | 'plan' | 'cloture' | 'immobilisations'>('journal')
  const [mois, setMois] = useState(new Date().getMonth() + 1)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [planSearch, setPlanSearch] = useState('')
  const [showNewCompteModal, setShowNewCompteModal] = useState(false)
  const [nouveauNumero, setNouveauNumero] = useState('')
  const [nouveauLibelle, setNouveauLibelle] = useState('')
  const [compteParent, setCompteParent] = useState('')
  const [clotureNotice, setClotureNotice] = useState<string | null>(null)

  // Immobilisations
  const [showNewImmoModal, setShowNewImmoModal] = useState(false)
  const [immoNom, setImmoNom] = useState('')
  const [immoCompte, setImmoCompte] = useState('241')
  const [immoValAcq, setImmoValAcq] = useState('')
  const [immoDuree, setImmoDuree] = useState('10')
  const [immoEmplacement, setImmoEmplacement] = useState('Usine Goma')
  const [immoNotice, setImmoNotice] = useState<string | null>(null)

  // Saisie manuelle d'écriture (OD)
  const [showManualEntryModal, setShowManualEntryModal] = useState(false)
  const [compteDebit, setCompteDebit] = useState('')
  const [compteCredit, setCompteCredit] = useState('')
  const [montantManuel, setMontantManuel] = useState('')
  const [deviseManuelle, setDeviseManuelle] = useState<'USD' | 'CDF'>('USD')
  const [libelleManuel, setLibelleManuel] = useState('')
  const [pieceJustificative, setPieceJustificative] = useState('')
  const [motifOD, setMotifOD] = useState('AMORTISSEMENT')
  const [filtreModule, setFiltreModule] = useState('TOUS')
  const [manualEntryError, setManualEntryError] = useState<string | null>(null)

  // Requêtes
  const ecrituresQuery = useQuery({
    queryKey: ['ecritures', agenceId],
    queryFn: () => apiRequest<EcritureComptable[]>(`/api/comptabilite/ecritures?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const balanceQuery = useQuery({
    queryKey: ['balance', agenceId, mois, annee],
    queryFn: () =>
      apiRequest<LigneFinanciere[]>(
        `/api/comptabilite/balance?agenceId=${agenceId}&mois=${mois}&annee=${annee}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  const performanceQuery = useQuery({
    queryKey: ['performance-services', agenceId, mois, annee],
    queryFn: () =>
      apiRequest<ServicePerformance[]>(
        `/api/comptabilite/performance-services?agenceId=${agenceId}&mois=${mois}&annee=${annee}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  const planQuery = useQuery({
    queryKey: ['plan-comptable-full'],
    queryFn: () => apiRequest<PlanComptable[]>('/api/comptabilite/plan', { token }),
    enabled: Boolean(token),
  })

  const clotureQuery = useQuery({
    queryKey: ['comptabilite-cloture-statut'],
    queryFn: () => apiRequest<any>('/api/comptabilite/exercices/statut', { token }),
    enabled: Boolean(token),
  })

  const immosQuery = useQuery({
    queryKey: ['immobilisations', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/comptabilite/immobilisations?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const addImmoMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/comptabilite/immobilisations', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: immoNom,
          compteImmo: immoCompte,
          valeurAcquisitionUsd: Number(immoValAcq),
          dureeAnnees: Number(immoDuree),
          emplacement: immoEmplacement,
          agenceId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['immobilisations'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setShowNewImmoModal(false)
      setImmoNom('')
      setImmoValAcq('')
      setImmoNotice('Nouvelle immobilisation enregistrée et écriture d acquisition passée.')
    },
    onError: (err: any) => setImmoNotice(err.message || 'Erreur lors de l enregistrement de l actif'),
  })

  const passerDotationMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/comptabilite/immobilisations/dotation-annuelle', {
        method: 'POST',
        token,
        body: JSON.stringify({ annee }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['immobilisations'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['comptabilite-cloture-statut'] })
      setImmoNotice(data.message || `Dotations annuelles ${annee} passées avec succès.`)
    },
    onError: (err: any) => setImmoNotice(err.message || 'Erreur lors du calcul des amortissements'),
  })

  const cloturerExerciceMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>('/api/comptabilite/exercices/cloture', {
        method: 'POST',
        token,
        body: JSON.stringify({ annee }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['comptabilite-cloture-statut'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setClotureNotice(data.message || `Exercice ${annee} clôturé avec succès.`)
    },
    onError: (err: any) => {
      setClotureNotice(err.message || 'Erreur lors de la clôture de l exercice')
    },
  })

  // Mutation ajout compte
  const addCompteMutation = useMutation({
    mutationFn: () =>
      apiRequest<PlanComptable>('/api/comptabilite/plan', {
        method: 'POST',
        token,
        body: JSON.stringify({
          numero: nouveauNumero,
          libelle: nouveauLibelle,
          estModifiable: true,
          parent: compteParent ? { numero: compteParent } : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comptable-full'] })
      queryClient.invalidateQueries({ queryKey: ['plan-comptable'] })
      setShowNewCompteModal(false)
      setNouveauNumero('')
      setNouveauLibelle('')
      setCompteParent('')
    },
  })

  // Mutation saisie écriture manuelle (OD)
  const addManualEcritureMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/comptabilite/ecritures/manuelle', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          compteDebit,
          compteCredit,
          montant: Number(montantManuel),
          devise: deviseManuelle,
          libelle: `${pieceJustificative ? `[${pieceJustificative}] ` : ''}${libelleManuel}`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['performance-services'] })
      setShowManualEntryModal(false)
      setCompteDebit('')
      setCompteCredit('')
      setMontantManuel('')
      setLibelleManuel('')
      setPieceJustificative('')
      setManualEntryError(null)
    },
    onError: (err: any) => {
      setManualEntryError(err.message || 'Erreur lors de l enregistrement de l écriture manuelle')
    },
  })

  const ecritures = ecrituresQuery.data ?? []
  const balanceLines = balanceQuery.data ?? []
  const performances = performanceQuery.data ?? []
  const planComptable = planQuery.data ?? []

  // Filtrage plan comptable
  const filteredPlan = planComptable.filter(
    (c) =>
      c.numero.toLowerCase().includes(planSearch.toLowerCase()) ||
      c.libelle.toLowerCase().includes(planSearch.toLowerCase())
  )

  // Totaux balance
  const totauxBalance = balanceLines.reduce(
    (acc, l) => ({
      debitUsd: acc.debitUsd + (l.debitUsd ?? 0),
      creditUsd: acc.creditUsd + (l.creditUsd ?? 0),
      debitCdf: acc.debitCdf + (l.debitCdf ?? 0),
      creditCdf: acc.creditCdf + (l.creditCdf ?? 0),
      netConsolide: acc.netConsolide + (l.totalConsolideUsd ?? 0),
    }),
    { debitUsd: 0, creditUsd: 0, debitCdf: 0, creditCdf: 0, netConsolide: 0 }
  )

  const balancePdfUrl = downloadUrl(
    `/api/reporting/export/balance?mois=${mois}&annee=${annee}&agenceId=${agenceId}`
  )

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader
          title="Comptabilité Générale & Analytique (OHADA)"
          text="Journal en partie double, balance générale bidevise et résultats par centre de coûts."
          icon={Books}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/grand-livre?agenceId=${agenceId}&annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Grand Livre général des comptes"
          >
            <Printer size={17} /> Grand Livre
          </a>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/compte-resultat?agenceId=${agenceId}&annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Compte de Résultat analytique"
          >
            <Printer size={17} /> Compte Résultat
          </a>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/immobilisations?agenceId=${agenceId}&annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Tableau des Immobilisations & Amortissements OHADA"
          >
            <Printer size={17} /> Tableau Amortissements
          </a>
          {activeTab === 'immobilisations' && (
            <button className="primary-action" onClick={() => setShowNewImmoModal(true)}>
              <Plus size={17} /> Nouvelle Immobilisation
            </button>
          )}
          {activeTab === 'journal' && (
            <button className="primary-action" onClick={() => setShowManualEntryModal(true)}>
              <Plus size={17} /> Saisie Écriture Manuelle (OD)
            </button>
          )}
          {activeTab === 'balance' && (
            <a className="primary-action" href={balancePdfUrl} target="_blank" rel="noreferrer">
              <FilePdf size={17} /> Télécharger Balance PDF
            </a>
          )}
          {activeTab === 'plan' && (
            <button className="primary-action" onClick={() => setShowNewCompteModal(true)}>
              <Plus size={17} /> Nouveau Compte
            </button>
          )}
        </div>
      </div>

      {/* Navigation sous-onglets */}
      <div className="tabs-header">
        <button
          className={clsx('tab-btn', activeTab === 'journal' && 'active')}
          onClick={() => setActiveTab('journal')}
        >
          <ClipboardText size={17} /> Journal des Écritures ({ecritures.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'balance' && 'active')}
          onClick={() => setActiveTab('balance')}
        >
          <Calculator size={17} /> Balance Générale OHADA
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'performance' && 'active')}
          onClick={() => setActiveTab('performance')}
        >
          <TrendUp size={17} /> Compte de Résultat par Service
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'plan' && 'active')}
          onClick={() => setActiveTab('plan')}
        >
          <Books size={17} /> Plan Comptable ({planComptable.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'immobilisations' && 'active')}
          onClick={() => setActiveTab('immobilisations')}
        >
          <Package size={17} /> Immobilisations & Amortissements ({(immosQuery.data ?? []).length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'cloture' && 'active')}
          onClick={() => setActiveTab('cloture')}
        >
          <ShieldCheck size={17} /> Clôture Annuelle OHADA
        </button>
      </div>

      {/* TAB 1 : JOURNAL DES ECRITURES */}
      {activeTab === 'journal' && (
        <div>
          <div className="filter-bar" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Filtrer par module :</span>
              <select
                value={filtreModule}
                onChange={(e) => setFiltreModule(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
              >
                <option value="TOUS">Tous les flux ({ecritures.length})</option>
                <option value="COMPTABILITE">Opérations Diverses (OD / Manuelles)</option>
                <option value="VENTES">Ventes & Recouvrements</option>
                <option value="ACHATS">Achats & Fournisseurs</option>
                <option value="TRESORERIE">Trésorerie & Virements Internes</option>
                <option value="RH">Paie & Avances sur Salaire</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a
                href={`/api/export/excel/grand-livre?agenceId=${agenceId}&annee=${annee}`}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <FileXls size={16} /> Exporter Grand Livre (.xlsx)
              </a>
              <button className="secondary-action" onClick={() => setShowManualEntryModal(true)}>
                <Plus size={15} /> Nouvelle OD Manuelle
              </button>
            </div>
          </div>

          <DataTable
            columns={['Date', 'Réf. Opération', 'N° Compte', 'Libellé Compte', 'Sens', 'Montant', 'Module Source']}
            loading={ecrituresQuery.isLoading}
            rows={ecritures
              .filter((e) => filtreModule === 'TOUS' || (e.sourceModule ?? 'COMPTABILITE') === filtreModule)
              .map((e) => [
                e.dateEcriture ? new Date(e.dateEcriture).toLocaleDateString('fr-FR') : '-',
                e.referenceOperation ? e.referenceOperation.substring(0, 14) : '-',
                <strong>{e.compte?.numero ?? '-'}</strong>,
                e.libelle ?? e.compte?.libelle ?? '-',
                <span
                  key={e.id + '-sens'}
                  className={clsx('badge', e.sens === 'DEBIT' ? 'badge-danger' : 'badge-success')}
                >
                  {e.sens}
                </span>,
                <strong key={e.id + '-mnt'}>
                  {money(e.montant, e.devise)}
                </strong>,
                <span key={e.id + '-mod'} className={clsx('badge', e.sourceModule === 'COMPTABILITE' ? 'badge-warning' : 'badge-neutral')}>
                  {e.sourceModule === 'COMPTABILITE' ? 'OD MANUELLE' : (e.sourceModule ?? 'COMPTABILITE')}
                </span>,
              ])}
            emptyText="Aucune écriture comptable enregistrée."
          />
        </div>
      )}

      {/* TAB 2 : BALANCE GENERALE OHADA */}
      {activeTab === 'balance' && (
        <div>
          <div className="filter-bar">
            <div className="filter-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                Mois :
                <select value={mois} onChange={(e) => setMois(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                Année :
                <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a
                href={`/api/export/excel/balance?agenceId=${agenceId}&annee=${annee}&mois=${mois}`}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <FileXls size={16} /> Exporter Balance (.xlsx)
              </a>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Équilibre : {totauxBalance.debitUsd === totauxBalance.creditUsd ? 'Parfait' : 'En calcul'}
              </div>
            </div>
          </div>

          <DataTable
            columns={[
              'N° Compte',
              'Désignation',
              'Débit USD',
              'Crédit USD',
              'Débit CDF',
              'Crédit CDF',
              'Solde Net (USD)',
            ]}
            loading={balanceQuery.isLoading}
            rows={[
              ...balanceLines.map((l) => [
                <strong>{l.numeroCompte}</strong>,
                l.libelle,
                money(l.debitUsd, 'USD'),
                money(l.creditUsd, 'USD'),
                money(l.debitCdf, 'CDF'),
                money(l.creditCdf, 'CDF'),
                <strong
                  key={l.numeroCompte + '-net'}
                  style={{ color: (l.totalConsolideUsd ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {money(l.totalConsolideUsd, 'USD')}
                </strong>,
              ]),
              // Ligne de totaux
              balanceLines.length > 0
                ? [
                    <strong key="tot-num">TOTAL</strong>,
                    <strong key="tot-lbl">Consolidation Générale</strong>,
                    <strong key="tot-dusd">{money(totauxBalance.debitUsd, 'USD')}</strong>,
                    <strong key="tot-cusd">{money(totauxBalance.creditUsd, 'USD')}</strong>,
                    <strong key="tot-dcdf">{money(totauxBalance.debitCdf, 'CDF')}</strong>,
                    <strong key="tot-ccdf">{money(totauxBalance.creditCdf, 'CDF')}</strong>,
                    <strong key="tot-net">{money(totauxBalance.netConsolide, 'USD')}</strong>,
                  ]
                : [],
            ].filter((r) => r.length > 0)}
            emptyText="Aucune transaction validée sur cette période."
          />
        </div>
      )}

      {/* TAB 3 : PERFORMANCE ANALYTIQUE PAR SERVICE */}
      {activeTab === 'performance' && (
        <div>
          <div className="filter-bar">
            <div className="filter-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                Mois :
                <select value={mois} onChange={(e) => setMois(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                Année :
                <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </label>
            </div>
          </div>

          <div className="metric-grid" style={{ marginBottom: 20 }}>
            {performances.map((perf) => (
              <article className="metric-card" key={perf.nomService}>
                <TrendUp size={22} />
                <span>{perf.nomService}</span>
                <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Charges (Cl. 6) :</span>
                    <strong style={{ color: '#dc2626' }}>{money(perf.charges, 'USD')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Produits (Cl. 7) :</span>
                    <strong style={{ color: '#16a34a' }}>{money(perf.produits, 'USD')}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.9rem',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 4,
                      marginTop: 2,
                    }}
                  >
                    <span>Résultat Net :</span>
                    <strong style={{ color: perf.resultatNet >= 0 ? '#16a34a' : '#dc2626' }}>
                      {money(perf.resultatNet, 'USD')}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
            {performances.length === 0 && !performanceQuery.isLoading && (
              <p style={{ color: 'var(--muted)' }}>Aucun mouvement enregistré pour les services ce mois-ci.</p>
            )}
          </div>

          <DataTable
            columns={['Département / Service', 'Total Charges (USD)', 'Total Produits (USD)', 'Résultat Net (USD)']}
            loading={performanceQuery.isLoading}
            rows={performances.map((p) => [
              <strong>{p.nomService}</strong>,
              <span key={p.nomService + '-chg'} style={{ color: '#dc2626' }}>
                {money(p.charges, 'USD')}
              </span>,
              <span key={p.nomService + '-prd'} style={{ color: '#16a34a' }}>
                {money(p.produits, 'USD')}
              </span>,
              <strong
                key={p.nomService + '-net'}
                style={{ color: p.resultatNet >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {money(p.resultatNet, 'USD')}
              </strong>,
            ])}
            emptyText="Aucune donnée analytique sur cette période."
          />
        </div>
      )}

      {/* TAB 4 : PLAN COMPTABLE OHADA */}
      {activeTab === 'plan' && (
        <div>
          <div className="filter-bar">
            <div className="filter-group" style={{ flex: 1, maxWidth: 400 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <MagnifyingGlass size={17} color="var(--muted)" />
                <input
                  style={{ width: '100%' }}
                  placeholder="Rechercher par numéro ou libellé..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                />
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {filteredPlan.length} compte(s) affiché(s)
            </span>
          </div>

          <DataTable
            columns={['Numéro', 'Intitulé du Compte', 'Type', 'Statut']}
            loading={planQuery.isLoading}
            rows={filteredPlan.map((c) => [
              <strong key={c.numero}>{c.numero}</strong>,
              c.libelle,
              <span key={c.numero + '-type'} className="badge badge-neutral">
                Classe {c.numero.substring(0, 1)}
              </span>,
              <span
                key={c.numero + '-stat'}
                className={clsx('badge', c.estModifiable ? 'badge-success' : 'badge-neutral')}
              >
                {c.estModifiable ? 'Personnalisé' : 'Système racine'}
              </span>,
            ])}
            emptyText="Aucun compte ne correspond à votre recherche."
          />
        </div>
      )}

      {/* TAB 5 : CLÔTURE ANNUELLE OHADA */}
      {activeTab === 'cloture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {clotureNotice && (
            <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{clotureNotice}</span>
              <button className="icon-button" onClick={() => setClotureNotice(null)}><X size={16} /></button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Exercice Fiscal Analysé</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0' }}>{annee}</div>
              <span className="badge badge-success">Exercice Ouvert</span>
            </div>

            <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Cumul Charges d'Exploitation (Classe 6)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: '#dc2626' }}>
                ${(clotureQuery.data?.totalChargesUsd ?? 0).toFixed(2)} USD
              </div>
              <small style={{ color: 'var(--muted)' }}>Achats grains, salaires, amortissements, frais</small>
            </div>

            <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Cumul Produits d'Exploitation (Classe 7)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: '#16a34a' }}>
                ${(clotureQuery.data?.totalProduitsUsd ?? 0).toFixed(2)} USD
              </div>
              <small style={{ color: 'var(--muted)' }}>Ventes de farines de maïs/blé et sous-produits</small>
            </div>

            <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '2px solid var(--accent)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Résultat Net Prévisionnel</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0', color: (clotureQuery.data?.resultatNetUsd ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                {(clotureQuery.data?.resultatNetUsd ?? 0) >= 0 ? '+' : ''}${(clotureQuery.data?.resultatNetUsd ?? 0).toFixed(2)} USD
              </div>
              <span className={clsx('badge', (clotureQuery.data?.resultatNetUsd ?? 0) >= 0 ? 'badge-success' : 'badge-danger')}>
                {(clotureQuery.data?.resultatNetUsd ?? 0) >= 0 ? 'Bénéfice Net (Compte 131)' : 'Perte Nette (Compte 139)'}
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 8px' }}>Règles de Clôture d'Exercice selon le Système Comptable OHADA</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
              La clôture annuelle solde l'ensemble des comptes de gestion (charges de la classe 6 et produits de la classe 7) vers le compte de <strong>Résultat Net de l'exercice (compte 131 ou 139)</strong>. Les comptes de bilan (classes 1 à 5) sont arrêtés et basculent dans la balance d'ouverture (À-Nouveaux) de l'exercice <strong>{annee + 1}</strong>.
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="primary-action"
                onClick={() => {
                  if (confirm(`Confirmez-vous la clôture formelle de l'exercice comptable ${annee} ? Cette action générera l'écriture d'affectation au compte 131/139.`)) {
                    cloturerExerciceMutation.mutate()
                  }
                }}
                disabled={cloturerExerciceMutation.isPending}
              >
                <CheckCircle size={18} />
                {cloturerExerciceMutation.isPending ? 'Clôture en cours...' : `Clôturer définitivement l'exercice ${annee}`}
              </button>
              <a
                className="secondary-action"
                href={`/api/comptabilite/export/compte-resultat?agenceId=${agenceId}&annee=${annee}`}
                target="_blank"
                rel="noreferrer"
              >
                <FilePdf size={18} /> Télécharger le Compte de Résultat Officiel
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6 : IMMOBILISATIONS & AMORTISSEMENTS SYSCOHADA */}
      {activeTab === 'immobilisations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {immoNotice && (
            <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{immoNotice}</span>
              <button className="icon-button" onClick={() => setImmoNotice(null)}><X size={16} /></button>
            </div>
          )}

          {/* KPI CARDS IMMOBILISATIONS */}
          {(() => {
            const list = immosQuery.data ?? []
            const totalAcq = list.reduce((sum, i) => sum + Number(i.valeurAcquisitionUsd || 0), 0)
            const totalAmort = list.reduce((sum, i) => sum + Number(i.amortissementCumuleUsd || 0), 0)
            const totalVnc = list.reduce((sum, i) => sum + Number(i.valeurNetteComptableUsd || 0), 0)
            const totalDot = list.reduce((sum, i) => sum + Number(i.dotationAnnuelleUsd || 0), 0)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
                <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Valeur Brute d'Acquisition (Classe 2)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: 'var(--primary)' }}>
                    ${totalAcq.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                  </div>
                  <small style={{ color: 'var(--muted)' }}>{list.length} équipement(s) et actif(s) inventoriés</small>
                </div>

                <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Amortissements Cumulés (Compte 28)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: '#dc2626' }}>
                    -${totalAmort.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                  </div>
                  <small style={{ color: 'var(--muted)' }}>Usure et dépréciation constatée</small>
                </div>

                <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '2px solid #16a34a' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Valeur Nette Comptable (VNC)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0', color: '#16a34a' }}>
                    ${totalVnc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                  </div>
                  <span className="badge badge-success">Patrimoine industriel net</span>
                </div>

                <div className="card" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Dotation Annuelle d'Amortissement</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: '#0284c7' }}>
                    ${totalDot.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD/an
                  </div>
                  <button
                    className="primary-action"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', marginTop: 4 }}
                    onClick={() => {
                      if (confirm(`Passer la dotation annuelle ${annee} aux amortissements (Débit 681 / Crédit 284) ?`)) {
                        passerDotationMutation.mutate()
                      }
                    }}
                    disabled={passerDotationMutation.isPending}
                  >
                    <CheckCircle size={15} /> Passer Dotation {annee}
                  </button>
                </div>
              </div>
            )
          })()}

          {/* TABLE IMMOBILISATIONS */}
          <DataTable
            columns={['Code', 'Désignation Actif', 'Compte', 'Mise en service', 'Durée / Mode', 'Valeur Acquisition', 'Amort. Cumulé', 'VNC Résiduelle', 'Emplacement']}
            loading={immosQuery.isLoading}
            rows={(immosQuery.data ?? []).map((immo: any) => [
              <strong key={'cd-' + immo.id}>{immo.code}</strong>,
              <div key={'nm-' + immo.id}>
                <strong>{immo.nom}</strong>
                <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: '0.72rem' }}>{immo.categorie}</span>
              </div>,
              <code key={'cpt-' + immo.id}>{immo.compteImmo}</code>,
              new Date(immo.dateAcquisition).toLocaleDateString('fr-FR'),
              `${immo.dureeAnnees} ans (${immo.methode})`,
              <strong>${Number(immo.valeurAcquisitionUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>,
              <span key={'am-' + immo.id} style={{ color: '#dc2626' }}>
                -${Number(immo.amortissementCumuleUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </span>,
              <strong key={'vnc-' + immo.id} style={{ color: '#16a34a' }}>
                ${Number(immo.valeurNetteComptableUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </strong>,
              immo.emplacement || 'Usine Goma',
            ])}
            emptyText="Aucune immobilisation enregistrée."
          />
        </div>
      )}

      {/* MODAL : NOUVELLE IMMOBILISATION */}
      {showNewImmoModal && (
        <div className="modal-overlay" onClick={() => setShowNewImmoModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Nouvelle Immobilisation (SYSCOHADA)</h3>
              <button className="icon-button" onClick={() => setShowNewImmoModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '6px 0 14px' }}>
              L'enregistrement génère automatiquement l'écriture comptable d'acquisition Débit 24x / Crédit 521.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addImmoMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label>
                Désignation de l'équipement ou matériel
                <input
                  required
                  placeholder="ex: Broyeur à cylindres 50T/j ou Silo 500T"
                  value={immoNom}
                  onChange={(e) => setImmoNom(e.target.value)}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  Compte Immo SYSCOHADA
                  <select value={immoCompte} onChange={(e) => setImmoCompte(e.target.value)}>
                    <option value="241">241 - Matériel & outillage industriel usine</option>
                    <option value="244">244 - Matériel de bureau & informatique</option>
                    <option value="245">245 - Matériel de transport (Camions)</option>
                    <option value="215">215 - Bâtiments industriels & silos</option>
                  </select>
                </label>
                <label>
                  Durée d'amortissement (ans)
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={immoDuree}
                    onChange={(e) => setImmoDuree(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  Valeur d'acquisition (USD)
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="ex: 35000"
                    value={immoValAcq}
                    onChange={(e) => setImmoValAcq(e.target.value)}
                  />
                </label>
                <label>
                  Emplacement / Affectation
                  <input
                    placeholder="ex: Unité de mouture Halle 1"
                    value={immoEmplacement}
                    onChange={(e) => setImmoEmplacement(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewImmoModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={addImmoMutation.isPending}>
                  <CheckCircle size={18} />
                  {addImmoMutation.isPending ? 'Enregistrement...' : 'Enregistrer et Comptabiliser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVEAU COMPTE PLAN COMPTABLE */}
      {showNewCompteModal && (
        <div className="modal-overlay" onClick={() => setShowNewCompteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Nouveau Compte Comptable OHADA</h3>
              <button className="icon-button" onClick={() => setShowNewCompteModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addCompteMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12, marginTop: 12 }}
            >
              <label>
                Numéro de compte (ex: 6051, 7062)
                <input
                  required
                  value={nouveauNumero}
                  onChange={(e) => setNouveauNumero(e.target.value)}
                  placeholder="ex: 6052"
                />
              </label>

              <label>
                Libellé / Intitulé du compte
                <input
                  required
                  value={nouveauLibelle}
                  onChange={(e) => setNouveauLibelle(e.target.value)}
                  placeholder="ex: Frais de mission et déplacement"
                />
              </label>

              <label>
                Compte parent (Optionnel)
                <select value={compteParent} onChange={(e) => setCompteParent(e.target.value)}>
                  <option value="">Aucun parent direct</option>
                  {planComptable.map((cp) => (
                    <option key={cp.numero} value={cp.numero}>
                      {cp.numero} - {cp.libelle}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewCompteModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={addCompteMutation.isPending}>
                  Enregistrer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : SAISIE D'ÉCRITURE MANUELLE (OD / OPÉRATIONS PARTICULIÈRES) */}
      {showManualEntryModal && (
        <div className="modal-overlay" onClick={() => setShowManualEntryModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Saisie d'Écriture Manuelle (Opérations Diverses - OD)</h3>
              <button className="icon-button" onClick={() => setShowManualEntryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '6px 0 14px' }}>
              Passez vos écritures comptables particulières : dotations aux amortissements, frais bancaires/agios, charges sociales patronales (CNSS/INPP), régularisations d'inventaire ou reports à nouveau.
            </p>

            {manualEntryError && (
              <div className="notice warning" style={{ marginBottom: 12 }}>
                {manualEntryError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!compteDebit || !compteCredit) {
                  setManualEntryError('Veuillez sélectionner un compte à débiter et un compte à créditer.')
                  return
                }
                if (compteDebit === compteCredit) {
                  setManualEntryError('Le compte débité et le compte crédité ne peuvent pas être identiques.')
                  return
                }
                addManualEcritureMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Type d'opération particulière
                  <select
                    value={motifOD}
                    onChange={(e) => {
                      const val = e.target.value
                      setMotifOD(val)
                      if (val === 'AMORTISSEMENT') {
                        setCompteDebit('681')
                        setCompteCredit('281')
                        setLibelleManuel('Dotation aux amortissements matériel et équipement usine')
                      } else if (val === 'FRAIS_BANCAIRE') {
                        setCompteDebit('631')
                        setCompteCredit('521')
                        setLibelleManuel('Frais de tenue de compte et commissions bancaires')
                      } else if (val === 'CHARGES_PATRONALES') {
                        setCompteDebit('664')
                        setCompteCredit('431')
                        setLibelleManuel('Cotisations patronales CNSS / INPP / ONEM')
                      } else if (val === 'REGULARISATION') {
                        setCompteDebit('658')
                        setCompteCredit('401')
                        setLibelleManuel('Régularisation charges exceptionnelles exercice')
                      }
                    }}
                  >
                    <option value="AMORTISSEMENT">Amortissement & Dépréciation</option>
                    <option value="FRAIS_BANCAIRE">Frais & Commissions Bancaires</option>
                    <option value="CHARGES_PATRONALES">Charges Sociales Patronales (CNSS/INPP)</option>
                    <option value="REGULARISATION">Régularisation & Inventaire</option>
                    <option value="AUTRE">Autre écriture particulière</option>
                  </select>
                </label>

                <label>
                  Réf. Pièce Justificative (Obligatoire)
                  <input
                    required
                    value={pieceJustificative}
                    onChange={(e) => setPieceJustificative(e.target.value)}
                    placeholder="ex: FACT-0492, RELEVE-RAW-09, AMORT-2026"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Compte à DÉBITER (Emploi)
                  <select
                    required
                    value={compteDebit}
                    onChange={(e) => setCompteDebit(e.target.value)}
                  >
                    <option value="">Sélectionner compte débit...</option>
                    {planComptable.map((cp) => (
                      <option key={cp.numero + '-deb'} value={cp.numero}>
                        {cp.numero} - {cp.libelle}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Compte à CRÉDITER (Ressource)
                  <select
                    required
                    value={compteCredit}
                    onChange={(e) => setCompteCredit(e.target.value)}
                  >
                    <option value="">Sélectionner compte crédit...</option>
                    {planComptable.map((cp) => (
                      <option key={cp.numero + '-crd'} value={cp.numero}>
                        {cp.numero} - {cp.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <label>
                  Devise
                  <select
                    value={deviseManuelle}
                    onChange={(e) => setDeviseManuelle(e.target.value as 'USD' | 'CDF')}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </label>

                <label>
                  Montant
                  <input
                    required
                    type="number"
                    step="any"
                    min="0.01"
                    value={montantManuel}
                    onChange={(e) => setMontantManuel(e.target.value)}
                    placeholder="ex: 450.00"
                  />
                </label>
              </div>

              <label>
                Libellé explicatif de l'opération
                <input
                  required
                  value={libelleManuel}
                  onChange={(e) => setLibelleManuel(e.target.value)}
                  placeholder="ex: Dotation mensuelle amortissement moulin à maïs n°2"
                />
              </label>

              {/* Aperçu de la partie double */}
              {montantManuel && compteDebit && compteCredit && (
                <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6, fontSize: '0.82rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Contrôle de la partie double (SYSCOHADA) :</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>DÉBIT : Compte {compteDebit} ({planComptable.find((c) => c.numero === compteDebit)?.libelle ?? ''})</span>
                    <strong>+ {money(Number(montantManuel), deviseManuelle)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginTop: 2 }}>
                    <span>CRÉDIT : Compte {compteCredit} ({planComptable.find((c) => c.numero === compteCredit)?.libelle ?? ''})</span>
                    <strong>+ {money(Number(montantManuel), deviseManuelle)}</strong>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Équilibre comptable garanti : Total Débit = Total Crédit (Écart = 0.00)
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowManualEntryModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={addManualEcritureMutation.isPending}>
                  {addManualEcritureMutation.isPending ? 'Enregistrement...' : 'Valider et Passer l Écriture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function ReportingPage() {
  const token = useToken()
  const agenceId = useAppStore((state) => state.session?.agenceId)
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()
  const balancePath = `/api/reporting/export/balance?mois=${month}&annee=${year}${agenceId ? `&agenceId=${agenceId}` : ''}`
  const stockExportPath = `/api/stocks/export/inventaire${agenceId ? `?agenceId=${agenceId}` : ''}`

  const kpisQuery = useQuery({
    queryKey: ['direction-kpis', agenceId],
    queryFn: () =>
      apiRequest<DirectionKpis>(`/api/reporting/direction-kpis${agenceId ? `?agenceId=${agenceId}` : ''}`, { token }),
    enabled: Boolean(token),
  })

  const kpis = kpisQuery.data
  const maxCa = Math.max(...(kpis?.evolutionVentes6Mois.map((m) => m.caUsd) ?? [30000]))

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader
          title="Tableau de Bord Direction Générale & Reporting"
          text="KPIs stratégiques de gestion, rentabilité de mouture, trésorerie nette et documents officiels."
          icon={ChartLineUp}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="secondary-action" href={downloadUrl(balancePath)} target="_blank" rel="noreferrer">
            <FilePdf size={17} /> Balance Générale (PDF)
          </a>
          <a className="primary-action" href={downloadUrl(stockExportPath)} target="_blank" rel="noreferrer">
            <Package size={17} /> Inventaire PMP (PDF)
          </a>
        </div>
      </div>

      {/* CARTES KPIs STRATÉGIQUES DIRECTION */}
      <div className="metric-grid">
        <article className="metric-card">
          <CurrencyCircleDollar size={24} style={{ color: '#16a34a' }} />
          <span>Chiffre d'Affaires Mensuel</span>
          <strong style={{ fontSize: '1.35rem' }}>{money(kpis?.caMoisUsd ?? 0, 'USD')}</strong>
          <small style={{ color: 'var(--muted)' }}>
            + {((kpis?.caMoisCdf ?? 0) / 1000000).toFixed(1)} M CDF
          </small>
        </article>

        <article className="metric-card">
          <TrendUp size={24} style={{ color: '#2563eb' }} />
          <span>Marge Brute Meunerie</span>
          <strong style={{ fontSize: '1.35rem', color: '#16a34a' }}>
            ${kpis?.margeBruteParSacUsd?.toFixed(2) ?? '7.30'} / sac
          </strong>
          <small style={{ color: 'var(--muted)' }}>
            Taux de marge brute : <strong>{kpis?.tauxMargeMoyen ?? 34}%</strong>
          </small>
        </article>

        <article className="metric-card">
          <Package size={24} style={{ color: '#d97706' }} />
          <span>Rendement Mouture Usine</span>
          <strong style={{ fontSize: '1.35rem', color: '#d97706' }}>
            {kpis?.rendementMeunerie ?? 78.4} %
          </strong>
          <small style={{ color: 'var(--muted)' }}>
            Farine extraite / grains traités au moulin
          </small>
        </article>

        <article className="metric-card">
          <Bank size={24} style={{ color: '#9333ea' }} />
          <span>Trésorerie Nette Consolidée</span>
          <strong style={{ fontSize: '1.35rem' }}>
            {money(kpis?.tresorerieNetteConsolideeUsd ?? 0, 'USD')}
          </strong>
          <small style={{ color: 'var(--muted)' }}>
            Banque: {money(kpis?.totalBanqueUsd ?? 0, 'USD')} | Caisse: {money(kpis?.totalCaisseUsd ?? 0, 'USD')}
          </small>
        </article>

        <article className="metric-card">
          <WarningCircle size={24} style={{ color: '#dc2626' }} />
          <span>Créances Clients & Dettes</span>
          <strong style={{ fontSize: '1.35rem' }}>
            {money(kpis?.creancesTotalUsd ?? 0, 'USD')}
          </strong>
          <small style={{ color: '#dc2626' }}>
            dont <strong>{money(kpis?.creancesEchuesUsd ?? 0, 'USD')}</strong> échues (&gt; 30j)
          </small>
        </article>
      </div>

      {/* GRAPHIQUE ÉVOLUTION STRATÉGIQUE SUR 6 MOIS */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Évolution du Chiffre d'Affaires & de la Marge Brute (6 derniers mois)</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Trajectoire de croissance commerciale et marge brute d'exploitation en USD.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
              Chiffre d'Affaires ($)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#16a34a' }} />
              Marge Brute ($)
            </span>
          </div>
        </div>

        <div style={{ height: 190, display: 'flex', alignItems: 'flex-end', gap: 24, padding: '10px 10px 0', borderBottom: '1px solid var(--border)' }}>
          {(kpis?.evolutionVentes6Mois ?? []).map((item) => {
            const hCa = Math.round((item.caUsd / maxCa) * 150)
            const hMarge = Math.round((item.margeUsd / maxCa) * 150)
            return (
              <div key={item.mois} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, width: '100%', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '42%',
                      height: `${Math.max(15, hCa)}px`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                    }}
                    title={`CA: $${item.caUsd.toLocaleString()} USD`}
                  />
                  <div
                    style={{
                      width: '42%',
                      height: `${Math.max(10, hMarge)}px`,
                      background: '#16a34a',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                    }}
                    title={`Marge: $${item.margeUsd.toLocaleString()} USD`}
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {item.mois}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  ${(item.caUsd / 1000).toFixed(1)}k
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RAPPORTS & ÉTATS DE SYNTHÈSE */}
      <h3 style={{ margin: '14px 0 0' }}>Génération & Téléchargement des Documents Légaux</h3>
      <div className="module-grid">
        <a className="capability-card" href={downloadUrl(balancePath)} target="_blank" rel="noreferrer">
          <FilePdf size={25} />
          <strong>Exporter Balance OHADA (PDF)</strong>
          <span>Grand livre en partie double, comptes de résultat et balance bidevise certifiée.</span>
        </a>
        <a className="capability-card" href={downloadUrl(stockExportPath)} target="_blank" rel="noreferrer">
          <Package size={25} />
          <strong>Exporter État des Stocks PMP (PDF)</strong>
          <span>Inventaire valorisé par lot FEFO, DLUO et calcul automatique du coût moyen pondéré.</span>
        </a>
        <Capability
          title="Bordereaux de Livraison (BL)"
          text="Bons d'expédition avec décharges signées et affectation de la flotte de camions."
          icon={Truck}
        />
        <Capability
          title="États de Rapprochement Bancaire"
          text="Relevés Rawbank / Equity rapprochés avec justification comptable des écarts."
          icon={Bank}
        />
      </div>
    </section>
  )
}

function AdminPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'agences' | 'roles' | 'utilisateurs' | 'entreprise' | 'flotte' | 'categories' | 'taux' | 'prix' | 'audit' | 'sauvegardes'
  >('agences')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Agences form states
  const [showNewAgenceModal, setShowNewAgenceModal] = useState(false)
  const [showEditAgenceModal, setShowEditAgenceModal] = useState(false)
  const [editingAgenceId, setEditingAgenceId] = useState<number | null>(null)
  const [newAgenceNom, setNewAgenceNom] = useState('')
  const [newAgenceVille, setNewAgenceVille] = useState('')
  const [newAgenceAdresse, setNewAgenceAdresse] = useState('')
  const [newAgenceEstSiege, setNewAgenceEstSiege] = useState(false)

  const [editAgenceNom, setEditAgenceNom] = useState('')
  const [editAgenceVille, setEditAgenceVille] = useState('')
  const [editAgenceAdresse, setEditAgenceAdresse] = useState('')
  const [editAgenceEstSiege, setEditAgenceEstSiege] = useState(false)

  // Users & Categories form states
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('VENDEUR')
  const [newUserAgenceId, setNewUserAgenceId] = useState(1)

  // Edit User form states
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserRole, setEditUserRole] = useState('VENDEUR')
  const [editUserAgenceId, setEditUserAgenceId] = useState(1)
  const [editUserActif, setEditUserActif] = useState(true)

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')

  // Restauration de Sauvegarde
  const [backupFileContent, setBackupFileContent] = useState<any>(null)
  const [restoreSummary, setRestoreSummary] = useState<any>(null)

  // Attribution de fonctionnalités (RBAC)
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('CHEF_AGENCE')
  const [selectedRolePerms, setSelectedRolePerms] = useState<string[]>([])
  
  // Custom user permissions modal
  const [showUserPermsModal, setShowUserPermsModal] = useState(false)
  const [userPermsTarget, setUserPermsTarget] = useState<any | null>(null)
  const [userPermsSelected, setUserPermsSelected] = useState<string[]>([])

  const rolePermsQuery = useQuery({
    queryKey: ['role-permissions', selectedRoleCode],
    queryFn: () => apiRequest<{ role: string; permissions: string[] }>(`/api/admin/roles/${selectedRoleCode}/permissions`, { token }),
    enabled: Boolean(token && selectedRoleCode),
  })

  useEffect(() => {
    if (rolePermsQuery.data?.permissions) {
      setSelectedRolePerms(rolePermsQuery.data.permissions)
    }
  }, [rolePermsQuery.data])

  const updateRolePermsMutation = useMutation({
    mutationFn: (newPerms: string[]) =>
      apiRequest(`/api/admin/roles/${selectedRoleCode}/permissions`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ permissions: newPerms }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRoleCode] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setActionNotice(data.message || `Habilitations du rôle ${selectedRoleCode} enregistrées avec succès.`)
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la mise à jour des permissions du rôle'),
  })

  const updateUserPermsMutation = useMutation({
    mutationFn: ({ userId, perms }: { userId: number; perms: string[] }) =>
      apiRequest(`/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ permissions: perms }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowUserPermsModal(false)
      setUserPermsTarget(null)
      setActionNotice(data.message || 'Habilitations individuelles de l utilisateur mises à jour avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la mise à jour des permissions de l utilisateur'),
  })

  const restoreMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/admin/backup/restore', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries()
      setActionNotice(data.message || 'Base de données restaurée avec succès.')
      setBackupFileContent(null)
      setRestoreSummary(null)
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la restauration de la sauvegarde'),
  })

  // Entreprise & Mentions Légales
  const entrepriseQuery = useQuery({
    queryKey: ['admin-entreprise'],
    queryFn: () => apiRequest<any>('/api/parametrage/entreprise', { token }),
    enabled: Boolean(token),
  })

  const [formEntreprise, setFormEntreprise] = useState<any>(null)
  useEffect(() => {
    if (entrepriseQuery.data && !formEntreprise) {
      setFormEntreprise(entrepriseQuery.data)
    }
  }, [entrepriseQuery.data, formEntreprise])

  const updateEntrepriseMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/parametrage/entreprise', {
        method: 'PUT',
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entreprise'] })
      setActionNotice('Mentions légales et identité de la société mises à jour avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la mise à jour'),
  })

  // Camions & Flotte
  const flotteQuery = useQuery({
    queryKey: ['admin-flotte'],
    queryFn: () => apiRequest<any[]>('/api/flotte/vehicules', { token }),
    enabled: Boolean(token),
  })

  const [showNewVehiculeModal, setShowNewVehiculeModal] = useState(false)
  const [newVehiculePlaque, setNewVehiculePlaque] = useState('')
  const [newVehiculeModele, setNewVehiculeModele] = useState('')
  const [newVehiculeTonnes, setNewVehiculeTonnes] = useState('15')
  const [newVehiculeSacs, setNewVehiculeSacs] = useState('600')
  const [newVehiculeChauffeur, setNewVehiculeChauffeur] = useState('')
  const [newVehiculeTel, setNewVehiculeTel] = useState('')
  const [newVehiculeAgenceId, setNewVehiculeAgenceId] = useState(1)

  const createVehiculeMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/flotte/vehicules', {
        method: 'POST',
        token,
        body: JSON.stringify({
          plaqueImmatriculation: newVehiculePlaque,
          marqueModele: newVehiculeModele,
          capaciteTonnes: Number(newVehiculeTonnes),
          capaciteSacs: Number(newVehiculeSacs),
          chauffeurNom: newVehiculeChauffeur,
          chauffeurTelephone: newVehiculeTel,
          agenceId: Number(newVehiculeAgenceId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flotte'] })
      setShowNewVehiculeModal(false)
      setNewVehiculePlaque('')
      setNewVehiculeModele('')
      setNewVehiculeChauffeur('')
      setNewVehiculeTel('')
      setActionNotice('Nouveau camion ajouté à la flotte de livraison.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de l ajout'),
  })

  const updateVehiculeStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      apiRequest(`/api/flotte/vehicules/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ statut }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flotte'] })
      setActionNotice('Statut du véhicule mis à jour.')
    },
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest<any[]>('/api/admin/users', { token }),
    enabled: Boolean(token),
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiRequest<any[]>('/api/categories', { token }),
    enabled: Boolean(token),
  })

  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiRequest<RoleUtilisateur[]>('/api/admin/roles', { token }),
    enabled: Boolean(token),
  })

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiRequest<Permission[]>('/api/admin/roles/permissions', { token }),
    enabled: Boolean(token),
  })

  const tauxQuery = useQuery({
    queryKey: ['admin-taux'],
    queryFn: () => apiRequest<any[]>('/api/parametrage/agences/1/taux', { token }),
    enabled: Boolean(token),
  })

  const prixQuery = useQuery({
    queryKey: ['admin-prix'],
    queryFn: () => apiRequest<any[]>('/api/parametrage/articles/prix', { token }),
    enabled: Boolean(token),
  })

  const auditQuery = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => apiRequest<any[]>('/api/audit', { token }),
    enabled: Boolean(token),
  })

  const validerTauxMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/parametrage/taux/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-taux'] })
      queryClient.invalidateQueries({ queryKey: ['taux-actif'] })
      setActionNotice('Nouveau taux de change approuvé et appliqué pour l agence.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la validation du taux'),
  })

  const validerPrixMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/parametrage/articles/prix/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prix'] })
      setActionNotice('Prix d agence validé et activé pour la facturation POS.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la validation du prix'),
  })

  const createUserMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newUserName,
          email: newUserEmail,
          role: newUserRole,
          agenceId: Number(newUserAgenceId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowNewUserModal(false)
      setNewUserName('')
      setNewUserEmail('')
      setActionNotice('Compte utilisateur créé avec succès et affecté à l agence.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la création de l utilisateur'),
  })

  const updateUserMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/users/${editingUserId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          nom: editUserName,
          email: editUserEmail,
          role: editUserRole,
          agenceId: Number(editUserAgenceId),
          actif: editUserActif,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowEditUserModal(false)
      setActionNotice('Compte utilisateur modifié avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la modification de l utilisateur'),
  })

  const toggleUserStatutMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}/toggle-statut`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setActionNotice('Statut du compte utilisateur mis à jour.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors du changement de statut'),
  })

  const createAgenceMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/agences', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newAgenceNom,
          ville: newAgenceVille,
          adresse: newAgenceAdresse,
          estSiege: newAgenceEstSiege,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agences'] })
      setShowNewAgenceModal(false)
      setNewAgenceNom('')
      setNewAgenceVille('')
      setNewAgenceAdresse('')
      setNewAgenceEstSiege(false)
      setActionNotice('Nouvelle agence créée avec succès. Caisse comptoir et stocks initialisés.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la création de l agence'),
  })

  const updateAgenceMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/agences/${editingAgenceId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          nom: editAgenceNom,
          ville: editAgenceVille,
          adresse: editAgenceAdresse,
          estSiege: editAgenceEstSiege,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agences'] })
      setShowEditAgenceModal(false)
      setActionNotice('Coordonnées de l agence mises à jour avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la modification de l agence'),
  })

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/categories', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newCategoryName,
          description: newCategoryDesc,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setShowNewCategoryModal(false)
      setNewCategoryName('')
      setNewCategoryDesc('')
      setActionNotice('Catégorie d articles créée avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la création de la catégorie'),
  })

  return (
    <section className="page-grid">
      <ModuleHeader
        title="Administration et Contrôle Siège"
        text="Gouvernance des accès, gestion des utilisateurs, validation des taux et prix d agence."
        icon={ShieldCheck}
      />

      {actionNotice && (
        <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
          <span>{actionNotice}</span>
          <button className="icon-button" onClick={() => setActionNotice(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'agences' && 'active')} onClick={() => setActiveTab('agences')}>
          <Buildings size={17} /> Agences & Succursales ({agencesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'roles' && 'active')} onClick={() => setActiveTab('roles')}>
          <ShieldCheck size={17} /> Rôles et Permissions
        </button>
        <button className={clsx('tab-button', activeTab === 'utilisateurs' && 'active')} onClick={() => setActiveTab('utilisateurs')}>
          <UsersThree size={17} /> Utilisateurs Agences ({usersQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'entreprise' && 'active')} onClick={() => setActiveTab('entreprise')}>
          <Buildings size={17} /> Mentions Légales & Société
        </button>
        <button className={clsx('tab-button', activeTab === 'flotte' && 'active')} onClick={() => setActiveTab('flotte')}>
          <Truck size={17} /> Camions & Flotte ({flotteQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'categories' && 'active')} onClick={() => setActiveTab('categories')}>
          <Package size={17} /> Catégories & Services ({categoriesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'taux' && 'active')} onClick={() => setActiveTab('taux')}>
          <CurrencyCircleDollar size={17} /> Validation Taux du jour
        </button>
        <button className={clsx('tab-button', activeTab === 'prix' && 'active')} onClick={() => setActiveTab('prix')}>
          <Package size={17} /> Validation Prix par agence
        </button>
        <button className={clsx('tab-button', activeTab === 'audit' && 'active')} onClick={() => setActiveTab('audit')}>
          <ClockCounterClockwise size={17} /> Journal d Audit
        </button>
        <button className={clsx('tab-button', activeTab === 'sauvegardes' && 'active')} onClick={() => setActiveTab('sauvegardes')}>
          <FloppyDisk size={17} /> Sauvegardes & Exports
        </button>
      </div>

      {activeTab === 'agences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>Réseau d'Agences & Succursales Commerciales</h3>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.88rem' }}>
                Gestion multi-sites : usine de mouture, dépôts régionaux, comptoirs et succursales de distribution.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewAgenceModal(true)}>
              <Buildings size={18} /> Nouvelle Agence / Succursale
            </button>
          </div>
          <DataTable
            columns={['Code / ID', 'Nom de l agence', 'Ville', 'Adresse physique', 'Statut / Vocation', 'Actions']}
            loading={agencesQuery.isLoading}
            rows={(agencesQuery.data ?? []).map((ag: any) => [
              <strong>AG-{ag.id}</strong>,
              ag.nom,
              ag.ville,
              ag.adresse,
              ag.estSiege ? (
                <span key={ag.id + '-stat'} className="badge badge-success">Siège Principal / Minoterie</span>
              ) : (
                <span key={ag.id + '-stat'} className="badge">Succursale Commerciale / Dépôt</span>
              ),
              <button
                key={ag.id + '-edit'}
                className="secondary-action"
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                onClick={() => {
                  setEditingAgenceId(ag.id)
                  setEditAgenceNom(ag.nom)
                  setEditAgenceVille(ag.ville)
                  setEditAgenceAdresse(ag.adresse)
                  setEditAgenceEstSiege(Boolean(ag.estSiege))
                  setShowEditAgenceModal(true)
                }}
                title="Modifier les coordonnées de cette agence"
              >
                <PencilSimple size={15} /> Modifier
              </button>,
            ])}
            emptyText="Aucune agence enregistrée."
          />
        </div>
      )}

      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* EN-TETE DE GOUVERNANCE RBAC */}
          <div style={{ background: 'var(--panel-bg)', padding: '16px 20px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="var(--primary)" />
                Matrice des Habilitations & Attribution des Fonctionnalités (RBAC)
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
                Sélectionnez un rôle pour configurer les modules et permissions autorisés. Les modifications s'appliquent immédiatement à tous les collaborateurs détenant ce rôle.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  const allCodes = (permissionsQuery.data ?? []).map((p: any) => p.code)
                  setSelectedRolePerms(allCodes)
                }}
                title="Accorder toutes les fonctionnalités à ce rôle"
              >
                Tout Cocher
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setSelectedRolePerms([])}
                title="Retirer toutes les fonctionnalités de ce rôle"
              >
                Tout Décocher
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={updateRolePermsMutation.isPending}
                onClick={() => updateRolePermsMutation.mutate(selectedRolePerms)}
                style={{ background: '#16a34a' }}
              >
                <CheckCircle size={18} />
                {updateRolePermsMutation.isPending ? 'Enregistrement...' : `Enregistrer les Habilitations (${selectedRolePerms.length})`}
              </button>
            </div>
          </div>

          {/* SELECTEUR DE ROLES */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              Sélectionnez le rôle à configurer :
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              {(rolesQuery.data ?? []).map((r) => {
                const userCount = (usersQuery.data ?? []).filter((u: any) => u.role === r.code).length
                const isSelected = selectedRoleCode === r.code
                return (
                  <div
                    key={r.code}
                    onClick={() => setSelectedRoleCode(r.code)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--surface-2)' : 'var(--panel-bg)',
                      boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--primary)' : 'inherit' }}>{r.nom}</strong>
                      <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{userCount} collab.</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                      <code>{r.code}</code>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MATRICE DES FONCTIONNALITES PAR MODULE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
            {(() => {
              const allPerms = permissionsQuery.data ?? []
              const grouped: Record<string, typeof allPerms> = {}
              allPerms.forEach((p: any) => {
                const mod = p.module || 'Général'
                if (!grouped[mod]) grouped[mod] = []
                grouped[mod].push(p)
              })

              return Object.entries(grouped).map(([modName, perms]) => {
                const activeCount = perms.filter((p: any) => selectedRolePerms.includes(p.code)).length
                const allActive = activeCount === perms.length

                return (
                  <div
                    key={modName}
                    style={{
                      background: 'var(--panel-bg)',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{modName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {activeCount} / {perms.length} active(s)
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                        onClick={() => {
                          if (allActive) {
                            setSelectedRolePerms(selectedRolePerms.filter((c) => !perms.some((p: any) => p.code === c)))
                          } else {
                            const newSet = new Set([...selectedRolePerms, ...perms.map((p: any) => p.code)])
                            setSelectedRolePerms(Array.from(newSet))
                          }
                        }}
                      >
                        {allActive ? 'Désactiver tout' : 'Activer tout'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {perms.map((p: any) => {
                        const isChecked = selectedRolePerms.includes(p.code)
                        return (
                          <label
                            key={p.code}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: 6,
                              background: isChecked ? 'var(--surface-2)' : 'transparent',
                              border: isChecked ? '1px solid var(--border)' : '1px solid transparent',
                              fontSize: '0.84rem',
                              margin: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRolePerms([...selectedRolePerms, p.code])
                                } else {
                                  setSelectedRolePerms(selectedRolePerms.filter((c) => c !== p.code))
                                }
                              }}
                              style={{ width: 17, height: 17, marginTop: 2 }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: isChecked ? 600 : 400 }}>{p.libelle || p.code}</div>
                              <code style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{p.code}</code>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {activeTab === 'utilisateurs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Affectation stricte des comptes aux agences selon la matrice de contrôle interne.
            </p>
            <button className="primary-action" onClick={() => setShowNewUserModal(true)}>
              <UserPlus size={18} /> Créer un Utilisateur
            </button>
          </div>
          <DataTable
            columns={['Nom & Prénom', 'Email / Identifiant', 'Rôle système', 'Agence rattachée', 'Statut', 'Actions']}
            loading={usersQuery.isLoading}
            rows={(usersQuery.data ?? []).map((u: any) => [
              <strong>{u.nom}</strong>,
              u.email,
              <code>{u.role}</code>,
              u.agence?.nom ?? `Agence #${u.agenceId}`,
              <span
                key={u.id + '-stat'}
                className={clsx('badge', u.actif !== false ? 'badge-success' : 'badge-danger')}
              >
                {u.actif !== false ? 'Actif' : 'Inactif / Bloqué'}
              </span>,
              <div key={u.id + '-actions'} style={{ display: 'flex', gap: 6 }}>
                <button
                  className="secondary-action"
                  style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setEditingUserId(u.id)
                    setEditUserName(u.nom)
                    setEditUserEmail(u.email)
                    setEditUserRole(u.role)
                    setEditUserAgenceId(u.agenceId || 1)
                    setEditUserActif(u.actif !== false)
                    setShowEditUserModal(true)
                  }}
                  title="Modifier les informations de cet utilisateur"
                >
                  <PencilSimple size={15} /> Modifier
                </button>
                <button
                  className={u.actif !== false ? 'secondary-action' : 'primary-action'}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    color: u.actif !== false ? '#dc2626' : undefined,
                    borderColor: u.actif !== false ? '#fca5a5' : undefined,
                  }}
                  onClick={() => toggleUserStatutMutation.mutate(u.id)}
                  title={u.actif !== false ? 'Désactiver / suspendre le compte' : 'Réactiver le compte'}
                >
                  {u.actif !== false ? 'Suspendre' : 'Activer'}
                </button>
              </div>,
            ])}
            emptyText="Aucun utilisateur enregistré."
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Familles de produits, matières premières de minoterie et prestations de services.
            </p>
            <button className="primary-action" onClick={() => setShowNewCategoryModal(true)}>
              <Plus size={18} /> Ajouter une Catégorie
            </button>
          </div>
          <DataTable
            columns={['Code / ID', 'Nom de la catégorie', 'Description technique']}
            loading={categoriesQuery.isLoading}
            rows={(categoriesQuery.data ?? []).map((c: any) => [
              <strong>CAT-{c.id}</strong>,
              c.nom,
              c.description || '-',
            ])}
            emptyText="Aucune catégorie enregistrée."
          />
        </div>
      )}

      {activeTab === 'taux' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
            <strong>Règle de conversion :</strong> Les chefs d agence proposent les ajustements de parité locale USD/CDF. Tant que la Direction Siège n a pas validé la proposition, l agence continue obligatoirement d appliquer le dernier taux homologué en vigueur.
          </div>
          <DataTable
            columns={['Date proposition', 'Agence', 'Taux proposé', 'Proposé par', 'Statut', 'État en vigueur', 'Action']}
            loading={tauxQuery.isLoading}
            rows={(tauxQuery.data ?? []).map((t: any) => [
              t.dateDebut ? new Date(t.dateDebut).toLocaleDateString() : '-',
              'Agence Goma',
              <strong>1 USD = {t.taux} CDF</strong>,
              t.proposePar ?? 'Chef d agence',
              <span className={clsx('badge', t.statut === 'VALIDE' ? 'badge-success' : 'badge-warning')}>
                {t.statut === 'VALIDE' ? 'Validé par le siège' : 'Proposition en attente'}
              </span>,
              t.actif ? <span className="badge badge-success">Actif en caisse</span> : <span className="badge">Inactif</span>,
              t.statut === 'PROPOSE' ? (
                <button
                  className="primary-action"
                  style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                  onClick={() => validerTauxMutation.mutate(t.id)}
                >
                  Approuver ce taux
                </button>
              ) : (
                <span>Validé</span>
              ),
            ])}
            emptyText="Aucun historique de taux."
          />
        </div>
      )}

      {activeTab === 'prix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
            <strong>Règle de tarification :</strong> Les agences soumettent leurs tarifs spécifiques (tenant compte du transport et de la concurrence locale). Seul le Siège a autorité pour rendre un prix effectif au terminal de vente (POS).
          </div>
          <DataTable
            columns={['Article', 'Agence', 'Prix proposé', 'Proposé par', 'Statut', 'Action']}
            loading={prixQuery.isLoading}
            rows={(prixQuery.data ?? []).map((p: any) => [
              p.article?.designation ?? `Article #${p.articleId}`,
              p.agence?.nom ?? 'Agence locale',
              <strong>{p.prix} {p.devise}</strong>,
              p.proposePar ?? 'Chef d agence',
              <span className={clsx('badge', p.statut === 'VALIDE' ? 'badge-success' : 'badge-warning')}>
                {p.statut === 'VALIDE' ? 'Validé' : 'Proposé'}
              </span>,
              p.statut === 'PROPOSE' ? (
                <button
                  className="primary-action"
                  style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                  onClick={() => validerPrixMutation.mutate(p.id)}
                >
                  Valider tarif
                </button>
              ) : (
                <span>En vigueur</span>
              ),
            ])}
            emptyText="Aucun tarif d agence enregistré."
          />
        </div>
      )}

      {activeTab === 'entreprise' && formEntreprise && (
        <div className="panel" style={{ background: 'var(--surface)', padding: 24, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Identité de la Société & Mentions Légales</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Ces données sont appliquées dynamiquement sur les Factures A4, Reçus thermiques, Bordereaux de livraison et Balances comptables.
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateEntrepriseMutation.mutate(formEntreprise)
            }}
            style={{ display: 'grid', gap: 16 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label>
                Nom / Raison Sociale officielle
                <input
                  value={formEntreprise.nomSociete || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, nomSociete: e.target.value })}
                  required
                />
              </label>
              <label>
                Slogan / Activité principale
                <input
                  value={formEntreprise.slogan || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, slogan: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <label>
                Numéro RCCM (Registre du Commerce)
                <input
                  value={formEntreprise.rccm || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, rccm: e.target.value })}
                  placeholder="ex: CD/GOM/RCCM/21-B-00452"
                  required
                />
              </label>
              <label>
                Identification Nationale (ID. NAT)
                <input
                  value={formEntreprise.idNat || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, idNat: e.target.value })}
                  placeholder="ex: 01-83-N12457K"
                  required
                />
              </label>
              <label>
                Numéro d Impôt / NIF
                <input
                  value={formEntreprise.nif || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, nif: e.target.value })}
                  placeholder="ex: A2189410F"
                  required
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
              <label>
                Adresse complète du Siège Social
                <input
                  value={formEntreprise.siegeAdresse || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, siegeAdresse: e.target.value })}
                  required
                />
              </label>
              <label>
                Téléphone(s) officiels
                <input
                  value={formEntreprise.telephone || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, telephone: e.target.value })}
                  required
                />
              </label>
              <label>
                Email de contact
                <input
                  type="email"
                  value={formEntreprise.emailContact || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, emailContact: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label>
                Mentions au pied des Factures (Garantie / Conditions)
                <textarea
                  rows={2}
                  value={formEntreprise.mentionsPiedFacture || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, mentionsPiedFacture: e.target.value })}
                />
              </label>
              <label>
                Conditions au pied du Bordereau de Livraison (Agréage transport)
                <textarea
                  rows={2}
                  value={formEntreprise.mentionsPiedLivraison || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, mentionsPiedLivraison: e.target.value })}
                />
              </label>
            </div>

            <div style={{ padding: 14, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', marginTop: 10 }}>
              <div>
                <label style={{ margin: 0, fontWeight: 700 }}>Logo Officiel de l'Entreprise / Minoterie</label>
                <p style={{ margin: '4px 0 10px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Ce logo apparaîtra en haut de tous les documents officiels imprimables (Factures A4, Tickets thermiques, Bons de livraison, Fiches d'inventaire, Bulletins de paie, Grand Livre).
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const base64 = ev.target?.result as string
                          setFormEntreprise({ ...formEntreprise, logoUrl: base64 })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  {formEntreprise.logoUrl && (
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => setFormEntreprise({ ...formEntreprise, logoUrl: '' })}
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
              <div style={{ width: 120, height: 70, border: '1px dashed var(--border)', borderRadius: 6, display: 'grid', placeItems: 'center', background: '#fff', overflow: 'hidden' }}>
                {formEntreprise.logoUrl ? (
                  <img src={formEntreprise.logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 110, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>Aucun logo</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="primary-action" type="submit" disabled={updateEntrepriseMutation.isPending}>
                <CheckCircle size={18} />
                {updateEntrepriseMutation.isPending ? 'Enregistrement...' : 'Enregistrer les Mentions Légales'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'flotte' && (
        <div className="page-grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Flotte de Camions & Logistique Minoterie</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Suivi des véhicules de transport, chauffeurs attitrés et affectation sur les bordereaux de livraison.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewVehiculeModal(true)}>
              <Truck size={18} /> Nouveau Camion
            </button>
          </div>

          <DataTable
            columns={['Plaque', 'Modèle & Marque', 'Capacité (T / Sacs)', 'Chauffeur Attitré', 'Agence', 'Statut', 'Actions']}
            loading={flotteQuery.isLoading}
            rows={(flotteQuery.data ?? []).map((v: any) => [
              <strong key={'plk-' + v.id}>{v.plaqueImmatriculation}</strong>,
              v.marqueModele,
              `${v.capaciteTonnes} T (${v.capaciteSacs} sacs)`,
              <span key={'chf-' + v.id}>{v.chauffeurNom} {v.chauffeurTelephone ? <small style={{ color: 'var(--muted)' }}>({v.chauffeurTelephone})</small> : ''}</span>,
              v.agence?.nom ?? `Agence #${v.agenceId}`,
              <span key={'st-' + v.id} className={clsx('badge', v.statut === 'DISPONIBLE' ? 'badge-success' : v.statut === 'EN_COURSE' ? 'badge-warning' : 'badge-danger')}>
                {v.statut === 'DISPONIBLE' ? 'Disponible' : v.statut === 'EN_COURSE' ? 'En course' : 'Maintenance'}
              </span>,
              <select
                key={'sel-' + v.id}
                style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                value={v.statut}
                onChange={(e) => updateVehiculeStatutMutation.mutate({ id: v.id, statut: e.target.value })}
              >
                <option value="DISPONIBLE">Disponible</option>
                <option value="EN_COURSE">En course</option>
                <option value="EN_MAINTENANCE">Maintenance</option>
              </select>,
            ])}
            emptyText="Aucun véhicule de transport enregistré."
          />
        </div>
      )}

      {activeTab === 'audit' && (
        <DataTable
          columns={['Horodatage', 'Utilisateur', 'Opération / Action', 'Détails de traçabilité']}
          loading={auditQuery.isLoading}
          rows={(auditQuery.data ?? []).map((a: any) => [
            new Date(a.dateHeure).toLocaleTimeString() + ' ' + new Date(a.dateHeure).toLocaleDateString(),
            <strong>{a.utilisateur}</strong>,
            <code>{a.action}</code>,
            a.details,
          ])}
          emptyText="Aucun événement d audit consigné."
        />
      )}

      {activeTab === 'sauvegardes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18, background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FloppyDisk size={22} color="var(--primary)" />
              Sauvegarde Globale du Système (Backup Intégral JSON)
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Téléchargez une archive complète chiffrée contenant toutes les données de l'entreprise : agences, collaborateurs, stocks des moulins et dépôts, écritures comptables OHADA, ventes, achats, paie et journal d'audit.
            </p>
            <a
              href="/api/admin/backup/export"
              target="_blank"
              rel="noreferrer"
              className="primary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <DownloadSimple size={18} /> Télécharger l'Archive Complète de Sauvegarde (.JSON)
            </a>
          </div>

          <div className="card" style={{ padding: 18, background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowDownLeft size={22} color="#16a34a" />
              Restaurer une Sauvegarde Système (.JSON)
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Sélectionnez un fichier JSON de sauvegarde préalablement exporté. Cette opération réinjectera l'ensemble des données d'exploitation (agences, articles, stocks, écritures OHADA, ventes, achats, camions).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      try {
                        const parsed = JSON.parse(ev.target?.result as string)
                        setBackupFileContent(parsed)
                        setRestoreSummary({
                          agences: parsed.agences?.length ?? 0,
                          articles: parsed.articles?.length ?? 0,
                          stocks: parsed.stocksAgence?.length ?? 0,
                          ecritures: parsed.ecrituresComptables?.length ?? 0,
                          ventes: parsed.ventes?.length ?? 0,
                          achats: parsed.achats?.length ?? 0,
                          dateExport: parsed.metadata?.dateExport ?? 'Inconnue',
                        })
                      } catch {
                        alert('Le fichier sélectionné n est pas un fichier JSON valide.')
                      }
                    }
                    reader.readAsText(file)
                  }
                }}
              />
              {restoreSummary && (
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <strong>Aperçu du contenu à restaurer :</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
                    <div>Agences : <strong>{restoreSummary.agences}</strong></div>
                    <div>Articles : <strong>{restoreSummary.articles}</strong></div>
                    <div>Lignes de stock : <strong>{restoreSummary.stocks}</strong></div>
                    <div>Écritures OHADA : <strong>{restoreSummary.ecritures}</strong></div>
                    <div>Ventes : <strong>{restoreSummary.ventes}</strong></div>
                    <div>Achats : <strong>{restoreSummary.achats}</strong></div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="primary-action"
                      style={{ background: '#16a34a' }}
                      disabled={restoreMutation.isPending}
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) {
                          restoreMutation.mutate(backupFileContent)
                        }
                      }}
                    >
                      <CheckCircle size={18} />
                      {restoreMutation.isPending ? 'Restauration en cours...' : 'Confirmer la Restauration des Données'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 18, background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <DownloadSimple size={22} color="var(--primary)" />
              Exports Tabulaires (.CSV pour Excel)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--muted)' }}>
              Exportez les données métiers spécifiques en fichiers CSV avec encodage UTF-8 prêt pour Microsoft Excel.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <strong>Journal des Ventes</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 10px' }}>Toutes les factures, comptant et crédit</p>
                <a href="/api/admin/export/csv/ventes" target="_blank" rel="noreferrer" className="secondary-action" style={{ fontSize: '0.82rem', textDecoration: 'none' }}>
                  <DownloadSimple size={16} /> Exporter Ventes (.CSV)
                </a>
              </div>
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <strong>Inventaire des Stocks</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 10px' }}>Quantités, lots, DLUO et valorisations</p>
                <a href="/api/admin/export/csv/stocks" target="_blank" rel="noreferrer" className="secondary-action" style={{ fontSize: '0.82rem', textDecoration: 'none' }}>
                  <DownloadSimple size={16} /> Exporter Stocks (.CSV)
                </a>
              </div>
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <strong>Écritures & Grand Livre</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 10px' }}>Mouvements comptables Débit/Crédit</p>
                <a href="/api/admin/export/csv/ecritures" target="_blank" rel="noreferrer" className="secondary-action" style={{ fontSize: '0.82rem', textDecoration: 'none' }}>
                  <DownloadSimple size={16} /> Exporter Écritures (.CSV)
                </a>
              </div>
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <strong>Journal d'Audit Système</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 10px' }}>Traçabilité des opérations et connexions</p>
                <a href="/api/admin/export/csv/audit" target="_blank" rel="noreferrer" className="secondary-action" style={{ fontSize: '0.82rem', textDecoration: 'none' }}>
                  <DownloadSimple size={16} /> Exporter Audit (.CSV)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE AGENCE */}
      {showNewAgenceModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ouvrir une nouvelle agence / succursale</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              La création d une agence initialise automatiquement sa caisse comptoir principale, son taux de change et ses stocks d articles.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createAgenceMutation.mutate(); }}>
              <label>
                Nom de l agence / succursale
                <input
                  value={newAgenceNom}
                  onChange={(e) => setNewAgenceNom(e.target.value)}
                  placeholder="ex: Succursale Butembo ou Dépôt Minoterie Bukavu"
                  required
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Ville d implantation
                  <input
                    value={newAgenceVille}
                    onChange={(e) => setNewAgenceVille(e.target.value)}
                    placeholder="ex: Butembo, Bukavu, Kinshasa, Beni"
                    required
                  />
                </label>
                <label>
                  Adresse physique
                  <input
                    value={newAgenceAdresse}
                    onChange={(e) => setNewAgenceAdresse(e.target.value)}
                    placeholder="ex: Boulevard Président Mobutu N° 45"
                  />
                </label>
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={newAgenceEstSiege}
                    onChange={(e) => setNewAgenceEstSiege(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Définir comme Siège Principal / Site Minoterie Centrale</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAgenceModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAgenceMutation.isPending}>
                  {createAgenceMutation.isPending ? 'Création...' : 'Créer et Initialiser l Agence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER AGENCE */}
      {showEditAgenceModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Modifier les coordonnées de l agence</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Mise à jour du libellé, de la localisation géographique et de la vocation du site.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); updateAgenceMutation.mutate(); }}>
              <label>
                Nom de l agence / succursale
                <input
                  value={editAgenceNom}
                  onChange={(e) => setEditAgenceNom(e.target.value)}
                  placeholder="ex: Succursale Butembo"
                  required
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Ville d implantation
                  <input
                    value={editAgenceVille}
                    onChange={(e) => setEditAgenceVille(e.target.value)}
                    placeholder="ex: Butembo"
                    required
                  />
                </label>
                <label>
                  Adresse physique
                  <input
                    value={editAgenceAdresse}
                    onChange={(e) => setEditAgenceAdresse(e.target.value)}
                    placeholder="ex: Avenue du Commerce N° 12"
                  />
                </label>
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={editAgenceEstSiege}
                    onChange={(e) => setEditAgenceEstSiege(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Siège Principal / Minoterie Centrale</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowEditAgenceModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={updateAgenceMutation.isPending}>
                  {updateAgenceMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEL UTILISATEUR */}
      {showNewUserModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Créer un compte collaborateur</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Affectation stricte de l agence et des permissions selon le profil métier.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(); }}>
              <label>
                Nom complet
                <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="ex: Jean Kasereka" required />
              </label>
              <label style={{ marginTop: 12 }}>
                Adresse email professionnelle
                <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="ex: j.kasereka@mvg.cd" required />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Rôle système
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="VENDEUR">Vendeur / Commercial</option>
                    <option value="CAISSIER">Caissier</option>
                    <option value="MAGASINIER">Magasinier</option>
                    <option value="CHEF_AGENCE">Chef d Agence</option>
                    <option value="COMPTABLE">Comptable</option>
                    <option value="COMPTABLE_SENIOR">Comptable Senior</option>
                    <option value="PRODUCTION">Chef Production</option>
                    <option value="ADMIN_SIEGE">Administrateur Siège</option>
                  </select>
                </label>
                <label>
                  Agence rattachée
                  <select value={newUserAgenceId} onChange={(e) => setNewUserAgenceId(Number(e.target.value))}>
                    {(agencesQuery.data ?? []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>{ag.nom} ({ag.ville})</option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewUserModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Création...' : 'Créer l utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER UTILISATEUR */}
      {showEditUserModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Modifier le compte collaborateur</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Mise à jour des informations, du rôle système, de l agence d affectation et du statut d accès.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); updateUserMutation.mutate(); }}>
              <label>
                Nom complet
                <input value={editUserName} onChange={(e) => setEditUserName(e.target.value)} placeholder="ex: Jean Kasereka" required />
              </label>
              <label style={{ marginTop: 12 }}>
                Adresse email professionnelle
                <input type="email" value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} placeholder="ex: j.kasereka@mvg.cd" required />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Rôle système
                  <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)}>
                    <option value="VENDEUR">Vendeur / Commercial</option>
                    <option value="CAISSIER">Caissier</option>
                    <option value="MAGASINIER">Magasinier</option>
                    <option value="CHEF_AGENCE">Chef d Agence</option>
                    <option value="COMPTABLE">Comptable</option>
                    <option value="COMPTABLE_SENIOR">Comptable Senior</option>
                    <option value="PRODUCTION">Chef Production</option>
                    <option value="ADMIN_SIEGE">Administrateur Siège</option>
                    <option value="SUPER_ADMIN">Super Administrateur</option>
                  </select>
                </label>
                <label>
                  Agence rattachée
                  <select value={editUserAgenceId} onChange={(e) => setEditUserAgenceId(Number(e.target.value))}>
                    {(agencesQuery.data ?? []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>{ag.nom} ({ag.ville})</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 16, padding: '12px', background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={editUserActif}
                    onChange={(e) => setEditUserActif(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Compte actif (autorisé à se connecter au système)</span>
                </label>
                <p style={{ margin: '4px 0 0 28px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {editUserActif ? 'L utilisateur peut se connecter normalement.' : 'L accès est immédiatement bloqué pour cet utilisateur.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowEditUserModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE CATEGORIE */}
      {showNewCategoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ajouter une catégorie</h3>
            <form onSubmit={(e) => { e.preventDefault(); createCategoryMutation.mutate(); }}>
              <label>
                Nom de la catégorie
                <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="ex: Emballages Industriels" required />
              </label>
              <label style={{ marginTop: 12 }}>
                Description
                <input value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} placeholder="ex: Sacs de conditionnement kraft et polypropylène" />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewCategoryModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? 'Enregistrement...' : 'Ajouter catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU CAMION */}
      {showNewVehiculeModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Ajouter un camion à la flotte</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '4px 0 16px' }}>
              Véhicule de livraison et logistique inter-agences pour les cargaisons de farine.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createVehiculeMutation.mutate(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  Plaque d immatriculation
                  <input value={newVehiculePlaque} onChange={(e) => setNewVehiculePlaque(e.target.value)} placeholder="ex: 4512AB/19" required />
                </label>
                <label>
                  Marque & Modèle
                  <input value={newVehiculeModele} onChange={(e) => setNewVehiculeModele(e.target.value)} placeholder="ex: Mitsubishi Fuso (10T)" required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Capacité en Tonnes
                  <input type="number" value={newVehiculeTonnes} onChange={(e) => setNewVehiculeTonnes(e.target.value)} required />
                </label>
                <label>
                  Capacité en Sacs (25kg)
                  <input type="number" value={newVehiculeSacs} onChange={(e) => setNewVehiculeSacs(e.target.value)} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Nom du Chauffeur
                  <input value={newVehiculeChauffeur} onChange={(e) => setNewVehiculeChauffeur(e.target.value)} placeholder="ex: Bahati Kasereka" required />
                </label>
                <label>
                  Téléphone du Chauffeur
                  <input value={newVehiculeTel} onChange={(e) => setNewVehiculeTel(e.target.value)} placeholder="ex: +243 999 123 456" />
                </label>
              </div>
              <label style={{ marginTop: 12 }}>
                Agence de rattachement
                <select value={newVehiculeAgenceId} onChange={(e) => setNewVehiculeAgenceId(Number(e.target.value))}>
                  {(agencesQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.nom} ({ag.ville})</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewVehiculeModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createVehiculeMutation.isPending}>
                  {createVehiculeMutation.isPending ? 'Ajout...' : 'Ajouter le camion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function SyncPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const [localOperations, setLocalOperations] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['sync-operations'],
    queryFn: () => apiRequest<SyncOperation[]>('/api/sync/operations', { token }),
    enabled: Boolean(token),
  })

  const refreshLocalCount = () => {
    listOfflineOperations().then((operations) => setLocalOperations(operations.length))
  }

  useEffect(() => {
    refreshLocalCount()
  }, [])

  const handleManualSync = async () => {
    setIsSyncing(true)
    setSyncFeedback(null)
    try {
      const res = await syncPendingOperations(token)
      refreshLocalCount()
      queryClient.invalidateQueries({ queryKey: ['sync-operations'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      if (res.synces > 0) {
        setSyncFeedback(`${res.synces} opération(s) synchronisée(s) avec succès.`)
      } else if (res.echecs > 0) {
        setSyncFeedback(`Échec sur ${res.echecs} opération(s).`)
      } else {
        setSyncFeedback('Aucune opération en attente dans la file locale.')
      }
    } catch (e: any) {
      setSyncFeedback(e.message || 'Erreur lors de la synchronisation')
    } finally {
      setIsSyncing(false)
    }
  }

  const stocksNegatifs = data?.filter((op) => op.stockNegatifSignale) ?? []

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader title="Synchronisation offline" text="Suivi des ventes terrain, conflits, stocks négatifs et régularisations." icon={ArrowsClockwise} />
        <button
          className="primary-action"
          onClick={handleManualSync}
          disabled={isSyncing}
        >
          <ArrowsClockwise size={18} className={clsx(isSyncing && 'animate-spin')} />
          {isSyncing ? 'Synchronisation en cours...' : 'Synchroniser la file locale'}
        </button>
      </div>

      {syncFeedback && (
        <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
          <span>{syncFeedback}</span>
        </div>
      )}

      {stocksNegatifs.length > 0 && (
        <div className="notice warning" style={{ padding: 12, borderRadius: 8 }}>
          <strong>Alerte Régularisation Chef d Agence :</strong> {stocksNegatifs.length} vente(s) ont été acceptées avec un stock déficitaire lors du retour en ligne. Un inventaire physique de régularisation est requis.
        </div>
      )}

      <div className="metric-grid">
        <article className="metric-card"><WifiSlash size={23} /><span>File locale (IndexedDB)</span><strong>{localOperations}</strong></article>
        <article className="metric-card"><ArrowsClockwise size={23} /><span>Opérations Serveur</span><strong>{data?.length ?? 0}</strong></article>
        <article className="metric-card"><WarningCircle size={23} /><span>Stocks négatifs signalés</span><strong style={{ color: stocksNegatifs.length > 0 ? 'var(--danger)' : 'inherit' }}>{stocksNegatifs.length}</strong></article>
      </div>
      <DataTable
        columns={['Opération', 'Type', 'Statut', 'Détails & Messages', 'Date Réception']}
        rows={(data ?? []).map((operation) => [
          operation.clientOperationId,
          operation.typeOperation,
          <span key={operation.id + '-stat'} className={clsx('badge', operation.stockNegatifSignale ? 'badge-warning' : 'badge-success')}>
            {operation.statut}
          </span>,
          operation.message ?? '-',
          operation.dateReception ? new Date(operation.dateReception).toLocaleString() : '-',
        ])}
        emptyText="Aucune opération synchronisée."
      />
    </section>
  )
}

function ModuleHeader({ title, text, icon: Icon }: { title: string; text: string; icon: typeof Gauge }) {
  return (
    <div className="module-header">
      <div className="module-icon"><Icon size={26} /></div>
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Gauge; children: React.ReactNode }) {
  return (
    <article className="panel">
      <header>
        <Icon size={21} />
        <h3>{title}</h3>
      </header>
      {children}
    </article>
  )
}

function Capability({ title, text, icon: Icon }: { title: string; text: string; icon: typeof Gauge }) {
  return (
    <article className="capability-card">
      <Icon size={25} />
      <strong>{title}</strong>
      <span>{text}</span>
    </article>
  )
}

function Feature({ icon: Icon, text }: { icon: typeof Gauge; text: string }) {
  return (
    <div className="feature-item">
      <Icon size={20} />
      <span>{text}</span>
    </div>
  )
}

function WorkflowRow({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className="workflow-row">
      <strong>{label}</strong>
      <span>{value}</span>
      <em>{status}</em>
    </div>
  )
}

function Notice({ type, text }: { type: 'info' | 'warning'; text: string }) {
  return (
    <div className={clsx('notice', type)}>
      {type === 'info' ? <Bell size={19} /> : <WarningCircle size={19} />}
      <span>{text}</span>
    </div>
  )
}

function DataTable({ columns, rows, loading, emptyText }: { columns: string[]; rows: Array<Array<React.ReactNode>>; loading?: boolean; emptyText: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={columns.length}>Chargement...</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={columns.length}>{emptyText}</td></tr>}
          {!loading && rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function money(value?: number, currency = 'USD') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CDF' ? 0 : 2,
  }).format(value ?? 0)
}

export default App
