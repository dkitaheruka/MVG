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
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { apiRequest, downloadUrl } from './lib/api'
import {
  listOfflineOperations,
  saveOfflineOperation,
  removeOfflineOperation,
  syncPendingOperations,
  clearAllOfflineOperations,
  type OfflineOperation,
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
  { to: '/production', labelKey: 'production', icon: Barcode, permission: 'production.gerer' },
  { to: '/tresorerie', labelKey: 'treasury', icon: Bank, permission: 'tresorerie.voir' },
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
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/tresorerie" element={<TreasuryPage />} />
            <Route path="/comptabilite" element={<AccountingPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/sync" element={<SyncPage />} />
          </Routes>
        </main>
      </div>
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

  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'credits' | 'clients'>('pos')
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
        agence: { id: agenceId, nom: 'Agence locale' },
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

  // Gestion du panier
  function addToCart(stock: StockAgence) {
    if (!stock.article) return
    const articleId = stock.article.id
    const existing = cart.find((item) => item.articleId === articleId)
    const stockDispo = stock.quantite ?? 0
    const prix = stock.article.prixVenteStandard ?? 10.0

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
          <DataTable
            columns={['Réf Vente', 'Date', 'Client', 'Total', 'Devise', 'Règlement', 'Statut Crédit', 'Actions']}
            loading={salesQuery.isLoading}
            rows={(salesQuery.data ?? []).map((v) => [
              v.referenceVente ?? `VTE-${v.id}`,
              v.dateVente ? new Date(v.dateVente).toLocaleString('fr-FR') : '-',
              v.client?.nom ?? 'Client Comptant',
              `$${v.montantTotal?.toFixed(2)}`,
              v.devise ?? 'USD',
              v.estCredit ? 'CRÉDIT' : 'CASH',
              v.statutCredit ?? 'AUCUN',
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
            <p style={{ margin: 0, color: 'var(--muted)' }}>Suivi du portefeuille client et des encours financiers.</p>
            <button className="primary-action" onClick={() => setShowNewClientModal(true)}>
              <UserPlus size={18} /> Nouveau Client
            </button>
          </div>

          <DataTable
            columns={['Nom du Client', 'Téléphone', 'Adresse', 'Encours Dette']}
            loading={clientsQuery.isLoading}
            rows={(clientsQuery.data ?? []).map((c) => [
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
            ])}
            emptyText="Aucun client enregistré."
          />
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
        <div className="modal-overlay" onClick={() => setActiveReceipt(null)}>
          <div className="receipt-preview-wrap" onClick={(e) => e.stopPropagation()}>
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
                  Mode :{' '}
                  {activeReceipt.estCredit
                    ? `CRÉDIT (${activeReceipt.statutCredit ?? 'EN_ATTENTE'})`
                    : 'PAIEMENT COMPTANT (CASH)'}
                </span>
              </div>

              <div className="ticket-footer">
                <p style={{ margin: 0 }}>Les marchandises vendues ne sont ni reprises ni échangées.</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>MERCI POUR VOTRE VISITE !</p>
              </div>
            </div>

            <div className="receipt-modal-actions">
              {activeReceipt.id && !String(activeReceipt.id).startsWith('OFF-') && (
                <a
                  className="secondary-action"
                  href={downloadUrl(`/api/ventes/${activeReceipt.id}/recu-pdf`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FilePdf size={17} /> Télécharger PDF
                </a>
              )}
              <button className="primary-action" onClick={() => window.print()}>
                <Printer size={17} /> Imprimer Ticket
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
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const { data, isLoading, error } = useQuery({
    queryKey: ['stock', agenceId],
    queryFn: () => apiRequest<StockAgence[]>(`/api/stocks/agence/${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  return (
    <section className="page-grid">
      <ModuleHeader title="Stock agence" text="Suivi lots, seuils, expiration, rappels et corrections validées." icon={Package} />
      {error && <Notice type="warning" text="Aucun stock disponible ou backend non prêt pour cette agence." />}
      <DataTable
        columns={['Article', 'Lot', 'Quantité', 'Expiration', 'Seuil']}
        loading={isLoading}
        rows={(data ?? []).map((stock) => [
          stock.article?.designation ?? 'Article',
          stock.numeroLot ?? '-',
          stock.quantite ?? 0,
          stock.dateExpiration ?? '-',
          stock.seuilAlerte ?? '-',
        ])}
        emptyText="Aucun stock enregistré pour cette agence."
      />
    </section>
  )
}

function ProductionPage() {
  return (
    <section className="page-grid">
      <ModuleHeader title="Production et QR lots" text="Génération des lots de production, signatures QR et étiquettes à imprimer." icon={Barcode} />
      <div className="two-column">
        <Panel title="Cycle recommandé" icon={ArrowsClockwise}>
          <WorkflowRow label="Ordre production" value="Planifié" status="Responsable" />
          <WorkflowRow label="Clôture" value="Quantité réelle + pertes" status="Stock mis à jour" />
          <WorkflowRow label="Lot" value="Numéro + expiration" status="Traçabilité" />
          <WorkflowRow label="QR" value="Payload signé" status="Impression" />
        </Panel>
        <Panel title="Format QR" icon={QrCode}>
          <pre className="code-block">{`{
  "type": "MATABISHI_PRODUCT",
  "articleId": 12,
  "numeroLot": "LOT-2026-09-0004",
  "dateExpiration": "2027-03-30",
  "agenceId": 2
}`}</pre>
        </Panel>
      </div>
    </section>
  )
}

function TreasuryPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) => state.session?.agenceId ?? 1)
  const can = useAppStore((state) => state.can)

  const [activeTab, setActiveTab] = useState<'caisses' | 'demandes' | 'historique'>('caisses')
  const [showNewDemandeModal, setShowNewDemandeModal] = useState(false)
  const [showNewCaisseModal, setShowNewCaisseModal] = useState(false)
  const [activeVoucher, setActiveVoucher] = useState<Transaction | null>(null)
  const [rejectionModalTx, setRejectionModalTx] = useState<Transaction | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-action" onClick={() => setShowNewCaisseModal(true)}>
            <Plus size={17} /> Nouvelle Caisse
          </button>
          <button className="primary-action" onClick={() => setShowNewDemandeModal(true)}>
            <Plus size={17} /> Nouvelle Demande
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
          <ArrowsClockwise size={23} />
          <span>Demandes en attente</span>
          <strong style={{ color: pendingTx.length > 0 ? 'var(--warning)' : 'inherit' }}>
            {pendingTx.length}
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
          className={clsx('tab-btn', activeTab === 'caisses' && 'active')}
          onClick={() => setActiveTab('caisses')}
        >
          <Wallet size={17} /> Caisses ({caisses.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'demandes' && 'active')}
          onClick={() => setActiveTab('demandes')}
        >
          <ClockCounterClockwise size={17} /> Demandes en attente ({pendingTx.length})
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'historique' && 'active')}
          onClick={() => setActiveTab('historique')}
        >
          <ClipboardText size={17} /> Tous les Mouvements ({allTx.length})
        </button>
      </div>

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

  const [activeTab, setActiveTab] = useState<'journal' | 'balance' | 'performance' | 'plan'>('journal')
  const [mois, setMois] = useState(new Date().getMonth() + 1)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [planSearch, setPlanSearch] = useState('')
  const [showNewCompteModal, setShowNewCompteModal] = useState(false)
  const [nouveauNumero, setNouveauNumero] = useState('')
  const [nouveauLibelle, setNouveauLibelle] = useState('')
  const [compteParent, setCompteParent] = useState('')

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
      </div>

      {/* TAB 1 : JOURNAL DES ECRITURES */}
      {activeTab === 'journal' && (
        <DataTable
          columns={['Date', 'Réf. Opération', 'N° Compte', 'Libellé Compte', 'Sens', 'Montant', 'Module Source']}
          loading={ecrituresQuery.isLoading}
          rows={ecritures.map((e) => [
            e.dateEcriture ? new Date(e.dateEcriture).toLocaleDateString('fr-FR') : '-',
            e.referenceOperation ? e.referenceOperation.substring(0, 8) + '...' : '-',
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
            <span key={e.id + '-mod'} className="badge badge-neutral">
              {e.sourceModule ?? 'COMPTABILITE'}
            </span>,
          ])}
          emptyText="Aucune écriture comptable enregistrée."
        />
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

            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Équilibre : {totauxBalance.debitUsd === totauxBalance.creditUsd ? 'Parfait' : 'En calcul'}
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
    </section>
  )
}

function ReportingPage() {
  const agenceId = useAppStore((state) => state.session?.agenceId)
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()
  const balancePath = `/api/reporting/export/balance?mois=${month}&annee=${year}${agenceId ? `&agenceId=${agenceId}` : ''}`

  return (
    <section className="page-grid">
      <ModuleHeader title="Reporting et documents" text="Rapports financiers, exports PDF, factures, reçus et bons." icon={ChartLineUp} />
      <div className="module-grid">
        <a className="capability-card" href={downloadUrl(balancePath)}>
          <FilePdf size={25} />
          <strong>Exporter balance PDF</strong>
          <span>Mois courant, agence courante ou consolidation siège.</span>
        </a>
        <Capability title="Documents commerciaux" text="Factures, reçus, bons de livraison, bons de caisse." icon={Receipt} />
        <Capability title="Performance" text="Recettes, charges, services, agences et consolidé USD." icon={TrendUp} />
      </div>
    </section>
  )
}

function AdminPage() {
  const token = useToken()
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

  return (
    <section className="page-grid">
      <ModuleHeader title="Administration système" text="Rôles personnalisés, permissions par module, appareils autorisés et audit." icon={ShieldCheck} />
      <div className="two-column">
        <Panel title="Rôles système" icon={UsersThree}>
          <DataTable
            columns={['Code', 'Nom', 'Permissions']}
            loading={rolesQuery.isLoading}
            rows={(rolesQuery.data ?? []).map((role) => [role.code, role.nom, role.permissions?.length ?? 0])}
            emptyText="Aucun rôle chargé."
          />
        </Panel>
        <Panel title="Permissions par module" icon={UserCircleGear}>
          <DataTable
            columns={['Module', 'Code', 'Libellé']}
            loading={permissionsQuery.isLoading}
            rows={(permissionsQuery.data ?? []).slice(0, 12).map((permission) => [permission.module, permission.code, permission.libelle])}
            emptyText="Aucune permission chargée."
          />
        </Panel>
      </div>
      <div className="module-grid">
        <Capability title="Appareils autorisés" text="Associer un téléphone à un utilisateur avant toute connexion mobile." icon={DeviceMobile} />
        <Capability title="Audit" text="Voir les actions sensibles: validations, resets, exports, corrections." icon={ShieldCheck} />
        <Capability title="Rôles personnalisés" text="Créer un rôle métier et cocher les permissions par module." icon={UserCircleGear} />
      </div>
    </section>
  )
}

function SyncPage() {
  const token = useToken()
  const [localOperations, setLocalOperations] = useState(0)
  const { data } = useQuery({
    queryKey: ['sync-operations'],
    queryFn: () => apiRequest<SyncOperation[]>('/api/sync/operations', { token }),
    enabled: Boolean(token),
  })

  useEffect(() => {
    listOfflineOperations().then((operations) => setLocalOperations(operations.length))
  }, [])

  return (
    <section className="page-grid">
      <ModuleHeader title="Synchronisation offline" text="Suivi des ventes terrain, conflits, stocks négatifs et traitements chef." icon={ArrowsClockwise} />
      <div className="metric-grid">
        <article className="metric-card"><WifiSlash size={23} /><span>File locale</span><strong>{localOperations}</strong></article>
        <article className="metric-card"><ArrowsClockwise size={23} /><span>Serveur</span><strong>{data?.length ?? 0}</strong></article>
        <article className="metric-card"><WarningCircle size={23} /><span>Stocks négatifs</span><strong>{data?.filter((op) => op.stockNegatifSignale).length ?? 0}</strong></article>
      </div>
      <DataTable
        columns={['Opération', 'Type', 'Statut', 'Message']}
        rows={(data ?? []).map((operation) => [operation.clientOperationId, operation.typeOperation, operation.statut, operation.message ?? '-'])}
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
