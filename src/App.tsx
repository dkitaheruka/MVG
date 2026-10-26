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
  FileText,
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
  ChartBar,
  Gear,
  Storefront,
  Car,
  Warning,
  Sidebar,
  CaretLeft,
  Camera,
  Sliders,
  Power,
  Key,
  Crown,
  Devices,
  MapPin,
} from '@phosphor-icons/react'
import {
  RealQrCode,
  QrScannerModal,
  parseQrPayload,
  QrLabelPrintModal,
  QrAccountingModal,
  type QrCodePayload,
} from './components/QrCodeComponents'
import { NewEtatBesoinModal } from './components/NewEtatBesoinModal'
import { ExecutiveDashboard } from './components/ExecutiveDashboard'
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
  { to: '/comptabilite', labelKey: 'accounting', icon: Books, permission: 'comptabilite.voir' },
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

  // Gestion du mot de passe temporaire / premier login obligatoire
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeError, setChangeError] = useState('')

  useEffect(() => {
    let savedId = localStorage.getItem('matabishi_device_id')
    if (!savedId) {
      savedId = 'DEV-WEB-' + Math.random().toString(36).substring(2, 9).toUpperCase()
      localStorage.setItem('matabishi_device_id', savedId)
    }
    setDeviceId(savedId)
  }, [])

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Les deux mots de passe ne correspondent pas.')
      }
      if (newPassword.length < 4) {
        throw new Error('Le mot de passe doit comporter au moins 4 caractères.')
      }
      return apiRequest<{ message: string; token: string }>('/api/auth/change-password', {
        method: 'POST',
        token: tempToken,
        body: JSON.stringify({ newPassword }),
      })
    },
    onSuccess: (data) => {
      setSession(parseJwt(data.token))
    },
    onError: (err: any) => setChangeError(err.message || 'Erreur lors de la mise à jour du mot de passe'),
  })

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

      const activeDevId = deviceId || localStorage.getItem('matabishi_device_id') || 'DEV-WEB-MAIN'
      const activeDevName = deviceType === 'MOBILE' ? 'Terminal Mobile POS' : `Poste Web (${navigator.platform || 'PC'})`

      return apiRequest<{ token: string; mustChangePassword?: boolean; user?: any } | string>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          deviceId: activeDevId,
          deviceName: activeDevName,
          deviceType,
        }),
      })
    },
    onSuccess: (result: any) => {
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
        if (result.mustChangePassword) {
          setTempToken(result.token)
          setMustChangePassword(true)
          setMessage('')
          return
        }
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

        {mustChangePassword ? (
          /* FORMULAIRE DE CHANGEMENT OBLIGATOIRE DU MOT DE PASSE (PREMIER LOGIN / MDP TEMPORAIRE) */
          <div style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 12, border: '2px solid var(--accent-strong)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
              <Key size={22} />
              Premier Login : Définir votre Mot de Passe
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Votre compte utilise un mot de passe temporaire défini par l'administrateur. Pour des raisons de sécurité, vous devez choisir un mot de passe personnel avant d'accéder au système.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                changePasswordMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Nouveau Mot de Passe :
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 4 caractères"
                  style={{ width: '100%', padding: '10px 12px', marginTop: 4 }}
                  autoFocus
                />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Confirmer le Mot de Passe :
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  style={{ width: '100%', padding: '10px 12px', marginTop: 4 }}
                />
              </label>

              {changeError && (
                <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, fontSize: '0.84rem' }}>
                  {changeError}
                </div>
              )}

              <button
                type="submit"
                className="primary-action"
                disabled={changePasswordMutation.isPending}
                style={{ padding: '12px 18px', fontWeight: 700, marginTop: 6 }}
              >
                <CheckCircle size={18} />
                {changePasswordMutation.isPending ? 'Enregistrement...' : 'Valider & Accéder à l ERP'}
              </button>
            </form>
          </div>
        ) : (
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--muted)', margin: '4px 0' }}>
              <span>Empreinte Appareil : <code>{deviceId ? deviceId.substring(0, 16) : 'Auto-détecté'}</code></span>
              <span title="Sécurité mono-appareil active">Politique Mono-Appareil</span>
            </div>

            {deviceType === 'MOBILE' && (
              <label>
                Identifiant appareil
                <input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="ex: MATABISHI-GOMA-001" />
              </label>
            )}

            {message && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  margin: '8px 0',
                  background: message.includes('bloqué') || message.includes('BLOQUÉ') || message.includes('Sécurité') ? '#fee2e2' : '#fef3c7',
                  color: message.includes('bloqué') || message.includes('BLOQUÉ') || message.includes('Sécurité') ? '#b91c1c' : '#92400e',
                  border: message.includes('bloqué') || message.includes('BLOQUÉ') || message.includes('Sécurité') ? '1px solid #f87171' : '1px solid #fcd34d',
                }}
              >
                <strong>{message.includes('bloqué') || message.includes('BLOQUÉ') ? 'Accès Bloqué :' : 'Attention :'}</strong> {message}
              </div>
            )}

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
                  { email: 'dkitaheruka@gmail.com', label: 'Super Admin (VIP)' },
                  { email: 'admin.siege@mvg.cd', label: 'Admin Siège (VIP)' },
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
        )}
      </section>
      <aside className="login-aside">
        <h2>Sécurité & Gouvernance Entreprise</h2>
        <div className="login-feature"><ShieldCheck size={22} /> Blocage automatique après 5 tentatives infructueuses</div>
        <div className="login-feature"><Desktop size={22} /> Politique stricte mono-appareil (sauf comptes VIP)</div>
        <div className="login-feature"><Key size={22} /> Mot de passe temporaire & changement obligatoire au 1er login</div>
        <div className="login-feature"><Power size={22} /> Déconnexion forcée des utilisateurs par le Super Admin</div>
        <div className="login-feature"><QrCode size={22} /> Étiquettes QR lots certifiées & passation comptable instantanée</div>
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
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed)
  const printProposal = useAppStore((state) => state.printProposal)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)
  const can = useAppStore((state) => state.can)

  const visibleNav = navItems.filter((item) => can(item.permission))
  const currentTitle = visibleNav.find((item) => location.pathname.startsWith(item.to))?.labelKey ?? 'dashboard'

  const selectedAgenceId = useAppStore((state) => state.selectedAgenceId)
  const setSelectedAgenceId = useAppStore((state) => state.setSelectedAgenceId)
  const [showGlobalEB, setShowGlobalEB] = useState(false)
  const [globalEBService, setGlobalEBService] = useState('Service Général')

  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token: session?.token }),
    enabled: Boolean(session?.token),
  })

  return (
    <>
      <div className={clsx('app-shell', sidebarCollapsed && 'sidebar-collapsed')}>
      <aside className={clsx('sidebar', sidebarOpen && 'open', sidebarCollapsed && 'collapsed')}>
        <div className="sidebar-head" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <div className="brand-mark"><Buildings size={24} weight="duotone" /></div>
            {!sidebarCollapsed && (
              <div>
                <strong>Matabishi</strong>
                <span>ERP Pro Max</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="icon-button desktop-only"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
              aria-label="Basculer la taille du menu"
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
            >
              {sidebarCollapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
            </button>
            <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Fermer menu">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation principale">
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? t(item.labelKey) : undefined}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
                {!sidebarCollapsed && <CaretRight size={14} className="nav-caret" />}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="session-card" title={sidebarCollapsed ? `${session?.role} (${session?.email})` : undefined}>
            <UserCircleGear size={22} />
            {!sidebarCollapsed && (
              <div>
                <strong>{session?.role}</strong>
                <span>{session?.email}</span>
              </div>
            )}
          </div>
          <button
            className="secondary-action"
            onClick={() => setSession(null)}
            title={sidebarCollapsed ? t('logout') : undefined}
            style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 8 }}
          >
            <SignOut size={18} />
            {!sidebarCollapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir menu">
              <List size={22} />
            </button>
            <button
              type="button"
              className="icon-button desktop-only"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
              aria-label="Basculer le menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {sidebarCollapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
            </button>
            <div>
              <span className="topbar-kicker">{t('app')}</span>
              <h2>{t(currentTitle)}</h2>
            </div>
          </div>
          <div className="topbar-actions">
            {/* SÉLECTEUR D'AGENCE ACTIF (POUR ADMIN SIÈGE ET SUPER ADMIN) */}
            {(session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <Buildings size={17} style={{ color: 'var(--primary)' }} />
                <select
                  value={selectedAgenceId}
                  onChange={(e) => {
                    const val = e.target.value === 'CONSOLIDE' ? 'CONSOLIDE' : Number(e.target.value)
                    setSelectedAgenceId(val)
                  }}
                  style={{ padding: '3px 6px', fontSize: '0.78rem', border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text)' }}
                  aria-label="Sélectionner l'agence de travail ou vue consolidée"
                >
                  <option value="CONSOLIDE">Vue Consolidée Siège (Toutes les Agences)</option>
                  {(agencesQuery.data || []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.estSiege ? '[Siège] ' : ''}{ag.nom} ({ag.ville})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 600 }}>
                <Buildings size={16} color="var(--primary)" />
                <span>{(agencesQuery.data || []).find((a: any) => a.id === session?.agenceId)?.nom || 'Mon Agence'}</span>
              </div>
            )}

            {/* SÉLECTEUR RAPIDE DE RÔLE SYSTÈME */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <UserCircleGear size={17} />
              <select
                value={session?.email}
                onChange={async (e) => {
                  const targetEmail = e.target.value
                  try {
                    const res = await apiRequest<{ token: string }>('/api/auth/login', {
                      method: 'POST',
                      body: JSON.stringify({ email: targetEmail, password: 'admin123' }),
                    })
                    setSession(parseJwt(res.token))
                  } catch (err) {
                    console.error(err)
                  }
                }}
                style={{ padding: '3px 6px', fontSize: '0.78rem', border: 'none', background: 'transparent' }}
                aria-label="Changer de rôle actif"
              >
                <option value="dkitaheruka@gmail.com">David Kitaheruka (Super Admin Unique - Tous les Systèmes)</option>
                <option value="admin.siege@mvg.cd">Direction Générale (Admin Siège - Multi-Agences & Grandes Décisions)</option>
                <option value="chef.goma@mvg.cd">Kasereka (Chef Agence Siège Social Goma)</option>
                <option value="chef.kinshasa@mvg.cd">Patrice (Chef Agence Kinshasa)</option>
                <option value="chef.bukavu@mvg.cd">Furaha (Chef Agence Bukavu)</option>
                <option value="vendeur.goma@mvg.cd">Mwamba (Vendeur Agence)</option>
                <option value="caissier.goma@mvg.cd">Sophie (Caissière Agence)</option>
                <option value="magasinier.goma@mvg.cd">Baraka (Magasinier Agence)</option>
                <option value="production@mvg.cd">Paluku (Chef Production & Usine)</option>
                <option value="technicien@mvg.cd">Kavira (Technicien Maintenance & Parc)</option>
                <option value="comptable.senior@mvg.cd">Kambale (Comptable Senior)</option>
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
    </div>

      {printProposal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: 520,
              width: '100%',
              margin: 'auto',
              textAlign: 'center',
              padding: '32px 28px',
              borderRadius: 16,
              background: 'var(--surface)',
              border: '2px solid var(--accent-strong)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4)',
              animation: 'modalSlideIn 0.25s ease-out',
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={40} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)' }}>
              {printProposal.title}
            </h3>
            {printProposal.ref && (
              <div style={{ fontSize: '0.92rem', color: 'var(--muted)', marginBottom: 12 }}>
                Référence officielle : <strong style={{ color: 'var(--text)' }}>{printProposal.ref}</strong>
              </div>
            )}
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.5 }}>
              {printProposal.subtitle || "L'opération a été enregistrée avec succès. Souhaitez-vous imprimer le document officiel correspondant maintenant ?"}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={printProposal.primaryDocUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-action"
                style={{ padding: '12px 20px', fontSize: '0.95rem', justifyContent: 'center', textDecoration: 'none' }}
                onClick={() => setPrintProposal(null)}
              >
                <Printer size={20} /> Imprimer {printProposal.primaryDocName}
              </a>

              {printProposal.secondaryDocUrl && (
                <a
                  href={printProposal.secondaryDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-action"
                  style={{ padding: '12px 20px', fontSize: '0.95rem', justifyContent: 'center', textDecoration: 'none' }}
                  onClick={() => setPrintProposal(null)}
                >
                  <Printer size={20} /> Imprimer {printProposal.secondaryDocName}
                </a>
              )}

              <button
                type="button"
                className="secondary-action"
                style={{ marginTop: 4, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                onClick={() => setPrintProposal(null)}
              >
                Continuer sans imprimer (Fermer)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL UNIVERSEL D'ENGAGEMENT D'ÉTAT DE BESOIN (DEMANDE DE FONDS) */}
      <NewEtatBesoinModal
        isOpen={showGlobalEB}
        onClose={() => setShowGlobalEB(false)}
        defaultService={globalEBService}
        agenceId={typeof selectedAgenceId === 'number' ? selectedAgenceId : (session?.agenceId ?? 1)}
      />
    </>
  )
}

function DashboardPage() {
  const token = useToken()
  const session = useAppStore((state) => state.session)
  const selectedAgenceId = useAppStore((state) => state.selectedAgenceId)

  const isSuperOrAdminSiege = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'
  const [executiveViewMode, setExecutiveViewMode] = useState<'EXECUTIVE' | 'OPERATIONAL'>('EXECUTIVE')

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-service-summary', selectedAgenceId],
    queryFn: () => {
      const pAg = selectedAgenceId && selectedAgenceId !== 'CONSOLIDE' ? `&agenceId=${selectedAgenceId}` : ''
      return apiRequest<any>(`/api/dashboard/service-summary?t=1${pAg}`, { token })
    },
    enabled: Boolean(token),
  })

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gear': return Gear
      case 'Package': return Package
      case 'ChartBar': return ChartBar
      case 'CheckCircle': return CheckCircle
      case 'Truck': return Truck
      case 'Receipt': return Receipt
      case 'CurrencyCircleDollar': return CurrencyCircleDollar
      case 'Wallet': return Wallet
      case 'Coins': return Coins
      case 'Wrench': return Wrench
      case 'ClockCounterClockwise': return ClockCounterClockwise
      case 'ShieldCheck': return ShieldCheck
      case 'Bell': return Bell
      case 'WarningCircle': return Warning
      case 'Warning': return Warning
      default: return ChartLineUp
    }
  }

  const series = data?.diagramme?.series || []
  const maxVal = Math.max(...series.map((s: any) => s.valeur || 0), 1)

  return (
    <section className="page-grid">
      {/* SÉLECTEUR DE MODE DE VUE POUR ADMIN SIÈGE & SUPER ADMIN */}
      {isSuperOrAdminSiege && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}>
            Mode de Supervision Siège :
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface-2)',
              padding: 3,
              borderRadius: 8,
              border: '1px solid var(--border)',
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setExecutiveViewMode('EXECUTIVE')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                background: executiveViewMode === 'EXECUTIVE' ? 'var(--surface)' : 'transparent',
                color: executiveViewMode === 'EXECUTIVE' ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: executiveViewMode === 'EXECUTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ChartBar size={16} />
                Vue Supervision Exécutive (Consolidée & Agences)
              </span>
            </button>
            <button
              type="button"
              onClick={() => setExecutiveViewMode('OPERATIONAL')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                background: executiveViewMode === 'OPERATIONAL' ? 'var(--surface)' : 'transparent',
                color: executiveViewMode === 'OPERATIONAL' ? 'var(--accent-strong)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: executiveViewMode === 'OPERATIONAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClipboardText size={16} />
                Vue Opérationnelle des Services
              </span>
            </button>
          </div>
        </div>
      )}

      {isSuperOrAdminSiege && executiveViewMode === 'EXECUTIVE' ? (
        <ExecutiveDashboard token={token} />
      ) : (
        <>
      {/* EN-TÊTE DU TABLEAU DE BORD - DESIGN ÉPURÉ AVEC DÉGRADÉ VERT DOUX */}
      <div
        className="panel"
        style={{
          padding: '22px 26px',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '1.45rem',
                margin: 0,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              {data?.serviceLibelle || 'Tableau de bord'}
            </h1>
            {data?.agenceNom && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                {data.agenceNom}
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
            {data?.activeService === 'PRODUCTION'
              ? 'Indicateurs de fabrication, ordres de travail et matières consommées.'
              : data?.activeService === 'STOCKS'
              ? 'Niveaux de stocks physiques, alertes réapprovisionnement et transferts.'
              : data?.activeService === 'VENTES'
              ? 'Activité commerciale, ventes comptoir et répartition des encaissements.'
              : data?.activeService === 'TRESORERIE'
              ? 'Disponibilité physique des caisses, recettes et décaissements avec visas.'
              : data?.activeService === 'MAINTENANCE'
              ? 'Disponibilité du parc machines et véhicules, entretiens préventifs et curatifs.'
              : 'Supervision générale multi-agences et indicateurs consolidés du réseau.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--accent-soft)',
              color: 'var(--accent-strong)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-strong)' }} />
            <span>Données en temps réel</span>
          </div>
        </div>
      </div>

      {error && <Notice type="warning" text="Impossible de charger le résumé du service. Données locales temporaires." />}

      {/* CARTES DE KPIS AVEC ICÔNES DIRECTES SANS BACKGROUND */}
      <div className="metric-grid">
        {(data?.kpis || []).map((kpi: any) => {
          const Icon = getIcon(kpi.icon)
          return (
            <article
              className="metric-card"
              key={kpi.label}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Icon size={26} style={{ color: 'var(--accent-strong)' }} />
                {kpi.detail && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: 'var(--accent-strong)',
                      background: 'var(--accent-soft)',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {kpi.detail}
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.84rem', color: 'var(--muted)', display: 'block', fontWeight: 500 }}>
                  {kpi.label}
                </span>
                <strong style={{ fontSize: '1.65rem', marginTop: 4, fontWeight: 700, color: 'var(--text)', display: 'block', letterSpacing: '-0.02em' }}>
                  {isLoading ? '...' : kpi.valeur}
                </strong>
              </div>
            </article>
          )
        })}
      </div>

      {/* SYNTHÈSE D'ACTIVITÉ & DERNIÈRES OPÉRATIONS DU SERVICE */}
      <div className="two-column" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* 1. SYNTHÈSE D'ACTIVITÉ */}
        <div className="panel" style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <ChartBar size={19} style={{ color: 'var(--accent-strong)' }} />
                {data?.diagramme?.titre || 'Synthèse d Activité'}
              </h3>
              <small style={{ color: 'var(--muted)' }}>
                {data?.activeService === 'PRODUCTION'
                  ? 'Volumes et cadences de fabrication du poste'
                  : 'Indicateurs d exploitation en temps réel'}
              </small>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {series.length} flux
            </span>
          </div>

          {/* DIAGRAMME EN BARRES ÉPURÉ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {series.map((item: any, idx: number) => {
              const pct = maxVal > 0 ? Math.round(((item.valeur || 0) / maxVal) * 100) : 0
              return (
                <div key={item.label || idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <strong>
                      {typeof item.valeur === 'number' ? item.valeur.toLocaleString() : item.valeur}{' '}
                      <small style={{ color: 'var(--muted)', fontWeight: 400 }}>{item.unite || ''}</small>
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(pct, 3)}%`,
                        height: '100%',
                        background: 'var(--accent-strong)',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {series.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: '0.84rem' }}>
                Aucune donnée enregistrée pour le moment.
              </div>
            )}
          </div>

          {/* RACCOURCIS RAPIDES DU SERVICE */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data?.activeService === 'PRODUCTION' && (
              <>
                <NavLink to="/production" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Gear size={15} /> Lancer un Ordre de Fabrication
                </NavLink>
                <NavLink to="/stock" className="secondary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 12px' }}>
                  <Package size={15} /> Consulter les Stocks
                </NavLink>
              </>
            )}
            {data?.activeService === 'STOCKS' && (
              <>
                <NavLink to="/stock" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Package size={15} /> Consulter l Inventaire
                </NavLink>
                <NavLink to="/transferts" className="secondary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 12px' }}>
                  <Truck size={15} /> Suivre les Convois
                </NavLink>
              </>
            )}
            {data?.activeService === 'VENTES' && (
              <>
                <NavLink to="/ventes" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Receipt size={15} /> Nouvelle Vente Comptoir
                </NavLink>
              </>
            )}
            {data?.activeService === 'TRESORERIE' && (
              <>
                <NavLink to="/tresorerie" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Wallet size={15} /> Gestion Trésorerie & Caisses
                </NavLink>
              </>
            )}
            {data?.activeService === 'MAINTENANCE' && (
              <>
                <NavLink to="/maintenance" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Wrench size={15} /> Planifier un Entretien
                </NavLink>
              </>
            )}
            {(data?.activeService === 'DIRECTION_SIEGE' || isSuperOrAdminSiege) && (
              <NavLink to="/reporting" className="primary-action" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Buildings size={15} /> Supervision Multi-Agences
              </NavLink>
            )}
          </div>
        </div>

        {/* 2. DERNIÈRES OPÉRATIONS DU SERVICE */}
        <div className="panel" style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <ClockCounterClockwise size={19} style={{ color: 'var(--accent-strong)' }} />
              Dernières Opérations
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {(data?.recents || []).length} récents
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.recents || []).map((item: any) => (
              <div
                key={item.id || item.reference}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.82rem', display: 'block' }}>{item.reference}</strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{item.titre}</span>
                  {item.date && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{item.date}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.84rem', display: 'block', color: 'var(--text)' }}>
                    {item.quantite}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      background: 'var(--surface)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      display: 'inline-block',
                      marginTop: 2,
                    }}
                  >
                    {item.statut}
                  </span>
                </div>
              </div>
            ))}
            {(data?.recents || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: '0.84rem' }}>
                Aucune opération récente dans ce département.
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </section>
  )
}

function SalesPage() {
  const token = useToken()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) =>
    typeof state.selectedAgenceId === 'number'
      ? state.selectedAgenceId
      : (state.session?.agenceId ?? 1)
  )
  const session = useAppStore((state) => state.session)
  const isSiegeAdmin = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'credits' | 'clients' | 'livraisons' | 'tarifs'>('pos')
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
  const [repaymentVenteId, setRepaymentVenteId] = useState<number | ''>('')
  const [settlementVente, setSettlementVente] = useState<any | null>(null)
  const [settlementMontant, setSettlementMontant] = useState('')
  const [settlementDevise, setSettlementDevise] = useState<'USD' | 'CDF'>('USD')
  const [settlementCaisseId, setSettlementCaisseId] = useState<number | ''>('')
  const [settlementModePaiement, setSettlementModePaiement] = useState('CASH')
  const [settlementReferencePiece, setSettlementReferencePiece] = useState('')
  const [settlementError, setSettlementError] = useState<string | null>(null)
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<number | ''>('')
  const [modeTransport, setModeTransport] = useState<'ENLEVEMENT_MAGASIN' | 'VEHICULE_CLIENT' | 'FLOTTE_ENTREPRISE'>('ENLEVEMENT_MAGASIN')
  const [clientVehicule, setClientVehicule] = useState('')
  const [clientChauffeur, setClientChauffeur] = useState('')
  const [posFraisTransport, setPosFraisTransport] = useState<number | ''>('')
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [scannedQrPayload, setScannedQrPayload] = useState<QrCodePayload | null>(null)
  const [showAccountingQrModal, setShowAccountingQrModal] = useState(false)
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null)
  const [showSalesEB, setShowSalesEB] = useState(false)
  const [showTauxModal, setShowTauxModal] = useState(false)
  const [nouveauTauxPropose, setNouveauTauxPropose] = useState('')

  const passerEcritureQrMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest<any>('/api/comptabilite/passer-ecriture-qr', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...payload,
          agenceId: agenceId, // Toujours l'agence locale de l'opérateur qui scanne
        }),
      }),
    onSuccess: (data: any) => {
      setLastCompletedSale(data)
      setShowAccountingQrModal(true)
      setScanNotice(`✓ ${data.message}`)
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-credits-attente'] })
      queryClient.invalidateQueries({ queryKey: ['livraisons'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-service'] })
      queryClient.invalidateQueries({ queryKey: ['service-summary'] })
      queryClient.invalidateQueries({ queryKey: ['direction-kpis'] })
      setTimeout(() => setScanNotice(null), 8000)
    },
    onError: (err: any) => {
      alert(err.message || 'Erreur lors de l encaissement de la vente via QR Code')
    },
  })

  const proposerTauxMutation = useMutation({
    mutationFn: (tauxVal: number) =>
      apiRequest(`/api/parametrage/agences/${agenceId}/taux`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          taux: tauxVal,
          appliquerImmediatement:
            session?.role === 'CHEF_AGENCE' ||
            session?.role === 'SUPER_ADMIN' ||
            session?.role === 'ADMIN_SIEGE',
        }),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['taux-actif', agenceId] })
      queryClient.invalidateQueries({ queryKey: ['admin-taux'] })
      setShowTauxModal(false)
      setCheckoutMessage(
        res.statut === 'VALIDE'
          ? `Nouveau taux de ${res.taux} CDF pour 1 USD appliqué avec succès pour l'agence #${agenceId}.`
          : `Proposition de taux ${res.taux} CDF transmise pour validation.`
      )
      setTimeout(() => setCheckoutMessage(null), 5000)
    },
    onError: (err: any) => {
      setCheckoutMessage(err.message || 'Erreur lors de la mise à jour du taux')
      setTimeout(() => setCheckoutMessage(null), 5000)
    },
  })

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

  const entrepriseInfoQuery = useQuery({
    queryKey: ['entreprise-info'],
    queryFn: () => apiRequest<any>('/api/parametrage/entreprise', { token }),
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

  // 2c. Grille des tarifs fixés par le Chef d'Agence
  const agencyPricesListQuery = useQuery({
    queryKey: ['agence-articles-prix', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/agences/${agenceId}/articles/prix`, { token }),
    enabled: Boolean(token),
  })

  const [priceFormArticleId, setPriceFormArticleId] = useState<number | null>(null)
  const [newAgencyPriceValue, setNewAgencyPriceValue] = useState('')
  const [priceNotice, setPriceNotice] = useState<string | null>(null)

  const updateAgencyPriceMutation = useMutation({
    mutationFn: ({ articleId, prix }: { articleId: number; prix: number }) =>
      apiRequest(`/api/agences/${agenceId}/articles/${articleId}/prix`, {
        method: 'POST',
        token,
        body: JSON.stringify({ prix, devise: 'USD' }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['agence-articles-prix'] })
      queryClient.invalidateQueries({ queryKey: ['prix-agence'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      setPriceFormArticleId(null)
      setNewAgencyPriceValue('')
      setPriceNotice(data.message || 'Prix agence mis à jour avec succès !')
      setTimeout(() => setPriceNotice(null), 5000)
    },
    onError: (err: any) => {
      setPriceNotice(err.message || 'Erreur lors de la mise à jour du prix')
      setTimeout(() => setPriceNotice(null), 5000)
    },
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

  // 7. Caisses de l'agence
  const caissesQuery = useQuery({
    queryKey: ['caisses', agenceId],
    queryFn: () => apiRequest<CompteCaisse[]>(`/api/tresorerie/caisses?agenceId=${agenceId}`, { token }),
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

      const numFraisTransport = Math.max(0, Number(posFraisTransport) || 0)
      const totalMarchandisesUsd = cart.reduce((acc, item) => acc + item.prix * item.quantite, 0)
      const totalNetUsd = Math.round((totalMarchandisesUsd + numFraisTransport) * 100) / 100
      const selectedClient = clientsQuery.data?.find((c) => c.id === selectedClientId)

      if (!online) {
        // Enregistrement hors ligne dans IndexedDB
        const offlineSale: Vente = {
          id: Date.now(),
          referenceVente: `OFF-${Date.now().toString().slice(-6)}`,
          agence: { id: agenceId, nom: 'Mon Agence', estSiege: false },
          vendeur: { email: session?.email ?? 'vendeur@mvg.cd' },
          client: selectedClient ?? { nom: 'Client Comptant' },
          montantTotal: totalNetUsd,
          devise: paymentMode === 'CASH_CDF' ? 'CDF' : 'USD',
          estCredit: paymentMode === 'CREDIT',
          statutCredit: paymentMode === 'CREDIT' ? 'EN_ATTENTE' : 'AUCUN',
          dateVente: new Date().toISOString(),
          fraisTransport: numFraisTransport,
          modeTransport,
          vehiculeId: (modeTransport === 'FLOTTE_ENTREPRISE' && selectedVehiculeId) ? Number(selectedVehiculeId) : undefined,
          clientVehicule: modeTransport === 'VEHICULE_CLIENT' ? clientVehicule.trim() : undefined,
          clientChauffeur: modeTransport === 'VEHICULE_CLIENT' ? clientChauffeur.trim() : undefined,
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
      const payload: any = {
        agenceId,
        agence: { id: agenceId, nom: 'Agence locale', estSiege: false },
        clientId: selectedClient ? selectedClient.id : undefined,
        client: selectedClient ? { id: selectedClient.id, nom: selectedClient.nom } : undefined,
        montantTotal: totalNetUsd,
        fraisTransport: numFraisTransport,
        modeTransport,
        vehiculeId: (modeTransport === 'FLOTTE_ENTREPRISE' && selectedVehiculeId) ? Number(selectedVehiculeId) : undefined,
        selectedVehiculeId: (modeTransport === 'FLOTTE_ENTREPRISE' && selectedVehiculeId) ? Number(selectedVehiculeId) : undefined,
        clientVehicule: modeTransport === 'VEHICULE_CLIENT' ? clientVehicule.trim() : undefined,
        clientChauffeur: modeTransport === 'VEHICULE_CLIENT' ? clientChauffeur.trim() : undefined,
        devise: paymentMode === 'CASH_CDF' ? 'CDF' : 'USD',
        estCredit: paymentMode === 'CREDIT',
        details: cart.map((item) => ({
          articleId: item.articleId,
          article: { id: item.articleId, designation: item.designation },
          quantite: item.quantite,
          prixUnitaireApplique: item.prix,
        })),
        items: cart.map((item) => ({
          articleId: item.articleId,
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
      setPosFraisTransport('')
      setClientVehicule('')
      setClientChauffeur('')
      setSelectedVehiculeId('')
      setModeTransport('ENLEVEMENT_MAGASIN')
      setCheckoutMessage(null)
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['sync-operations'] })
      queryClient.invalidateQueries({ queryKey: ['livraisons'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['classes-comptables'] })
      queryClient.invalidateQueries({ queryKey: ['comptes-auxiliaires-clients'] })
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
      return apiRequest<any>(`/api/clients/${repaymentClient.id}/rembourser`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          montant: Number(repaymentMontant),
          devise: repaymentDevise,
          caisseId: repaymentCaisseId,
          agenceId,
          venteId: repaymentVenteId || undefined,
        }),
      })
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['classes-comptables'] })
      queryClient.invalidateQueries({ queryKey: ['comptes-auxiliaires-clients'] })
      const clientNom = repaymentClient?.nom
      setRepaymentClient(null)
      setRepaymentMontant('')
      setRepaymentVenteId('')
      setRepaymentError(null)
      if (res && res.referencePaiement) {
        setPrintProposal({
          title: 'Encaissement Dette Client Enregistré !',
          ref: res.referencePaiement,
          subtitle: `Règlement de créance de ${money(Number(repaymentMontant), repaymentDevise)} enregistré avec succès pour ${clientNom || 'le client'}.`,
          primaryDocName: 'Relevé Compte Client 411',
          primaryDocUrl: `/api/comptabilite/clients/${res.client?.id || repaymentClient?.id}/releve-pdf`,
        })
      }
    },
    onError: (err: any) => setRepaymentError(err.message || 'Erreur lors du remboursement'),
  })

  const reglerCreditMutation = useMutation({
    mutationFn: () => {
      if (!settlementVente) throw new Error('Aucune vente sélectionnée')
      return apiRequest<any>(`/api/ventes/${settlementVente.id}/regler`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          montant: Number(settlementMontant),
          devise: settlementDevise,
          caisseId: settlementCaisseId || undefined,
          modePaiement: settlementModePaiement,
          referencePiece: settlementReferencePiece,
        }),
      })
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ventes-agence'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['classes-comptables'] })
      queryClient.invalidateQueries({ queryKey: ['comptes-auxiliaires-clients'] })
      const v = settlementVente
      setSettlementVente(null)
      setSettlementMontant('')
      setSettlementReferencePiece('')
      setSettlementError(null)
      if (data && data.vente) {
        setPrintProposal({
          title: 'Règlement Vente Encaissé !',
          ref: data.referencePaiement || `REG-${data.vente.referenceVente || v.referenceVente}`,
          subtitle: `Règlement de ${settlementMontant} ${settlementDevise} validé sur la vente ${data.vente.referenceVente || v.referenceVente}. Écritures de trésorerie et tiers 411 passées.`,
          primaryDocName: 'Reçu / Ticket Caisse (80mm)',
          primaryDocUrl: `/api/ventes/${data.vente.id || v.id}/ticket-80mm`,
          secondaryDocName: 'Facture Complète (A4)',
          secondaryDocUrl: `/api/ventes/${data.vente.id || v.id}/facture?format=a4`,
        })
      }
    },
    onError: (err: any) => setSettlementError(err.message || 'Erreur lors du règlement de la vente'),
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

  function handleQrScan(rawText: string) {
    if (!rawText.trim()) return
    const payload = parseQrPayload(rawText)

    if (payload.type === 'VENTE') {
      const agId = payload.agenceId || agenceId
      setScannedQrPayload(payload)
      setShowAccountingQrModal(true)
      setScanNotice(`✓ QR Code Vente certifié ${payload.reference || ''} (${payload.nomAgence || `Agence #${agId}`}) scanné. Lecture réussie !`)
      return
    }

    if (payload.agenceId && payload.agenceId !== agenceId) {
      setScanNotice(`QR Code de l'Agence #${payload.agenceId} détecté. Vérification du stock local...`)
    }

    const match = (stockQuery.data ?? []).find((s) => {
      if (payload.numeroLot && s.numeroLot && s.numeroLot.toLowerCase() === payload.numeroLot.toLowerCase()) return true
      if (payload.articleId && s.articleId === payload.articleId) return true
      if (payload.codeUnique && s.article?.codeUnique?.toLowerCase() === payload.codeUnique.toLowerCase()) return true
      const q = (payload.codeUnique || rawText).toLowerCase().trim()
      return (
        s.article?.codeUnique?.toLowerCase() === q ||
        s.numeroLot?.toLowerCase() === q ||
        s.article?.designation.toLowerCase().includes(q)
      )
    })

    if (match) {
      addToCart(match)
      setScanNotice(`✓ Produit scanné et ajouté au panier : ${match.article?.designation} (${match.numeroLot || 'Lot standard'})`)
      setTimeout(() => setScanNotice(null), 4500)
    } else {
      // Si ce n'est pas un article du catalogue direct, offrir la possibilité de passer l'écriture comptable
      if (payload.numeroLot || payload.reference || payload.codeUnique) {
        setScannedQrPayload(payload)
        setShowAccountingQrModal(true)
      } else {
        setScanNotice(`Aucun stock disponible pour ce QR Code dans l'agence #${agenceId}.`)
        setTimeout(() => setScanNotice(null), 5000)
      }
    }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!barcodeInput.trim()) return
    handleQrScan(barcodeInput.trim())
    setBarcodeInput('')
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

  const totalMarchandisesUsd = cart.reduce((acc, item) => acc + item.prix * item.quantite, 0)
  const numPosFraisTransp = Math.max(0, Number(posFraisTransport) || 0)
  const totalUsd = Math.round((totalMarchandisesUsd + numPosFraisTransp) * 100) / 100
  const totalCdf = paymentMode === 'CASH_CDF' ? Math.round(totalUsd) : Math.round(totalUsd * tauxActif)
  const selectedClient = clientsQuery.data?.find((c) => c.id === selectedClientId)
  const pendingCreditsCount = creditsQuery.data?.length ?? 0

  return (
    <section className="page-grid">
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="module-icon">
            <Receipt size={28} weight="duotone" />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Vente & Caisse POS</h1>
            <p style={{ margin: 0 }}>Terminal de point de vente, encaissement bidevise USD/CDF, gestion des crédits et tickets thermiques.</p>
          </div>
        </div>
        <button
          className="secondary-action"
          onClick={() => setShowSalesEB(true)}
          style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
          title="Faire une demande de fonds pour le service commercial (frais de prospection, promotion, transport)"
        >
          <Coins size={18} /> État de Besoin Commercial
        </button>
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
        <button
          className={clsx('pos-tab-btn', activeTab === 'tarifs' && 'active')}
          onClick={() => setActiveTab('tarifs')}
        >
          <Tag size={19} />
          Prix Agence (Chef)
        </button>
      </div>

      {/* ONGLET 1 : TERMINAL POS */}
      {activeTab === 'pos' && (
        <div className="pos-layout">
          {/* CATALOGUE PRODUITS */}
          <div className="pos-catalog">
            <div className="pos-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <form onSubmit={handleBarcodeSubmit} className="pos-search" style={{ maxWidth: '220px' }}>
                <input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scanner code barre / lot..."
                  autoFocus
                />
              </form>

              {/* BOUTON DÉMARRAGE CAMÉRA QR SCANNER */}
              <button
                type="button"
                className="primary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: '0.84rem' }}
                onClick={() => setShowCameraModal(true)}
                title="Démarrer la caméra pour scanner le QR Code du lot ou produit"
              >
                <Camera size={18} />
                Scanner Caméra
              </button>

              <div className="pos-search" style={{ flex: 1, minWidth: '170px' }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un article..."
                />
              </div>

              {/* BADGE DU TAUX DE CHANGE AJUSTABLE PAR LE CHEF D'AGENCE */}
              <div
                className="pos-rate-badge"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setNouveauTauxPropose(String(tauxActif))
                  setShowTauxModal(true)
                }}
                title="Taux actif pour l'agence. Cliquez pour proposer ou ajuster le taux de change."
              >
                <CurrencyCircleDollar size={18} />
                <span>1 USD = {tauxActif.toLocaleString()} CDF</span>
                <span style={{ fontSize: '0.72rem', textDecoration: 'underline', opacity: 0.85 }}>Ajuster</span>
              </div>
            </div>

            {scanNotice && (
              <div
                style={{
                  margin: '8px 0 12px',
                  padding: '8px 14px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-strong)',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: '1px solid var(--border)',
                }}
              >
                {scanNotice}
              </div>
            )}

            {stockQuery.isLoading && <p>Chargement du catalogue...</p>}

            <div className="pos-product-grid">
              {catalog.map((stock) => {
                const dispo = stock.quantite ?? 0
                const specialPrice = (prixAgenceQuery.data ?? []).find(
                  (p: any) => p.articleId === stock.article?.id && p.statut === 'VALIDE' && p.actif
                )
                const proposedPrice = (prixAgenceQuery.data ?? []).find(
                  (p: any) => p.articleId === stock.article?.id && p.statut === 'PROPOSE'
                )
                const prixUsd = specialPrice ? Number(specialPrice.prix) : (stock.article?.prixVenteStandard ?? 10.0)
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
                      {specialPrice ? (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span>✓ Tarif Spécifique Validé Siège</span>
                        </div>
                      ) : proposedPrice ? (
                        <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span>⏳ Proposition ${Number(proposedPrice.prix).toFixed(2)} en attente Siège</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.70rem', color: 'var(--muted)', marginTop: 2 }}>
                          <span>Tarif standard Siège</span>
                        </div>
                      )}
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

              {selectedClient && (
                <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 6, fontSize: '0.76rem', border: '1px solid var(--border)' }}>
                  <div>Compte Client : <strong><code>{selectedClient.compteComptable || `411${String(selectedClient.id).padStart(3, '0')}`}</code></strong></div>
                  {(selectedClient.soldeDette ?? 0) > 0 ? (
                    <div style={{ color: 'var(--danger)', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Warning size={14} /> Dette en cours : ${selectedClient.soldeDette?.toFixed(2)} USD / Plafond : ${selectedClient.limiteCredit || 1000} USD
                    </div>
                  ) : (
                    <div style={{ color: 'var(--success)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={14} /> Compte régularisé (Plafond : ${selectedClient.limiteCredit || 1000} USD)
                    </div>
                  )}
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

            {/* INFORMATIONS DE TRANSPORT & EXPÉDITION (Facture A4, BL & Ticket) */}
            <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', margin: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                  <Truck size={16} style={{ color: 'var(--accent-strong)' }} /> Mode de Transport & Expédition :
                </span>
              </div>

              <select
                value={modeTransport}
                onChange={(e) => setModeTransport(e.target.value as any)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 6 }}
              >
                <option value="ENLEVEMENT_MAGASIN">Retrait comptoir (Enlèvement direct dépôt)</option>
                <option value="FLOTTE_ENTREPRISE">Camion Minoterie MVG (Flotte Interne)</option>
                <option value="VEHICULE_CLIENT">Véhicule apporté par le Client</option>
              </select>

              {modeTransport === 'FLOTTE_ENTREPRISE' && (
                <div style={{ marginBottom: 6 }}>
                  <select
                    value={selectedVehiculeId}
                    onChange={(e) => setSelectedVehiculeId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  >
                    <option value="">-- Sélectionner camion & chauffeur --</option>
                    {(flotteQuery.data ?? []).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.plaqueImmatriculation} - {v.marqueModele} ({v.chauffeurNom || 'Chauffeur'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modeTransport === 'VEHICULE_CLIENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <input
                    type="text"
                    placeholder="Plaque Véhicule"
                    value={clientVehicule}
                    onChange={(e) => setClientVehicule(e.target.value)}
                    style={{ padding: '5px 8px', fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <input
                    type="text"
                    placeholder="Nom Chauffeur"
                    value={clientChauffeur}
                    onChange={(e) => setClientChauffeur(e.target.value)}
                    style={{ padding: '5px 8px', fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                </div>
              )}

              {/* FRAIS DE TRANSPORT S'IL Y EN A */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block' }}>Frais de transport ($ USD) :</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>0 si enlèvement magasin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0.00"
                    value={posFraisTransport}
                    onChange={(e) => setPosFraisTransport(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    style={{ width: 80, padding: '4px 6px', fontSize: '0.9rem', fontWeight: 800, textAlign: 'right', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>$</span>
                </div>
              </div>
            </div>

            {/* TOTAUX & MODE DE RÈGLEMENT */}
            <div className="pos-cart-totals">
              {numPosFraisTransp > 0 && (
                <div className="pos-total-row" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  <span>Marchandises HT :</span>
                  <span>${totalMarchandisesUsd.toFixed(2)} USD</span>
                </div>
              )}
              {numPosFraisTransp > 0 && (
                <div className="pos-total-row" style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600 }}>
                  <span>Frais de Transport :</span>
                  <span>+${numPosFraisTransp.toFixed(2)} USD</span>
                </div>
              )}
              <div className="pos-total-row">
                <span>Total Net à Payer :</span>
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
                      setCheckoutMessage('Veuillez sélectionner un client enregistré avant de vendre à crédit !')
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={downloadUrl(`/api/export/print/ventes?agenceId=${agenceId}`)}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '6px 14px', textDecoration: 'none' }}
              >
                <Printer size={17} /> Imprimer Ventes (PDF)
              </a>
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
          </div>
          <DataTable
            columns={['Réf Vente', 'Date', 'Client', 'Total', 'Devise', 'Règlement', 'Statut Crédit', 'Annulation / Contrôle', 'Actions']}
            loading={salesQuery.isLoading}
            rows={(salesQuery.data ?? []).map((v: any) => {
              const dejaPaye = Number(v.montantPaye || 0)
              const reste = v.montantRestant !== undefined ? Number(v.montantRestant) : Math.max(0, Number(v.montantTotal || 0) - dejaPaye)
              const estSolde = v.statutCredit === 'REGLE' || reste <= 0.01

              return [
                v.referenceVente ?? `VTE-${v.id}`,
                v.dateVente ? new Date(v.dateVente).toLocaleString('fr-FR') : '-',
                v.client?.nom ?? 'Client Comptant',
                `$${Number(v.montantTotal || 0).toFixed(2)}`,
                v.devise ?? 'USD',
                v.estCredit ? (
                  <span key={'mod-' + v.id} style={{ color: '#b45309', fontWeight: 700 }}>
                    CRÉDIT
                  </span>
                ) : (
                  <span key={'mod-' + v.id} style={{ color: 'var(--success)', fontWeight: 600 }}>
                    CASH
                  </span>
                ),
                v.estCredit ? (
                  estSolde ? (
                    <span key={'st-' + v.id} className="badge badge-success">
                      ✓ Soldé
                    </span>
                  ) : (
                    <div key={'st-' + v.id}>
                      <span className={clsx('badge', v.statutCredit === 'PARTIEL' ? 'badge-warning' : 'badge-neutral')}>
                        {v.statutCredit === 'PARTIEL' ? 'Acompte' : 'À Recouvrer'}
                      </span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--danger)', marginTop: 2, fontWeight: 700 }}>
                        Reste : ${reste.toFixed(2)}
                      </div>
                    </div>
                  )
                ) : (
                  <span key={'st-' + v.id} className="badge badge-success">
                    Payé Comptant
                  </span>
                ),
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
                <div key={'acts-' + v.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {v.id ? (
                    <button
                      className="secondary-action"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      onClick={() => setActiveReceipt(v)}
                    >
                      <Printer size={15} /> Voir Ticket
                    </button>
                  ) : (
                    '-'
                  )}
                  {v.estCredit && v.id && !estSolde && (
                    <button
                      className="primary-action"
                      style={{ padding: '6px 10px', fontSize: '0.8rem', background: '#0284c7' }}
                      onClick={() => {
                        setSettlementVente(v)
                        setSettlementMontant(String(reste.toFixed(2)))
                        setSettlementDevise(v.devise || 'USD')
                        setSettlementCaisseId(caissesQuery.data?.[0]?.id || 1)
                        setSettlementModePaiement('CASH')
                        setSettlementReferencePiece('')
                        setSettlementError(null)
                      }}
                      title="Encaisser le règlement de cette vente à crédit"
                    >
                      <Wallet size={15} /> Régler
                    </button>
                  )}
                </div>,
              ]
            })}
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

      {/* ONGLET 6 : TARIFS DE L'AGENCE (FIXATION DES PRIX PAR LE CHEF D'AGENCE) */}
      {activeTab === 'tarifs' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={22} style={{ color: 'var(--accent-strong)' }} />
                Grille Tarifaire de l'Agence (Fixation des Prix par le Chef)
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Fixez et ajustez les prix de vente au sac/unité pour votre agence locale. Ces prix sont appliqués immédiatement aux caisses POS et aux encaissements QR Code.
              </p>
            </div>
          </div>

          {priceNotice && (
            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)', padding: '10px 14px', borderRadius: 8, fontWeight: 600 }}>
              {priceNotice}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={['Article / Produit', 'Type & Catégorie', 'Prix Référence Siège', 'Prix Appliqué en Caisse', 'Statut Proposition / Validation', 'Action Chef d\'Agence']}
              rows={(agencyPricesListQuery.data ?? []).map((art: any) => {
                const isCustom = art.aPrixSpecifique || (art.statut === 'VALIDE' && art.prixActifAgence !== art.prixStandardSiege)
                const isEditing = priceFormArticleId === art.articleId
                const hasPendingProposal = Boolean(art.propositionEnAttente)

                return [
                  <div>
                    <strong>{art.designation}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Code : {art.codeUnique}</div>
                  </div>,
                  <span className="badge">{art.type === 'PRODUIT_FINI' ? 'Farine MVG' : 'Sous-produit'}</span>,
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>${Number(art.prixStandardSiege || art.prixVenteStandard || 0).toFixed(2)} USD</span>,
                  <div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: isCustom ? '#16a34a' : 'var(--text)' }}>
                      ${Number(art.prixActifAgence || art.prixEffectif || art.prixVenteStandard || 0).toFixed(2)} USD
                    </span>
                    {isCustom && <span className="badge badge-success" style={{ marginLeft: 6, fontSize: '0.7rem' }}>Spécifique Validé</span>}
                  </div>,
                  <div>
                    {hasPendingProposal ? (
                      <div>
                        <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                          ⏳ Proposition $ {Number(art.propositionEnAttente.prix).toFixed(2)} USD en attente Siège
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                          {art.propositionEnAttente.proposePar || 'Chef d\'Agence'}
                        </div>
                      </div>
                    ) : isCustom ? (
                      <span className="badge badge-success">✓ Homologué par la Direction Siège</span>
                    ) : (
                      <span className="badge">Tarif Standard Siège</span>
                    )}
                  </div>,
                  <div>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          style={{ width: 85, padding: '5px 8px', fontSize: '0.88rem' }}
                          value={newAgencyPriceValue}
                          onChange={(e) => setNewAgencyPriceValue(e.target.value)}
                          placeholder="Ex: 27.0"
                          autoFocus
                        />
                        <button
                          className="primary-action"
                          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                          disabled={updateAgencyPriceMutation.isPending}
                          onClick={() => {
                            const p = Number(newAgencyPriceValue)
                            if (p > 0) {
                              updateAgencyPriceMutation.mutate({ articleId: art.articleId, prix: p })
                            }
                          }}
                        >
                          {isSiegeAdmin ? 'Valider' : 'Soumettre au Siège'}
                        </button>
                        <button
                          className="secondary-action"
                          style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                          onClick={() => setPriceFormArticleId(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        className="secondary-action"
                        style={{ padding: '5px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => {
                          setPriceFormArticleId(art.articleId)
                          setNewAgencyPriceValue(String(art.propositionEnAttente?.prix || art.prixActifAgence || art.prixEffectif || art.prixStandardSiege || ''))
                        }}
                      >
                        <PencilSimple size={15} /> {hasPendingProposal ? 'Modifier proposition' : 'Proposer nouveau prix'}
                      </button>
                    )}
                  </div>,
                ]
              })}
              emptyText="Aucun article disponible."
            />
          </div>
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
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setBlModeTransport('ENLEVEMENT_MAGASIN')}
                  >
                    <Storefront size={16} /> Retrait Comptoir
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', blModeTransport === 'VEHICULE_CLIENT' && 'active')}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setBlModeTransport('VEHICULE_CLIENT')}
                  >
                    <Car size={16} /> Véhicule Client
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', blModeTransport === 'FLOTTE_ENTREPRISE' && 'active')}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setBlModeTransport('FLOTTE_ENTREPRISE')}
                  >
                    <Truck size={16} /> Flotte Société
                  </button>
                </div>
              </div>

              {blModeTransport === 'ENLEVEMENT_MAGASIN' && (
                <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={15} color="var(--primary)" />
                  <span>Le client retire directement ses sacs au magasin/dépôt. Aucun véhicule de transport n'est mobilisé.</span>
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
                  Camion & Chauffeur Affecté ({entrepriseInfoQuery.data?.sigle || 'Flotte Entreprise'})
                  <select
                    value={blVehiculeId}
                    onChange={(e) => setBlVehiculeId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Sélectionner un véhicule de la flotte...</option>
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

      {/* MODAL : RÈGLEMENT D'UNE VENTE À CRÉDIT SPÉCIFIQUE (AVEC RÉFÉRENCE DE L'OPÉRATION) */}
      {settlementVente && (
        <div className="modal-overlay" onClick={() => setSettlementVente(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} color="#0284c7" />
                Règlement Vente à Crédit
              </h3>
              <button className="icon-button" onClick={() => setSettlementVente(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ margin: '12px 0 16px', background: 'var(--panel)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Réf Vente Origine :</span>
                <strong>{settlementVente.referenceVente || `VNT-${settlementVente.id}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Client :</span>
                <strong>{settlementVente.client?.nom || 'Client'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Montant Facturé :</span>
                <strong>${Number(settlementVente.montantTotal || 0).toFixed(2)} {settlementVente.devise || 'USD'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Déjà Payé :</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>${Number(settlementVente.montantPaye || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6, fontSize: '0.95rem' }}>
                <span style={{ fontWeight: 700 }}>Reste Dû sur cette Vente :</span>
                <strong style={{ color: 'var(--danger)', fontSize: '1.05rem' }}>
                  ${Number(settlementVente.montantRestant ?? (Number(settlementVente.montantTotal || 0) - Number(settlementVente.montantPaye || 0))).toFixed(2)} {settlementVente.devise || 'USD'}
                </strong>
              </div>
            </div>

            {settlementError && (
              <div className="notice warning" style={{ marginBottom: 12 }}>
                {settlementError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                reglerCreditMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Montant à Régler
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={settlementMontant}
                    onChange={(e) => setSettlementMontant(e.target.value)}
                    placeholder="Ex: 50.00"
                  />
                </label>
                <label>
                  Devise
                  <select
                    value={settlementDevise}
                    onChange={(e) => setSettlementDevise(e.target.value as 'USD' | 'CDF')}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Caisse / Banque d'Encaissement
                  <select
                    value={settlementCaisseId}
                    onChange={(e) => setSettlementCaisseId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    {(caissesQuery.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.type || 'CAISSE'}) - Solde: ${Number(c.soldeUsd).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mode de Paiement
                  <select
                    value={settlementModePaiement}
                    onChange={(e) => setSettlementModePaiement(e.target.value)}
                  >
                    <option value="CASH">Espèces / Cash</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </label>
              </div>

              <label>
                Pièce Justificative / N° Bordereau / Reçu
                <input
                  type="text"
                  value={settlementReferencePiece}
                  onChange={(e) => setSettlementReferencePiece(e.target.value)}
                  placeholder="ex: BORD-BANQUE-4819 ou RECU-CS-02"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="secondary-action" onClick={() => setSettlementVente(null)}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="primary-action"
                  disabled={reglerCreditMutation.isPending || !settlementMontant || Number(settlementMontant) <= 0}
                  style={{ background: '#0284c7' }}
                >
                  <CheckCircle size={16} />
                  {reglerCreditMutation.isPending ? 'Enregistrement...' : 'Valider Règlement & Passer Écritures'}
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
              scrollbarColor: 'var(--accent-strong) var(--surface-2)',
              width: 'min(100%, 500px)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* EN-TETE DE VISUALISATION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-strong)', fontWeight: 700, fontSize: '0.95rem' }}>
                <Receipt size={20} />
                <span>Reçu d'Encaissement & Vente</span>
              </div>
              <button className="icon-button" onClick={() => setActiveReceipt(null)} title="Fermer (Échap)">
                <X size={18} />
              </button>
            </div>

            {/* ACTION DIRECTE D'IMPRESSION IMMEDIATE DU TICKET (PAS BESOIN DE REMPLIR LE TRANSPORT) */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text)', display: 'block' }}>Ticket de caisse prêt</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Impression directe sans délai (le transport est renseigné ultérieurement)</span>
              </div>
              <button
                type="button"
                className="primary-action"
                style={{ fontSize: '0.9rem', padding: '8px 16px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => window.print()}
              >
                <Printer size={18} /> Imprimer Ticket Immédiatement
              </button>
            </div>

            <div className="thermal-ticket">
              <div className="ticket-header">
                <h3>{entrepriseInfoQuery.data?.nomSociete || entrepriseInfoQuery.data?.sigle || 'REÇU DE VENTE'}</h3>
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
              <div style={{ fontSize: 11, textAlign: 'left', background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text)' }}>
                <strong>Transport & Enlèvement :</strong><br/>
                {modeTransport === 'ENLEVEMENT_MAGASIN' && 'Retrait direct au comptoir / dépôt par le client'}
                {modeTransport === 'VEHICULE_CLIENT' && `Véhicule client : ${clientVehicule || 'Véhicule client'} ${clientChauffeur ? `(Chauffeur: ${clientChauffeur})` : ''}`}
                {modeTransport === 'FLOTTE_ENTREPRISE' && `Camion société : ${flotteQuery.data?.find((v: any) => v.id === selectedVehiculeId)?.marqueModele || 'Flotte Entreprise'}`}
              </div>

              <div className="ticket-line" />

              {/* VRAI QR CODE CERTIFIÉ DE LA VENTE CONTENANT L'AGENCE ET LES MONTANTS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0 6px', textAlign: 'center' }}>
                <RealQrCode
                  value={{
                    type: 'VENTE',
                    reference: activeReceipt.referenceVente || `VNT-${activeReceipt.id}`,
                    agenceId: activeReceipt.agenceId || agenceId,
                    nomAgence: activeReceipt.agence?.nom || `Agence #${activeReceipt.agenceId || agenceId}`,
                    dateVente: activeReceipt.dateVente,
                    montantTotal: activeReceipt.montantTotal,
                    montantCdf: Math.round((activeReceipt.montantTotal ?? 0) * tauxActif),
                    devise: activeReceipt.devise || 'USD',
                    taux: tauxActif,
                    lignes: (activeReceipt.details ?? []).map((d: any) => ({
                      artId: d.articleId,
                      qte: d.quantite,
                      pu: d.prixUnitaireApplique,
                    })),
                  }}
                  size={120}
                  includeLabel={false}
                />
                <span style={{ fontSize: '9px', color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                  QR Code certifié • Agence #{activeReceipt.agenceId || agenceId} • Scan & Écritures
                </span>
              </div>

              <div className="ticket-footer">
                <p style={{ margin: 0 }}>Les marchandises vendues ne sont ni reprises ni échangées.</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>MERCI POUR VOTRE VISITE !</p>
              </div>
            </div>

            {/* EXPÉDITION & BON DE LIVRAISON (OPTIONNEL / NON BLOQUANT POUR L'IMPRESSION DU TICKET) */}
            <details style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>
                <Truck size={17} style={{ color: 'var(--accent-strong)' }} />
                <span>Expédition & Bon de Livraison (BL) — Optionnel / Renseigné au quai</span>
              </summary>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <button
                    type="button"
                    className={clsx('tab-btn', modeTransport === 'ENLEVEMENT_MAGASIN' && 'active')}
                    style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setModeTransport('ENLEVEMENT_MAGASIN')}
                  >
                    <Storefront size={15} /> Retrait Comptoir
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', modeTransport === 'VEHICULE_CLIENT' && 'active')}
                    style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setModeTransport('VEHICULE_CLIENT')}
                  >
                    <Car size={15} /> Véhicule Client
                  </button>
                  <button
                    type="button"
                    className={clsx('tab-btn', modeTransport === 'FLOTTE_ENTREPRISE' && 'active')}
                    style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setModeTransport('FLOTTE_ENTREPRISE')}
                  >
                    <Truck size={15} /> Camion Société
                  </button>
                </div>

                {modeTransport === 'ENLEVEMENT_MAGASIN' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', background: 'var(--surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} color="var(--primary)" />
                    <span>Le client retire directement ses sacs au magasin / dépôt. Aucun camion de l'entreprise n'est immobilisé.</span>
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
            </details>

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

      {/* MODAL SCANNER CAMÉRA QR CODE */}
      <QrScannerModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onScan={handleQrScan}
        title="Scanner Caméra - QR Code Produit, Lot ou Vente Agence"
      />

      {/* MODAL DE PASSATION DES ÉCRITURES ET ENCAISSEMENT POS DEPUIS LE QR CODE SCANNÉ */}
      <QrAccountingModal
        isOpen={showAccountingQrModal}
        onClose={() => {
          setShowAccountingQrModal(false)
          setScannedQrPayload(null)
          setLastCompletedSale(null)
        }}
        payload={scannedQrPayload}
        onPasserEcritures={(p) => passerEcritureQrMutation.mutate(p)}
        isPending={passerEcritureQrMutation.isPending}
        userAgenceNom="Votre Agence Locale"
        prixFixeChefAgence={
          scannedQrPayload?.prix ||
          prixAgenceQuery.data?.find((p: any) => p.articleId === scannedQrPayload?.articleId && p.actif)?.prix ||
          25
        }
        clients={clientsQuery.data ?? []}
        vehicules={flotteQuery.data ?? []}
        caisses={caissesQuery.data ?? []}
        tauxDuJour={tauxActif}
        lastCompletedSale={lastCompletedSale}
        onResetCompletedSale={() => setLastCompletedSale(null)}
      />

      {/* MODAL PROPOSITION / AJUSTEMENT DU TAUX DE CHANGE PAR LE CHEF D'AGENCE */}
      {showTauxModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTauxModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            padding: 16,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: '100%',
              margin: 'auto',
              padding: 26,
              borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', fontWeight: 700 }}>
                <CurrencyCircleDollar size={24} style={{ color: 'var(--accent-strong)' }} />
                Ajuster / Proposer le Taux de Change
              </h3>
              <button className="icon-button" onClick={() => setShowTauxModal(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Le taux de change n'est pas codé en dur : le chef d'agence peut proposer ou actualiser le taux de change actif pour les opérations de vente et écritures de caisse.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const val = Number(nouveauTauxPropose)
                if (!val || val <= 0) return
                proposerTauxMutation.mutate(val)
              }}
              style={{ display: 'grid', gap: 14 }}
            >
              <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>Taux actuellement actif (Agence #{agenceId}) :</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text)' }}>1 USD = {tauxActif.toLocaleString()} CDF</strong>
              </div>

              <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Nouveau Taux proposé (1 USD en CDF) :
                <input
                  type="number"
                  step="10"
                  required
                  min="1000"
                  max="10000"
                  value={nouveauTauxPropose}
                  onChange={(e) => setNouveauTauxPropose(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '1.05rem', marginTop: 6 }}
                  placeholder="ex: 2850"
                  autoFocus
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="secondary-action" onClick={() => setShowTauxModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={proposerTauxMutation.isPending}>
                  {proposerTauxMutation.isPending ? 'Enregistrement...' : 'Valider & Appliquer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN COMMERCIAL */}
      <NewEtatBesoinModal
        isOpen={showSalesEB}
        onClose={() => setShowSalesEB(false)}
        defaultService="Service Commercial & Ventes"
        agenceId={agenceId}
      />
    </section>
  )
}

function StockPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) =>
    typeof state.selectedAgenceId === 'number'
      ? state.selectedAgenceId
      : (state.session?.agenceId ?? 1)
  )
  const [activeTab, setActiveTab] = useState<'inventory' | 'corrections' | 'catalogue'>('inventory')
  const [showModal, setShowModal] = useState(false)
  const [showNewArticleModal, setShowNewArticleModal] = useState(false)
  const [showStockEB, setShowStockEB] = useState(false)
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
          <button
            className="secondary-action"
            onClick={() => setShowStockEB(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour le matériel de stockage, sacs ou entretien dépôt"
          >
            <Coins size={18} /> État de Besoin Stock & Dépôt
          </button>
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
            href={downloadUrl(`/api/export/print/inventaire?agenceId=${agenceId}`)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Printer size={18} /> Imprimer Inventaire (PDF)
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
      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN STOCK & DÉPÔT */}
      <NewEtatBesoinModal
        isOpen={showStockEB}
        onClose={() => setShowStockEB(false)}
        defaultService="Service Stock & Magasin"
        agenceId={agenceId}
      />
    </section>
  )
}

function ProductionPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const session = useAppStore((state) => state.session)
  const selectedAgenceId = useAppStore((state) => state.selectedAgenceId)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)
  const [activeTab, setActiveTab] = useState<'ordres' | 'recettes'>('ordres')
  const [showNewOrdreModal, setShowNewOrdreModal] = useState(false)
  const [showNewRecetteModal, setShowNewRecetteModal] = useState(false)
  const [prodAgenceId, setProdAgenceId] = useState<number>(typeof selectedAgenceId === 'number' ? selectedAgenceId : (session?.agenceId ?? 1))
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
  const [showProdEB, setShowProdEB] = useState(false)

  const { data: agencesList } = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  const { data: ordres, isLoading: ordresLoading } = useQuery({
    queryKey: ['production-ordres', selectedAgenceId],
    queryFn: () => {
      const url = selectedAgenceId && selectedAgenceId !== 'CONSOLIDE'
        ? `/api/production/ordres?agenceId=${selectedAgenceId}`
        : '/api/production/ordres'
      return apiRequest<any[]>(url, { token })
    },
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
          agenceId: prodAgenceId,
          articleFiniId: Number(articleFiniId),
          quantitePrevue: Number(quantitePrevue),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-ordres'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="secondary-action"
            onClick={() => setShowProdEB(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour les intrants de fabrication, sacs ou maintenance minoterie"
          >
            <Coins size={17} /> État de Besoin Production
          </button>
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
          columns={['Réf. Ordre', 'Site / Agence', 'Produit fabriqué', 'Quantité prévue', 'Quantité réelle', 'Statut', 'Lot généré', 'Date', 'Action']}
          loading={ordresLoading}
          rows={(ordres ?? []).map((op: any) => [
            <strong key={'ref-' + op.id}>{op.codeOrdre}</strong>,
            <span key={'ag-' + op.id} className="badge badge-info" style={{ fontSize: '0.78rem' }}>
              {op.agence?.nom || (agencesList ?? []).find((a: any) => a.id === op.agenceId)?.nom || (op.agenceId === 1 ? 'Siège Social Goma' : `Agence #${op.agenceId}`)}
            </span>,
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
              La planification réserve les matières premières requises selon la recette homologuée. Même les agences disposent de lignes de production locales autonomes.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createOrdreMutation.mutate(); }}>
              <label>
                Site / Agence de production (Minoterie ou Usine)
                <select value={prodAgenceId} onChange={(e) => setProdAgenceId(Number(e.target.value))} required>
                  {(agencesList ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.estSiege ? '[Siège] ' : ''}{ag.nom} ({ag.ville})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ marginTop: 12 }}>
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
          <div className="modal-card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={24} style={{ color: 'var(--accent-strong)' }} />
                Étiquette QR Code Certifiée (Sac / Carton / Bidon)
              </h3>
              <button className="icon-button" onClick={() => setGeneratedLotInfo(null)} aria-label="Fermer"><X size={18} /></button>
            </div>

            {/* STICKER ADHÉSIF MINOTERIE MVG */}
            <div
              id="printable-lot-sticker"
              style={{
                margin: '12px 0',
                padding: '16px 18px',
                border: '2px solid #0284c7',
                borderRadius: 10,
                background: '#ffffff',
                color: '#0f172a',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                textAlign: 'center',
              }}
            >
              <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: 6, marginBottom: 8 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0284c7' }}>
                  MINOTERIE DU VIRUNGA (MVG SARL)
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  SYSTÈME DE TRAÇABILITÉ OFFICIEL • ATELIER DE PRODUCTION
                </div>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {generatedLotInfo.ordre?.articleFini?.designation || 'Farine de Maïs Extra 25kg'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', padding: '4px 8px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <span>Code : <strong>{generatedLotInfo.ordre?.articleFini?.codeArticle || generatedLotInfo.ordre?.articleFini?.codeUnique || 'FAR-25KG'}</strong></span>
                <span>Lot FEFO : <strong>{generatedLotInfo.numeroLot}</strong></span>
              </div>

              {/* QR CODE OFFICIEL SANS PRIX AVEC LOGO MVG AU CENTRE */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <RealQrCode
                  value={JSON.stringify({
                    type: 'LOT',
                    articleId: generatedLotInfo.ordre?.articleFiniId || generatedLotInfo.ordre?.articleFini?.id,
                    codeArticle: generatedLotInfo.ordre?.articleFini?.codeArticle || generatedLotInfo.ordre?.articleFini?.codeUnique || 'ART-LOT',
                    numeroLot: generatedLotInfo.numeroLot,
                    designation: generatedLotInfo.ordre?.articleFini?.designation || 'Farine de Maïs Extra',
                    conditionnement: 'Sac de 25 kg / Bidon / Carton',
                    dateFabrication: (generatedLotInfo.ordre?.dateCloture || new Date().toISOString()).slice(0, 10),
                    dateExpiration: '2027-06-30',
                    codeUnique: generatedLotInfo.numeroLot,
                  })}
                  size={150}
                  logoText="MVG"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '10px', textAlign: 'left', background: '#f1f5f9', padding: '6px 8px', borderRadius: 4 }}>
                <div>Quantité : <strong>{generatedLotInfo.ordre?.quantiteReelle || generatedLotInfo.ordre?.quantitePrevue || 50} unités</strong></div>
                <div>Emballage : <strong>Sac / Bidon / Carton</strong></div>
                <div>Date Prod : <strong>{(generatedLotInfo.ordre?.dateCloture || new Date().toISOString()).slice(0, 10)}</strong></div>
                <div>Expiration : <strong>2027-06-30</strong></div>
              </div>

              <div style={{ marginTop: 8, fontSize: '8.5px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: 4, borderRadius: 4 }}>
                ✓ QR sans prix fixe : le prix de vente sera détecté dynamiquement selon le tarif agence fixé par le Chef d'Agence lors du scan au POS ou en écriture comptable.
              </div>
            </div>

            {(() => {
              const qteProduite = Number(generatedLotInfo.ordre?.quantiteReelle) || Number(generatedLotInfo.ordre?.quantitePrevue) || 50
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                  {generatedLotInfo.ordre?.id ? (
                    <a
                      href={`/api/production/ordres/${generatedLotInfo.ordre.id}/etiquettes?count=${qteProduite}`}
                      target="_blank"
                      rel="noreferrer"
                      className="primary-action"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: '0.84rem', background: '#0284c7' }}
                      title={`Imprimer les ${qteProduite} étiquettes QR pour chaque carton/sac produit`}
                    >
                      <Printer size={16} /> Imprimer les {qteProduite} Étiquettes (1 par sac/bidon)
                    </a>
                  ) : <span />}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="secondary-action" onClick={() => setGeneratedLotInfo(null)}>
                      Fermer
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => window.print()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title="Imprimer un sticker adhésif unique"
                    >
                      <Printer size={17} /> Sticker Unique (1/1)
                    </button>
                  </div>
                </div>
              )
            })()}
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
                <small style={{ color: 'var(--muted)' }}>ATELIER DE TRANSFORMATION & PRODUCTION</small>
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
      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN PRODUCTION */}
      <NewEtatBesoinModal
        isOpen={showProdEB}
        onClose={() => setShowProdEB(false)}
        defaultService="Service Production & Minoterie"
        agenceId={typeof prodAgenceId === 'number' ? prodAgenceId : 1}
      />
    </section>
  )
}

function TreasuryPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const agenceId = useAppStore((state) =>
    typeof state.selectedAgenceId === 'number'
      ? state.selectedAgenceId
      : (state.session?.agenceId ?? 1)
  )
  const can = useAppStore((state) => state.can)
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const entrepriseQuery = useQuery({
    queryKey: ['entreprise-info'],
    queryFn: () => apiRequest<any>('/api/parametrage/entreprise', { token }),
    enabled: Boolean(token),
  })

  const sessionRole = useAppStore((state) => state.session?.role)
  const isSiegeOrSuperAdmin = sessionRole === 'SUPER_ADMIN' || sessionRole === 'ADMIN_SIEGE'

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
  const [ebFilter, setEbFilter] = useState<'TOUS' | 'SOUMIS' | 'ATTENTE_VISA_SIEGE' | 'APPROUVE' | 'DECAISSE' | 'REJETE'>('TOUS')

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

  const visaSiegeEBMutation = useMutation({
    mutationFn: (ebId: number) =>
      apiRequest<{ message: string; etatBesoin: EtatBesoin }>(`/api/etats-besoin/${ebId}/visa-siege`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etats-besoin'] })
      setActionError(null)
    },
    onError: (err: any) => setActionError(err.message || "Erreur lors de l'octroi du visa de direction siège"),
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

  // Formulaire nouvelle caisse avec compte comptable préenregistré
  const [nomCaisse, setNomCaisse] = useState('')
  const [typeCaisse, setTypeCaisse] = useState<'CAISSE' | 'BANQUE'>('CAISSE')
  const [caisseAgenceId, setCaisseAgenceId] = useState<number>(agenceId)
  const [compteComptableCaisse, setCompteComptableCaisse] = useState('571')
  const [numeroBancaire, setNumeroBancaire] = useState('')
  const [caisseResponsable, setCaisseResponsable] = useState('')
  const [soldeInitialUsd, setSoldeInitialUsd] = useState('0')
  const [soldeInitialCdf, setSoldeInitialCdf] = useState('0')

  // Requêtes
  const planComptableCaisseQuery = useQuery({
    queryKey: ['plan-comptable'],
    queryFn: () => apiRequest<PlanComptable[]>('/api/comptabilite/plan', { token }),
    enabled: Boolean(token),
  })

  const agencesListQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

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
          type: typeCaisse,
          agenceId: caisseAgenceId || agenceId,
          numeroCompteComptable: compteComptableCaisse,
          numeroCompteBancaire: typeCaisse === 'BANQUE' ? numeroBancaire : undefined,
          responsableNom: caisseResponsable || undefined,
          soldeUsd: Number(soldeInitialUsd),
          soldeCdf: Number(soldeInitialCdf),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['plan-comptable'] })
      setShowNewCaisseModal(false)
      setNomCaisse('')
      setNumeroBancaire('')
      setCaisseResponsable('')
      setCompteComptableCaisse('571')
      setSoldeInitialUsd('0')
      setSoldeInitialCdf('0')
      setActionError(null)
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
            href={downloadUrl(`/api/export/print/etats-besoin?agenceId=${agenceId}`)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            title="Imprimer les états de besoin au format PDF"
          >
            <Printer size={17} /> Imprimer États de Besoin (PDF)
          </a>
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
            href={downloadUrl(`/api/export/print/tresorerie?agenceId=${agenceId}`)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            title="Imprimer les mouvements de trésorerie au format PDF"
          >
            <Printer size={17} /> Imprimer Trésorerie (PDF)
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
              {(['TOUS', 'SOUMIS', 'ATTENTE_VISA_SIEGE', 'APPROUVE', 'DECAISSE', 'REJETE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={clsx('tab-button', ebFilter === st && 'active')}
                  style={{ fontSize: '0.76rem', padding: '3px 8px' }}
                  onClick={() => setEbFilter(st)}
                >
                  {st === 'TOUS'
                    ? 'Tous'
                    : st === 'SOUMIS'
                    ? 'En attente Chef'
                    : st === 'ATTENTE_VISA_SIEGE'
                    ? 'Attente Visa Siège'
                    : st === 'APPROUVE'
                    ? 'Prêts à décaisser'
                    : st === 'DECAISSE'
                    ? 'Décaissés'
                    : 'Rejetés'}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={['N° EB / Date', 'Service & Demandeur', 'Motif / Justification', 'Montant', 'Compte', 'Statut Circuit', 'Pièce Caisse', 'Actions']}
            loading={etatsBesoinQuery.isLoading}
            rows={(etatsBesoinQuery.data ?? [])
              .filter((eb) => {
                if (ebFilter === 'TOUS') return true
                if (ebFilter === 'APPROUVE') return eb.statut === 'APPROUVE_CHEF' || eb.statut === 'APPROUVE_SIEGE'
                return eb.statut === ebFilter
              })
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
                <div key={eb.id + '-stat'}>
                  <span
                    className={clsx(
                      'badge',
                      eb.statut === 'DECAISSE' && 'badge-success',
                      eb.statut === 'APPROUVE_CHEF' && 'badge-neutral',
                      eb.statut === 'APPROUVE_SIEGE' && 'badge-success',
                      eb.statut === 'SOUMIS' && 'badge-warning',
                      eb.statut === 'REJETE' && 'badge-danger'
                    )}
                    style={{
                      fontSize: '0.74rem',
                      ...(eb.statut === 'ATTENTE_VISA_SIEGE' ? { background: '#8b5cf6', color: '#fff' } : {}),
                    }}
                  >
                    {eb.statut === 'DECAISSE'
                      ? 'Décaissé en Caisse'
                      : eb.statut === 'APPROUVE_CHEF'
                      ? 'Validé Chef Agence'
                      : eb.statut === 'APPROUVE_SIEGE'
                      ? 'Visé Direction Siège'
                      : eb.statut === 'ATTENTE_VISA_SIEGE'
                      ? 'Attente Visa Siège'
                      : eb.statut === 'SOUMIS'
                      ? 'En attente Chef'
                      : 'Rejeté'}
                  </span>
                  {eb.visaSiegeNom && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle size={11} color="var(--primary)" /> Visa : {eb.visaSiegeNom}
                    </div>
                  )}
                </div>,
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

                  {eb.statut === 'ATTENTE_VISA_SIEGE' && (
                    <>
                      {isSiegeOrSuperAdmin && (
                        <button
                          type="button"
                          className="primary-action"
                          style={{ padding: '3px 8px', fontSize: '0.74rem', background: '#8b5cf6' }}
                          onClick={() => visaSiegeEBMutation.mutate(eb.id)}
                          disabled={visaSiegeEBMutation.isPending}
                          title="Accorder le visa de direction générale siège obligatoire (> seuil)"
                        >
                          <ShieldCheck size={14} /> Visa Siège
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '3px 8px', fontSize: '0.74rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => {
                          const r = prompt('Motif du rejet du visa siège :')
                          if (r) rejeterEBMutation.mutate({ ebId: eb.id, motifRejet: r })
                        }}
                        title="Rejeter la demande"
                      >
                        <XCircle size={14} /> Refuser
                      </button>
                    </>
                  )}

                  {(eb.statut === 'APPROUVE_CHEF' || eb.statut === 'APPROUVE_SIEGE') && (
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
                <div className="caisse-card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', display: 'block' }}>{c.nom}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                      {c.type === 'BANQUE' ? 'Compte Bancaire' : 'Caisse d\'Espèces'}
                      {c.numeroCompteBancaire && ` • ${c.numeroCompteBancaire}`}
                      {c.responsableNom && ` • Resp: ${c.responsableNom}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="badge badge-neutral">Agence #{c.agence?.id ?? c.agenceId ?? agenceId}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                      OHADA : {c.numeroCompteComptable || (c.type === 'BANQUE' ? '521' : '571')}
                    </span>
                  </div>
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
                {money(r.ecart, r.devise)} {Math.abs(r.ecart) < 0.01 ? '(Équilibré)' : '(Écart)'}
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

      {/* MODAL : NOUVEAU COMPTE CAISSE OU BANQUE */}
      {showNewCaisseModal && (
        <div className="modal-overlay" onClick={() => setShowNewCaisseModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Nouveau Compte de Trésorerie</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Rattachement obligatoire à un compte comptable OHADA préenregistré
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowNewCaisseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createCaisseMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12, marginTop: 14 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Type de compte
                  <select
                    value={typeCaisse}
                    onChange={(e) => {
                      const t = e.target.value as 'CAISSE' | 'BANQUE'
                      setTypeCaisse(t)
                      if (t === 'BANQUE') {
                        setCompteComptableCaisse('521')
                      } else {
                        setCompteComptableCaisse('571')
                      }
                    }}
                  >
                    <option value="CAISSE">Caisse d'Espèces</option>
                    <option value="BANQUE">Compte Bancaire</option>
                  </select>
                </label>

                {isSiegeOrSuperAdmin ? (
                  <label>
                    Agence d'affectation
                    <select
                      value={caisseAgenceId}
                      onChange={(e) => setCaisseAgenceId(Number(e.target.value))}
                    >
                      {(agencesListQuery.data ?? []).map((ag: any) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.nom} ({ag.ville})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Agence d'affectation
                    <input
                      disabled
                      value={`Agence locale #${agenceId}`}
                      style={{ background: 'var(--surface-2)', cursor: 'not-allowed' }}
                    />
                  </label>
                )}
              </div>

              <label>
                Intitulé du compte
                <input
                  required
                  value={nomCaisse}
                  onChange={(e) => setNomCaisse(e.target.value)}
                  placeholder={typeCaisse === 'BANQUE' ? 'ex: Rawbank USD Compte Courant' : 'ex: Caisse Ventes Comptoir USD'}
                />
              </label>

              {/* NUMERO DE COMPTE OHADA PRÉENREGISTRÉ */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 6, display: 'grid', gap: 6 }}>
                <label style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: '0.85rem' }}>
                  Numéro de compte préenregistré dans le Plan Comptable OHADA (Classe 5) *
                </label>
                <select
                  required
                  value={compteComptableCaisse}
                  onChange={(e) => setCompteComptableCaisse(e.target.value)}
                  style={{ background: '#ffffff', borderColor: '#86efac' }}
                >
                  {(planComptableCaisseQuery.data ?? [])
                    .filter((p) => p.numero.startsWith('5'))
                    .map((p) => (
                      <option key={p.numero} value={p.numero}>
                        {p.numero} - {p.libelle}
                      </option>
                    ))}
                  {/* Options de base au cas où */}
                  {!(planComptableCaisseQuery.data ?? []).some((p) => p.numero === '571') && (
                    <option value="571">571 - Caisse principale Devises USD</option>
                  )}
                  {!(planComptableCaisseQuery.data ?? []).some((p) => p.numero === '5711') && (
                    <option value="5711">5711 - Caisse Ventes Comptoir USD</option>
                  )}
                  {!(planComptableCaisseQuery.data ?? []).some((p) => p.numero === '572') && (
                    <option value="572">572 - Caisse principale CDF</option>
                  )}
                  {!(planComptableCaisseQuery.data ?? []).some((p) => p.numero === '521') && (
                    <option value="521">521 - Banques locales CDF</option>
                  )}
                  {!(planComptableCaisseQuery.data ?? []).some((p) => p.numero === '522') && (
                    <option value="522">522 - Banques locales USD</option>
                  )}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.74rem', color: '#15803d' }}>
                    Ou saisir un sous-compte spécifique :
                  </span>
                  <input
                    value={compteComptableCaisse}
                    onChange={(e) => setCompteComptableCaisse(e.target.value)}
                    placeholder="ex: 57105"
                    style={{ width: 110, fontSize: '0.78rem', padding: '3px 6px', background: '#ffffff' }}
                  />
                </div>
              </div>

              {typeCaisse === 'BANQUE' && (
                <label>
                  Numéro de compte bancaire / IBAN / RIB
                  <input
                    value={numeroBancaire}
                    onChange={(e) => setNumeroBancaire(e.target.value)}
                    placeholder="ex: 00018-05100-01293847201-92"
                  />
                </label>
              )}

              <label>
                Responsable du compte / Caissier assigné (optionnel)
                <input
                  value={caisseResponsable}
                  onChange={(e) => setCaisseResponsable(e.target.value)}
                  placeholder="ex: Jean Kasongo (Guichet 1)"
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
                  {createCaisseMutation.isPending ? 'Enregistrement...' : 'Créer et lier au Plan OHADA'}
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
                <h2>{entrepriseQuery.data?.nomSociete || entrepriseQuery.data?.sigle || 'BON DE TRÉSORERIE'}</h2>
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
  const session = useAppStore((state) => state.session)
  const isSiegeOrSuperAdmin = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | 'CONSOLIDE'>(
    isSiegeOrSuperAdmin ? 'CONSOLIDE' : (session?.agenceId ?? 1)
  )

  const activeAgenceId = selectedAgenceId === 'CONSOLIDE' ? undefined : Number(selectedAgenceId)
  const agenceParam = activeAgenceId ? `agenceId=${activeAgenceId}` : ''
  const agenceId = activeAgenceId ?? session?.agenceId ?? 1

  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  const [activeTab, setActiveTab] = useState<'journal' | 'balance' | 'performance' | 'plan' | 'cloture' | 'immobilisations' | 'schemas' | 'bilan' | 'classes' | 'clients-auxiliaires'>('journal')
  const [mois, setMois] = useState(new Date().getMonth() + 1)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [planSearch, setPlanSearch] = useState('')
  const [planClasseFilter, setPlanClasseFilter] = useState<string>('TOUTES')

  // Modales Plan Comptable Adaptable
  const [showEditCompteModal, setShowEditCompteModal] = useState(false)
  const [editingCompte, setEditingCompte] = useState<PlanComptable | null>(null)
  const [editLibelle, setEditLibelle] = useState('')
  const [editParent, setEditParent] = useState('')

  // Rapport par classe comptable SYSCOHADA (Classes 1 à 8)
  const classesComptablesQuery = useQuery({
    queryKey: ['classes-comptables', selectedAgenceId, annee],
    queryFn: () => apiRequest<any>(`/api/comptabilite/classes?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`, { token }),
    enabled: Boolean(token) && activeTab === 'classes',
  })

  // Comptes clients 411 auxiliaires & suivi individuel
  const comptesAuxiliairesQuery = useQuery({
    queryKey: ['comptes-auxiliaires-clients', selectedAgenceId],
    queryFn: () => apiRequest<any[]>(`/api/comptabilite/clients/comptes-auxiliaires?${agenceParam}`, { token }),
    enabled: Boolean(token) && activeTab === 'clients-auxiliaires',
  })

  const [selectedAuxClient, setSelectedAuxClient] = useState<any | null>(null)
  const clientGrandLivreQuery = useQuery({
    queryKey: ['client-grand-livre', selectedAuxClient?.id],
    queryFn: () => apiRequest<any>(`/api/comptabilite/clients/${selectedAuxClient?.id}/grand-livre`, { token }),
    enabled: Boolean(token) && Boolean(selectedAuxClient),
  })

  const bilanQuery = useQuery({
    queryKey: ['bilan', selectedAgenceId, annee],
    queryFn: () => apiRequest<any>(`/api/comptabilite/bilan?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`, { token }),
    enabled: Boolean(token),
  })
  const [showNewCompteModal, setShowNewCompteModal] = useState(false)
  const [nouveauNumero, setNouveauNumero] = useState('')
  const [nouveauLibelle, setNouveauLibelle] = useState('')
  const [compteParent, setCompteParent] = useState('')
  const [clotureNotice, setClotureNotice] = useState<string | null>(null)

  // Paramétrage des comptes automatiques
  const schemasQuery = useQuery({
    queryKey: ['parametrage-schemas'],
    queryFn: () => apiRequest<any>('/api/comptabilite/parametrage-schemas', { token }),
    enabled: Boolean(token),
  })
  const [schemasConfig, setSchemasConfig] = useState<any>({
    compteVenteMarchandises: '701',
    compteTvaCollectee: '443',
    compteClientOrdinaire: '411',
    compteCaisseUsd: '571',
    compteCaisseCdf: '572',
    compteBanque: '521',
    compteVirementsInternes: '585',
    compteFournisseurs: '401',
    compteAchatsMatieres: '601',
    compteChargesExploitation: '605',
    compteProduitsAccessoires: '706',
    compteStocksProduitsFinis: '31',
    compteVariationStocks: '713',
    compteLiaisonInterAgences: '181',
    comptePersonnelRemuneration: '421',
    compteChargesPersonnel: '661',
    compteChargesSocialesPatronales: '664',
  })
  const [schemasNotice, setSchemasNotice] = useState<string | null>(null)

  useEffect(() => {
    if (schemasQuery.data) {
      setSchemasConfig(schemasQuery.data)
    }
  }, [schemasQuery.data])

  const saveSchemasMutation = useMutation({
    mutationFn: (updated: any) =>
      apiRequest('/api/comptabilite/parametrage-schemas', {
        method: 'PUT',
        token,
        body: JSON.stringify(updated),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['parametrage-schemas'] })
      setSchemasNotice(data.message || 'Paramétrage des schémas d écritures enregistré avec succès !')
      setTimeout(() => setSchemasNotice(null), 5000)
    },
    onError: (err: any) => {
      setSchemasNotice(err.message || 'Erreur lors de l enregistrement du paramétrage')
      setTimeout(() => setSchemasNotice(null), 5000)
    },
  })

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
    queryKey: ['ecritures', selectedAgenceId],
    queryFn: () => apiRequest<EcritureComptable[]>(`/api/comptabilite/ecritures?${agenceParam}`, { token }),
    enabled: Boolean(token),
  })

  const balanceQuery = useQuery({
    queryKey: ['balance', selectedAgenceId, mois, annee],
    queryFn: () =>
      apiRequest<LigneFinanciere[]>(
        `/api/comptabilite/balance?${agenceParam ? agenceParam + '&' : ''}mois=${mois}&annee=${annee}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  const performanceQuery = useQuery({
    queryKey: ['performance-services', selectedAgenceId, mois, annee],
    queryFn: () =>
      apiRequest<ServicePerformance[]>(
        `/api/comptabilite/performance-services?${agenceParam ? agenceParam + '&' : ''}mois=${mois}&annee=${annee}`,
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
          parentNumero: compteParent || undefined,
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

  // Mutation modification compte
  const updateCompteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/comptabilite/plan/${editingCompte?.numero}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          libelle: editLibelle,
          parentNumero: editParent || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comptable-full'] })
      queryClient.invalidateQueries({ queryKey: ['plan-comptable'] })
      setShowEditCompteModal(false)
      setEditingCompte(null)
      setEditLibelle('')
      setEditParent('')
    },
  })

  // Mutation suppression compte
  const deleteCompteMutation = useMutation({
    mutationFn: (numero: string) =>
      apiRequest(`/api/comptabilite/plan/${numero}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-comptable-full'] })
      queryClient.invalidateQueries({ queryKey: ['plan-comptable'] })
    },
  })

  // Mutation saisie écriture manuelle (OD)
  const addManualEcritureMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/comptabilite/ecritures/manuelle', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId: activeAgenceId || session?.agenceId || 1,
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
  const filteredPlan = planComptable.filter((c) => {
    const matchText =
      c.numero.toLowerCase().includes(planSearch.toLowerCase()) ||
      c.libelle.toLowerCase().includes(planSearch.toLowerCase())
    if (!matchText) return false
    if (planClasseFilter && planClasseFilter !== 'TOUTES') {
      const targetClasse = Number(planClasseFilter)
      if (c.classe !== targetClasse && Number(c.numero.charAt(0)) !== targetClasse) {
        return false
      }
    }
    return true
  })

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
            href={`/api/comptabilite/export/grand-livre?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Grand Livre général des comptes"
          >
            <Printer size={17} /> Grand Livre
          </a>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/compte-resultat?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Compte de Résultat analytique"
          >
            <Printer size={17} /> Compte Résultat
          </a>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/immobilisations?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Tableau des Immobilisations & Amortissements OHADA"
          >
            <Printer size={17} /> Tableau Amortissements
          </a>
          <a
            className="secondary-action"
            href={`/api/comptabilite/export/bilan?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`}
            target="_blank"
            rel="noreferrer"
            title="Imprimer le Bilan Officiel SYSCOHADA (Actif & Passif équilibré)"
          >
            <Printer size={17} /> Bilan SYSCOHADA
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
            <a className="primary-action" href={`/api/reporting/export/balance?${agenceParam ? agenceParam + '&' : ''}mois=${mois}&annee=${annee}`} target="_blank" rel="noreferrer">
              <FilePdf size={17} /> Télécharger Balance PDF
            </a>
          )}
          {activeTab === 'bilan' && (
            <a
              className="primary-action"
              href={`/api/comptabilite/export/bilan?${agenceParam ? agenceParam + '&' : ''}annee=${annee}`}
              target="_blank"
              rel="noreferrer"
            >
              <FilePdf size={17} /> Télécharger Bilan Officiel (PDF)
            </a>
          )}
          {activeTab === 'plan' && (
            <button className="primary-action" onClick={() => {
              setCompteParent('')
              setNouveauNumero('')
              setNouveauLibelle('')
              setShowNewCompteModal(true)
            }}>
              <Plus size={17} /> Nouveau Compte OHADA
            </button>
          )}
        </div>
      </div>

      {/* BANNIÈRE DE GOUVERNANCE COMPTABLE D'AGENCE / SIÈGE */}
      {isSiegeOrSuperAdmin ? (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Buildings size={22} style={{ color: 'var(--accent)' }} />
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text)', display: 'block' }}>Périmètre Comptable Actif :</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Chaque agence dispose de son service comptable autonome. Le siège peut auditer individuellement ou consolider.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={clsx('tab-button', selectedAgenceId === 'CONSOLIDE' && 'active')}
              style={{ fontSize: '0.82rem', padding: '5px 12px', fontWeight: selectedAgenceId === 'CONSOLIDE' ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setSelectedAgenceId('CONSOLIDE')}
            >
              <Buildings size={15} /> Bilan & Journal Consolidé Siège (Toutes Agences)
            </button>
            {(agencesQuery.data ?? []).map((ag: any) => (
              <button
                key={ag.id}
                type="button"
                className={clsx('tab-button', selectedAgenceId === ag.id && 'active')}
                style={{ fontSize: '0.82rem', padding: '5px 12px', fontWeight: selectedAgenceId === ag.id ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setSelectedAgenceId(ag.id)}
              >
                <MapPin size={15} /> {ag.nom} {ag.estSiege ? '(Siège)' : ''}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Buildings size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'block' }}>
              Service de Comptabilité Autonome — {(agencesQuery.data ?? []).find((a: any) => a.id === (session?.agenceId ?? 1))?.nom || `Agence #${session?.agenceId || 1}`}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Toutes les transactions, caisses et écritures de votre agence sont comptabilisées de manière indépendante selon le plan OHADA.
            </span>
          </div>
        </div>
      )}

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
          className={clsx('tab-btn', activeTab === 'bilan' && 'active')}
          onClick={() => setActiveTab('bilan')}
        >
          <FileText size={17} /> Bilan SYSCOHADA ({annee})
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
        <button
          className={clsx('tab-btn', activeTab === 'classes' && 'active')}
          onClick={() => setActiveTab('classes')}
        >
          <ChartBar size={17} /> Rapport par Classe (1 à 8)
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'clients-auxiliaires' && 'active')}
          onClick={() => setActiveTab('clients-auxiliaires')}
        >
          <UsersThree size={17} /> Comptes Clients 411
        </button>
        <button
          className={clsx('tab-btn', activeTab === 'schemas' && 'active')}
          onClick={() => setActiveTab('schemas')}
        >
          <Sliders size={17} /> Schémas & Comptes Automatiques
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
                href={downloadUrl(`/api/export/print/grand-livre?agenceId=${agenceId}&annee=${annee}`)}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Printer size={16} /> Imprimer Grand Livre (PDF)
              </a>
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
                href={downloadUrl(`/api/export/print/balance?agenceId=${agenceId}&annee=${annee}&mois=${mois}`)}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Printer size={16} /> Imprimer Balance (PDF)
              </a>
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

      {/* TAB : BILAN COMPTABLE NORMALISÉ SYSCOHADA (ACTIF & PASSIF) */}
      {activeTab === 'bilan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                Exercice comptable :
                <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  <option value={2026}>Exercice 2026</option>
                  <option value={2025}>Exercice 2025</option>
                  <option value={2027}>Exercice 2027</option>
                </select>
              </label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>
                <CheckCircle size={16} weight="fill" /> Bilan Équilibré (Actif Net = Passif)
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`/api/comptabilite/export/bilan?agenceId=${agenceId}&annee=${annee}`}
                className="primary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Printer size={16} /> Imprimer Bilan Officiel (PDF)
              </a>
            </div>
          </div>

          {bilanQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Chargement du Bilan SYSCOHADA...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 18 }}>
              {/* ACTIF */}
              <div className="card" style={{ padding: 18, background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #0284c7' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={20} /> ACTIF (EMPLOIS)
                  </h4>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>VALEURS EN USD</span>
                </div>

                {/* Section I : Actif Immobilisé */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    I. ACTIF IMMOBILISÉ (CLASSE 2)
                  </div>
                  {(bilanQuery.data?.actifImmobilise?.lignes || []).map((l: any, idx: number) => (
                    <div key={'ai-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Actif Immobilisé Net</span>
                    <span>${Number(bilanQuery.data?.actifImmobilise?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Section II : Actif Circulant */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    II. ACTIF CIRCULANT (CLASSES 3 & 4)
                  </div>
                  {(bilanQuery.data?.actifCirculant?.lignes || []).map((l: any, idx: number) => (
                    <div key={'ac-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Actif Circulant Net</span>
                    <span>${Number(bilanQuery.data?.actifCirculant?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Section III : Trésorerie Actif */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    III. TRÉSORERIE - ACTIF (CLASSE 5)
                  </div>
                  {(bilanQuery.data?.tresorerieActif?.lignes || []).map((l: any, idx: number) => (
                    <div key={'ta-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Trésorerie Actif</span>
                    <span>${Number(bilanQuery.data?.tresorerieActif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Grand Total Actif */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0284c7', color: '#fff', padding: '10px 14px', borderRadius: 8, fontWeight: 900, fontSize: '1.05rem', marginTop: 10 }}>
                  <span>TOTAL GÉNÉRAL ACTIF (NET)</span>
                  <span>${Number(bilanQuery.data?.totalActif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD</span>
                </div>
              </div>

              {/* PASSIF */}
              <div className="card" style={{ padding: 18, background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #0f172a' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={20} /> PASSIF (RESSOURCES)
                  </h4>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>VALEURS EN USD</span>
                </div>

                {/* Section I : Capitaux Propres */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    I. CAPITAUX PROPRES & RESSOURCES STABLES (CLASSE 1)
                  </div>
                  {(bilanQuery.data?.capitauxPropres?.lignes || []).map((l: any, idx: number) => (
                    <div key={'cp-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Capitaux Propres</span>
                    <span>${Number(bilanQuery.data?.capitauxPropres?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Section II : Dettes Financières */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    II. DETTES FINANCIÈRES À TERME (CLASSE 16)
                  </div>
                  {(bilanQuery.data?.dettesFinancieres?.lignes || []).map((l: any, idx: number) => (
                    <div key={'df-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Dettes Financières</span>
                    <span>${Number(bilanQuery.data?.dettesFinancieres?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Section III : Passif Circulant */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>
                    III. PASSIF CIRCULANT (CLASSE 4)
                  </div>
                  {(bilanQuery.data?.passifCirculant?.lignes || []).map((l: any, idx: number) => (
                    <div key={'pc-' + idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span><strong>{l.ref}</strong> - {l.libelle}</span>
                      <strong style={{ color: 'var(--text)' }}>${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, padding: '6px 10px', background: 'var(--surface-2)', marginTop: 4, borderRadius: 4 }}>
                    <span>Sous-total Passif Circulant</span>
                    <span>${Number(bilanQuery.data?.passifCirculant?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Grand Total Passif */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#fff', padding: '10px 14px', borderRadius: 8, fontWeight: 900, fontSize: '1.05rem', marginTop: 10 }}>
                  <span>TOTAL GÉNÉRAL PASSIF</span>
                  <span>${Number(bilanQuery.data?.totalPassif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD</span>
                </div>
              </div>
            </div>
          )}
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

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={downloadUrl(`/api/export/print/compte-resultat?agenceId=${agenceId}&annee=${annee}`)}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Printer size={16} /> Imprimer Compte Résultat (PDF)
              </a>
              <a
                href={`/api/export/excel/compte-resultat?agenceId=${agenceId}&annee=${annee}`}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <FileXls size={16} /> Exporter Compte de Résultat (.xlsx)
              </a>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <strong style={{ fontSize: '0.94rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Books size={20} color="var(--accent-strong)" />
                Plan Comptable Général SYSCOHADA Révisé Intégral (Classes 1 à 9)
              </strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                Tous les comptes sont entièrement adaptables : modifiez les intitulés, créez des sous-comptes personnalisés pour vos agences (caisses, banques, clients, charges usine) et ajustez la nomenclature sans aucun blocage.
              </p>
            </div>
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                setCompteParent('')
                setNouveauNumero('')
                setNouveauLibelle('')
                setShowNewCompteModal(true)
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.84rem' }}
            >
              <Plus size={17} /> + Nouveau Compte / Sous-Compte
            </button>
          </div>

          <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260, flex: 1, maxWidth: 380, background: 'var(--surface)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <MagnifyingGlass size={17} color="var(--muted)" />
                <input
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }}
                  placeholder="Rechercher par numéro ou intitulé..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                />
              </div>

              {/* FILTRE PAR CLASSE SYSCOHADA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>Classe :</span>
                <select
                  value={planClasseFilter}
                  onChange={(e) => setPlanClasseFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 600 }}
                >
                  <option value="TOUTES">Toutes les Classes (1 à 9)</option>
                  <option value="1">Classe 1 - Ressources Durables (Capitaux, Emprunts)</option>
                  <option value="2">Classe 2 - Actif Immobilisé & Amortissements</option>
                  <option value="3">Classe 3 - Stocks (Matières, Farines, Emballages)</option>
                  <option value="4">Classe 4 - Comptes de Tiers (Clients, Fournisseurs, Personnel)</option>
                  <option value="5">Classe 5 - Trésorerie (Caisses USD/CDF, Banques)</option>
                  <option value="6">Classe 6 - Charges d'Exploitation (Achats, Transports, Salaires)</option>
                  <option value="7">Classe 7 - Produits d'Exploitation (Ventes Farines, Services)</option>
                  <option value="8">Classe 8 - Autres Charges & Produits HAO, Résultat</option>
                  <option value="9">Classe 9 - Comptabilité Analytique & Engagements</option>
                </select>
              </div>
            </div>

            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>
              {filteredPlan.length} compte(s) affiché(s)
            </span>
          </div>

          <DataTable
            columns={['Numéro', 'Intitulé / Libellé du Compte', 'Classe & Nature', 'Statut', 'Actions']}
            loading={planQuery.isLoading}
            rows={filteredPlan.map((c) => [
              <div key={c.numero + '-num'}>
                <strong style={{ fontSize: '0.92rem' }}>{c.numero}</strong>
                {c.parentNumero && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Parent: #{c.parentNumero}</div>
                )}
              </div>,
              <div key={c.numero + '-lib'}>
                <span style={{ fontWeight: 600 }}>{c.libelle}</span>
              </div>,
              <div key={c.numero + '-nat'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-neutral">
                  Classe {c.classe || c.numero.substring(0, 1)}
                </span>
                {c.nature && (
                  <span
                    className={clsx(
                      'badge',
                      c.nature === 'ACTIF' ? 'badge-success' : c.nature === 'PASSIF' ? 'badge-info' : c.nature === 'CHARGE' ? 'badge-warning' : 'badge-neutral'
                    )}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {c.nature}
                  </span>
                )}
              </div>,
              <span
                key={c.numero + '-stat'}
                className={clsx('badge', c.actif !== false ? 'badge-success' : 'badge-danger')}
              >
                {c.actif !== false ? 'Actif' : 'Inactif'}
              </span>,
              <div key={c.numero + '-actions'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '3px 8px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    setEditingCompte(c)
                    setEditLibelle(c.libelle)
                    setEditParent(c.parentNumero || '')
                    setShowEditCompteModal(true)
                  }}
                  title="Modifier l'intitulé et le rattachement de ce compte"
                >
                  <PencilSimple size={13} /> Modifier
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '3px 8px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    setCompteParent(c.numero)
                    setNouveauNumero(`${c.numero}1`)
                    setNouveauLibelle('')
                    setShowNewCompteModal(true)
                  }}
                  title="Créer un sous-compte rattaché à ce compte parent"
                >
                  <Plus size={13} /> + Sous-compte
                </button>
                {c.estModifiable && (
                  <button
                    type="button"
                    className="secondary-action"
                    style={{ padding: '3px 6px', fontSize: '0.76rem', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => {
                      if (confirm(`Confirmez-vous la suppression du compte ${c.numero} - ${c.libelle} ?`)) {
                        deleteCompteMutation.mutate(c.numero)
                      }
                    }}
                    title="Supprimer ce compte personnalisé"
                  >
                    <Trash size={13} />
                  </button>
                )}
              </div>,
            ])}
            emptyText="Aucun compte ne correspond à votre recherche ou filtre de classe."
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '8px 0 4px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
              Registre légal des immobilisations corporelles et tableau d'amortissements SYSCOHADA
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={downloadUrl(`/api/export/print/immobilisations?agenceId=${agenceId}&annee=${annee}`)}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '6px 12px' }}
              >
                <Printer size={16} /> Imprimer Amortissements (PDF)
              </a>
              <a
                href={`/api/export/excel/immobilisations?agenceId=${agenceId}&annee=${annee}`}
                className="secondary-action"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '6px 12px' }}
              >
                <FileXls size={16} /> Exporter Tableau d'Amortissements (.xlsx)
              </a>
            </div>
          </div>
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

      {/* TAB 7 : PARAMÉTRAGE SCHÉMAS & COMPTES AUTOMATIQUES */}
      {activeTab === 'schemas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {schemasNotice && (
            <div
              className="notice"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-strong)',
                border: '1px solid var(--accent-strong)',
                padding: '12px 16px',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 600,
              }}
            >
              <span>{schemasNotice}</span>
              <button className="icon-button" onClick={() => setSchemasNotice(null)}><X size={16} /></button>
            </div>
          )}

          <div
            className="panel"
            style={{
              padding: '18px 22px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={22} style={{ color: 'var(--accent-strong)' }} />
                  Paramétrage Spécifique des Comptes Comptables Automatiques (SYSCOHADA)
                </h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem', maxWidth: 840 }}>
                  Définissez les comptes généraux mouvementés lors des écritures automatiques par les terminaux POS, la gestion des stocks, la meunerie et la trésorerie. Les modifications s'appliquent instantanément lors des prochaines transactions.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    setSchemasConfig({
                      compteVenteMarchandises: '701',
                      compteTvaCollectee: '443',
                      compteClientOrdinaire: '411',
                      compteCaisseUsd: '571',
                      compteCaisseCdf: '572',
                      compteBanque: '521',
                      compteVirementsInternes: '585',
                      compteFournisseurs: '401',
                      compteAchatsMatieres: '601',
                      compteChargesExploitation: '605',
                      compteProduitsAccessoires: '706',
                      compteStocksProduitsFinis: '31',
                      compteVariationStocks: '713',
                      compteLiaisonInterAgences: '181',
                      comptePersonnelRemuneration: '421',
                      compteChargesPersonnel: '661',
                      compteChargesSocialesPatronales: '664',
                    })
                  }}
                  title="Réinitialiser avec les comptes standards OHADA"
                >
                  <ArrowsClockwise size={16} /> Rétablir Standard OHADA
                </button>
                <button
                  type="button"
                  className="primary-action"
                  disabled={saveSchemasMutation.isPending}
                  onClick={() => saveSchemasMutation.mutate(schemasConfig)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FloppyDisk size={18} />
                  {saveSchemasMutation.isPending ? 'Enregistrement...' : 'Enregistrer le Paramétrage'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* 1. VENTES & RECOUVREMENTS */}
            <div className="card" style={{ padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
                <ShoppingCart size={20} /> Ventes & Encaissements POS
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Produits des Ventes (Crédit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Compte crédité lors des ventes au comptant et à crédit (ex: 701 - Ventes de farine)
                  </span>
                  <input
                    value={schemasConfig?.compteVenteMarchandises || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteVenteMarchandises: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="701"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Créances Clients (Débit vente à crédit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Compte débité lorsque le client achète à terme/crédit (ex: 411 - Clients ordinaires)
                  </span>
                  <input
                    value={schemasConfig?.compteClientOrdinaire || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteClientOrdinaire: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="411"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Caisse Recettes USD (Débit cash USD)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Compte débité lors des encaissements en dollars (ex: 571 - Caisse Principale USD)
                  </span>
                  <input
                    value={schemasConfig?.compteCaisseUsd || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteCaisseUsd: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="571"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Caisse Recettes CDF (Débit cash CDF)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Compte débité lors des encaissements en francs congolais (ex: 572 - Caisse CDF)
                  </span>
                  <input
                    value={schemasConfig?.compteCaisseCdf || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteCaisseCdf: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="572"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte TVA Collectée / Taxes (Crédit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Taxes et droits sur chiffre d'affaires (ex: 443 - État, TVA facturée)
                  </span>
                  <input
                    value={schemasConfig?.compteTvaCollectee || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteTvaCollectee: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="443"
                  />
                </label>
              </div>
            </div>

            {/* 2. ACHATS & FOURNISSEURS */}
            <div className="card" style={{ padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
                <Package size={20} /> Achats, Matières & Fournisseurs
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Achats Matières Premières (Débit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Achats de grains de maïs, sacs et intrants (ex: 601 - Achats de matières premières)
                  </span>
                  <input
                    value={schemasConfig?.compteAchatsMatieres || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteAchatsMatieres: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="601"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Dettes Fournisseurs (Crédit achat à terme)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Dettes envers producteurs et coopératives (ex: 401 - Fournisseurs d'exploitation)
                  </span>
                  <input
                    value={schemasConfig?.compteFournisseurs || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteFournisseurs: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="401"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Autres Charges d'Exploitation (Débit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Fournitures non stockées, carburant et petits matériels (ex: 605 - Autres achats)
                  </span>
                  <input
                    value={schemasConfig?.compteChargesExploitation || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteChargesExploitation: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="605"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Produits Accessoires / Sons (Crédit)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Recettes sur ventes de sous-produits meunerie (ex: 706 - Produits accessoires)
                  </span>
                  <input
                    value={schemasConfig?.compteProduitsAccessoires || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteProduitsAccessoires: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="706"
                  />
                </label>
              </div>
            </div>

            {/* 3. STOCKS & MEUNERIE */}
            <div className="card" style={{ padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
                <Gear size={20} /> Stocks & Production Meunerie
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Stocks Produits Finis (Débit inventaire)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Actif circulant stocks de farine usine et dépôts (ex: 31 - Stocks de produits finis)
                  </span>
                  <input
                    value={schemasConfig?.compteStocksProduitsFinis || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteStocksProduitsFinis: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="31"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Variation des Stocks / Production Stockée</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Contrepartie de la production usine enregistrée (ex: 713 - Variation de stocks)
                  </span>
                  <input
                    value={schemasConfig?.compteVariationStocks || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteVariationStocks: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="713"
                  />
                </label>
              </div>
            </div>

            {/* 4. TRÉSORERIE & COMPTES DE LIAISON */}
            <div className="card" style={{ padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
                <Bank size={20} /> Trésorerie & Virements Inter-Agences
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Banques Commerciales</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Comptes bancaires Rawbank, EquityBCDC, TMB (ex: 521 - Banques)
                  </span>
                  <input
                    value={schemasConfig?.compteBanque || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteBanque: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="521"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Virements Internes de Fonds</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Compte pivot pour transferts de fonds caisse vers banque (ex: 585 - Virements de fonds)
                  </span>
                  <input
                    value={schemasConfig?.compteVirementsInternes || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteVirementsInternes: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="585"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte de Liaison Inter-Agences</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Transferts inter-agences et règlements croisés (ex: 181 - Compte de liaison)
                  </span>
                  <input
                    value={schemasConfig?.compteLiaisonInterAgences || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteLiaisonInterAgences: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="181"
                  />
                </label>
              </div>
            </div>

            {/* 5. PAIE & CHARGES DE PERSONNEL */}
            <div className="card" style={{ padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
                <UsersThree size={20} /> Paie & Charges Salariales
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Rémunérations Directes (Débit charges)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Salaires bruts et primes de production (ex: 661 - Rémunérations directes)
                  </span>
                  <input
                    value={schemasConfig?.compteChargesPersonnel || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteChargesPersonnel: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="661"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Charges Sociales Patronales (Débit CNSS/INPP)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Cotisations patronales légales (ex: 664 - Charges sociales patronales)
                  </span>
                  <input
                    value={schemasConfig?.compteChargesSocialesPatronales || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, compteChargesSocialesPatronales: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="664"
                  />
                </label>
                <label style={{ fontSize: '0.84rem' }}>
                  <strong>Compte Dettes sur Rémunérations (Crédit salaires nets dus)</strong>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                    Salaires nets à verser aux employés (ex: 421 - Personnel, rémunérations dues)
                  </span>
                  <input
                    value={schemasConfig?.comptePersonnelRemuneration || ''}
                    onChange={(e) => setSchemasConfig({ ...schemasConfig, comptePersonnelRemuneration: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.9rem' }}
                    placeholder="421"
                  />
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 0' }}>
            <button
              type="button"
              className="primary-action"
              disabled={saveSchemasMutation.isPending}
              onClick={() => saveSchemasMutation.mutate(schemasConfig)}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <FloppyDisk size={18} />
              {saveSchemasMutation.isPending ? 'Enregistrement en cours...' : 'Enregistrer et Activer le Paramétrage'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 8 : RAPPORT PAR CLASSE COMPTABLE (SYSCOHADA CLASSES 1 À 8) */}
      {activeTab === 'classes' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChartBar size={22} style={{ color: 'var(--accent-strong)' }} />
                Rapport par Classe Comptable (SYSCOHADA Révisé - Classes 1 à 8)
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.86rem' }}>
                Ventilation intégrale des opérations par classe comptable : capitaux, immobilisations, stocks produits, créances clients 411, trésorerie, charges et produits de ventes.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href={`/api/comptabilite/classes/document?agenceId=${agenceId}&annee=${annee}`}
                target="_blank"
                rel="noreferrer"
                className="primary-action"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 700 }}
              >
                <Printer size={18} /> Imprimer le Rapport Officiel par Classe (SYSCOHADA)
              </a>
            </div>
          </div>

          {/* Synthèse équilibre global */}
          {classesComptablesQuery.data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL DÉBITS CLASSES :</span>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a', display: 'block', marginTop: 4 }}>
                  ${Number(classesComptablesQuery.data.grandTotalDebitUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL CRÉDITS CLASSES :</span>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a', display: 'block', marginTop: 4 }}>
                  ${Number(classesComptablesQuery.data.grandTotalCreditUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>ÉCART D'ÉQUILIBRE :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <strong style={{ fontSize: '1.2rem', color: classesComptablesQuery.data.estEquilibre ? '#16a34a' : '#b91c1c' }}>
                    ${Number(classesComptablesQuery.data.ecartEquilibre || 0).toFixed(2)} USD
                  </strong>
                  <span className={`badge ${classesComptablesQuery.data.estEquilibre ? 'badge-success' : 'badge-danger'}`}>
                    {classesComptablesQuery.data.estEquilibre ? '✓ ÉQUILIBRÉ' : 'DÉSÉQUILIBRE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Liste détaillée des 8 classes */}
          <div style={{ display: 'grid', gap: 14 }}>
            {(classesComptablesQuery.data?.classes ?? []).map((cl: any, idx: number) => {
              const numClasse = cl.classeNumero ?? cl.numero ?? cl.classe ?? (idx + 1)
              const titreClasse = cl.classeTitre ?? cl.titre ?? `Classe ${numClasse}`
              const sousTitreClasse = cl.classeSousTitre ?? cl.sousTitre ?? ''
              return (
                <div key={'classe-' + numClasse} className="card" style={{ padding: 18, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge" style={{ fontSize: '0.9rem', fontWeight: 800, padding: '4px 10px', background: 'var(--accent-strong)', color: '#fff' }}>
                          CLASSE {numClasse}
                        </span>
                        <strong style={{ fontSize: '1.1rem' }}>{titreClasse}</strong>
                      </div>
                      {sousTitreClasse && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{sousTitreClasse}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>TOTAL DÉBIT</span>
                        <strong style={{ fontSize: '0.95rem' }}>${Number(cl.totalDebitUsd || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>TOTAL CRÉDIT</span>
                        <strong style={{ fontSize: '0.95rem' }}>${Number(cl.totalCreditUsd || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>SOLDE NET</span>
                        <strong style={{ fontSize: '1rem', color: cl.soldeNetUsd > 0 ? '#b91c1c' : (cl.soldeNetUsd < 0 ? '#16a34a' : 'var(--text)') }}>
                          {cl.soldeNetUsd > 0 ? `Deb. $${cl.soldeNetUsd.toFixed(2)}` : (cl.soldeNetUsd < 0 ? `Cred. $${Math.abs(cl.soldeNetUsd).toFixed(2)}` : '$0.00')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Table des sous-comptes dans la classe */}
                  <DataTable
                    columns={['N° Compte', 'Intitulé du Compte SYSCOHADA', 'Débit USD', 'Crédit USD', 'Solde Net', 'Écritures']}
                    rows={(cl.comptes || []).map((cp: any, cpIdx: number) => {
                      const debit = Number(cp.debitUsd ?? cp.debit ?? 0)
                      const credit = Number(cp.creditUsd ?? cp.credit ?? 0)
                      const net = Number(cp.soldeNetUsd ?? cp.soldeNet ?? (debit - credit))
                      const ops = cp.nombreOperations ?? cp.nbEcritures ?? 0
                      const rowKey = `cp-${numClasse}-${cp.numero || cpIdx}`
                      return [
                        <code key={rowKey + '-num'} style={{ fontWeight: 800, fontSize: '0.92rem' }}>{cp.numero}</code>,
                        <span key={rowKey + '-lib'}>{cp.libelle}</span>,
                        <span key={rowKey + '-deb'} style={{ fontWeight: 600 }}>{debit > 0 ? `$${debit.toFixed(2)}` : '-'}</span>,
                        <span key={rowKey + '-crd'} style={{ fontWeight: 600 }}>{credit > 0 ? `$${credit.toFixed(2)}` : '-'}</span>,
                        <strong key={rowKey + '-net'} style={{ color: net > 0 ? '#b91c1c' : (net < 0 ? '#16a34a' : 'var(--muted)') }}>
                          {net > 0 ? `+ $${net.toFixed(2)}` : (net < 0 ? `- $${Math.abs(net).toFixed(2)}` : '$0.00')}
                        </strong>,
                        <span key={rowKey + '-ops'} className="badge" style={{ fontSize: '0.75rem' }}>{ops} op.</span>,
                      ]
                    })}
                    emptyText="Aucune écriture enregistrée pour les comptes de cette classe."
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 9 : COMPTES CLIENTS 411 (GRAND LIVRE & SUIVI DES TRANSACTIONS) */}
      {activeTab === 'clients-auxiliaires' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UsersThree size={22} style={{ color: 'var(--accent-strong)' }} />
                Comptes Clients Auxiliaires 411 (Suivi Individuel & Grand Livre)
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.86rem' }}>
                Chaque client dispose de son propre compte auxiliaire découlant du compte collectif 411. Cela permet un suivi strict des créances sans déséquilibre du journal.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={['Compte 411xxx', 'Client & Contact', 'Solde Dette Actuelle', 'Plafond Crédit', 'Utilisation', 'Factures Crédit', 'Règlements', 'Actions']}
              rows={(comptesAuxiliairesQuery.data ?? []).map((c: any) => [
                <div>
                  <code style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--accent-strong)' }}>{c.compteComptable}</code>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)' }}>Parent : 411 (Collectif)</span>
                </div>,
                <div>
                  <strong>{c.nom}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{c.telephone || 'Sans tél'} | {c.adresse || 'Goma'}</div>
                </div>,
                <div>
                  <strong style={{ fontSize: '1rem', color: c.soldeDette > 0 ? '#b91c1c' : '#16a34a' }}>
                    ${Number(c.soldeDette || 0).toFixed(2)} USD
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {c.soldeDetteCdf?.toLocaleString()} CDF
                  </div>
                </div>,
                <span>${Number(c.limiteCredit || 0).toFixed(2)} USD</span>,
                <div style={{ width: 90 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 2 }}>
                    <span>{c.tauxUtilisationCredit}%</span>
                    {c.bloque && <span style={{ color: '#b91c1c', fontWeight: 800 }}>DÉPASSÉ</span>}
                  </div>
                  <div style={{ height: 6, width: '100%', background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, c.tauxUtilisationCredit)}%`,
                        background: c.tauxUtilisationCredit > 90 ? '#b91c1c' : (c.tauxUtilisationCredit > 60 ? '#f59e0b' : '#16a34a'),
                      }}
                    />
                  </div>
                </div>,
                <div>
                  <span style={{ fontWeight: 700 }}>${Number(c.totalCreditValide || 0).toFixed(2)}</span>
                  {c.nbVentesAttenteChef > 0 && (
                    <span className="badge badge-warning" style={{ display: 'block', marginTop: 2, fontSize: '0.68rem' }}>
                      {c.nbVentesAttenteChef} en attente Chef
                    </span>
                  )}
                </div>,
                <strong style={{ color: '#16a34a' }}>${Number(c.totalReglements || 0).toFixed(2)}</strong>,
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="primary-action"
                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                    onClick={() => setSelectedAuxClient(c)}
                  >
                    Grand Livre
                  </button>
                  <a
                    href={`/api/comptabilite/clients/${c.id}/releve-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-action"
                    style={{ textDecoration: 'none', padding: '5px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Printer size={14} /> Relevé
                  </a>
                </div>,
              ])}
              emptyText="Aucun compte client auxiliaire trouvé."
            />
          </div>

          {/* MODAL DU GRAND LIVRE AUXILIAIRE DU CLIENT */}
          {selectedAuxClient && (
            <div className="modal-overlay" onClick={() => setSelectedAuxClient(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UsersThree size={22} style={{ color: 'var(--accent-strong)' }} />
                      Grand Livre Auxiliaire : {selectedAuxClient.nom}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                      Compte individuel : <code style={{ fontWeight: 800 }}>{selectedAuxClient.compteComptable}</code> | Plafond autorisé : ${selectedAuxClient.limiteCredit} USD
                    </div>
                  </div>
                  <button className="icon-button" onClick={() => setSelectedAuxClient(null)}><X size={18} /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, background: 'var(--surface-2)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>TOTAL FACTURÉ (DÉBIT)</span>
                    <strong style={{ fontSize: '1rem', color: '#b91c1c' }}>${Number(clientGrandLivreQuery.data?.cumulDebit || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>TOTAL ENCAISSÉ (CRÉDIT)</span>
                    <strong style={{ fontSize: '1rem', color: '#16a34a' }}>${Number(clientGrandLivreQuery.data?.cumulCredit || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>SOLDE RESTANT DÛ</span>
                    <strong style={{ fontSize: '1.1rem', color: Number(clientGrandLivreQuery.data?.soldeActuelDette || 0) > 0 ? '#b91c1c' : '#16a34a' }}>
                      ${Number(clientGrandLivreQuery.data?.soldeActuelDette || 0).toFixed(2)} USD
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>CRÉDIT DISPONIBLE</span>
                    <strong style={{ fontSize: '1rem', color: '#0284c7' }}>${Number(clientGrandLivreQuery.data?.disponibleCredit || 0).toFixed(2)}</strong>
                  </div>
                </div>

                <DataTable
                  columns={['Date', 'Pièce Réf.', 'Libellé de l\'Opération', 'Statut', 'Débit (+)', 'Crédit (-)', 'Solde Progressif']}
                  rows={(clientGrandLivreQuery.data?.mouvements ?? []).map((m: any) => [
                    <span style={{ fontSize: '0.8rem' }}>{new Date(m.date).toLocaleDateString('fr-FR')}</span>,
                    <code style={{ fontSize: '0.78rem' }}>{m.reference}</code>,
                    <span style={{ fontSize: '0.82rem' }}>{m.libelle}</span>,
                    <span className="badge" style={{ fontSize: '0.7rem' }}>{m.statut}</span>,
                    <span style={{ fontWeight: 700, color: m.debit > 0 ? '#b91c1c' : 'var(--muted)' }}>{m.debit > 0 ? `$${m.debit.toFixed(2)}` : '-'}</span>,
                    <span style={{ fontWeight: 700, color: m.credit > 0 ? '#16a34a' : 'var(--muted)' }}>{m.credit > 0 ? `$${m.credit.toFixed(2)}` : '-'}</span>,
                    <strong style={{ fontSize: '0.85rem' }}>${Number(m.soldeCumule || 0).toFixed(2)}</strong>,
                  ])}
                  emptyText="Aucun mouvement trouvé dans ce compte auxiliaire."
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <a
                    href={`/api/comptabilite/clients/${selectedAuxClient.id}/releve-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-action"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                  >
                    <Printer size={16} /> Imprimer Relevé de Compte Client (PDF)
                  </a>
                  <button className="secondary-action" onClick={() => setSelectedAuxClient(null)}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {/* MODAL : MODIFIER / ADAPTER LE COMPTE OHADA */}
      {showEditCompteModal && editingCompte && (
        <div className="modal-overlay" onClick={() => setShowEditCompteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Adapter le Compte OHADA #{editingCompte.numero}</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Modifiez l'intitulé ou le rattachement hiérarchique
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowEditCompteModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateCompteMutation.mutate()
              }}
              style={{ display: 'grid', gap: 12, marginTop: 14 }}
            >
              <label>
                Numéro de Compte
                <input disabled value={editingCompte.numero} style={{ background: 'var(--surface-2)', cursor: 'not-allowed' }} />
              </label>

              <label>
                Intitulé / Libellé du compte *
                <input
                  required
                  value={editLibelle}
                  onChange={(e) => setEditLibelle(e.target.value)}
                  placeholder="ex: Caisse Principale Recettes USD"
                />
              </label>

              <label>
                Compte parent (Optionnel)
                <select value={editParent} onChange={(e) => setEditParent(e.target.value)}>
                  <option value="">Aucun parent direct</option>
                  {planComptable
                    .filter((cp) => cp.numero !== editingCompte.numero)
                    .map((cp) => (
                      <option key={cp.numero} value={cp.numero}>
                        {cp.numero} - {cp.libelle}
                      </option>
                    ))}
                </select>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="secondary-action" onClick={() => setShowEditCompteModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={updateCompteMutation.isPending}>
                  {updateCompteMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
  const globalSelectedAgenceId = useAppStore((state) => state.selectedAgenceId)
  const session = useAppStore((state) => state.session)
  const isSuperOrAdminSiege = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'
  const agenceId = session?.agenceId
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()

  const [activeTab, setActiveTab] = useState<'kpis' | 'transactions'>('transactions')
  const [selectedAgenceFiltre, setSelectedAgenceFiltre] = useState<string | number>(
    isSuperOrAdminSiege
      ? (globalSelectedAgenceId === 'CONSOLIDE' ? 'CONSOLIDE' : (globalSelectedAgenceId || 'CONSOLIDE'))
      : (agenceId ?? 1)
  )
  const [selectedModuleFiltre, setSelectedModuleFiltre] = useState<string>('TOUS')
  const [searchTerm, setSearchTerm] = useState('')

  const effectiveReportingAgenceId = isSuperOrAdminSiege
    ? (selectedAgenceFiltre === 'CONSOLIDE' ? undefined : selectedAgenceFiltre)
    : agenceId

  const balancePath = `/api/reporting/export/balance?mois=${month}&annee=${year}${effectiveReportingAgenceId ? `&agenceId=${effectiveReportingAgenceId}` : ''}`
  const stockExportPath = `/api/stocks/export/inventaire${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`

  const kpisQuery = useQuery({
    queryKey: ['direction-kpis', effectiveReportingAgenceId],
    queryFn: () => {
      const pAg = effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''
      return apiRequest<DirectionKpis>(`/api/reporting/direction-kpis${pAg}`, { token })
    },
    enabled: Boolean(token),
  })

  const agencesQuery = useQuery({
    queryKey: ['agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: Boolean(token),
  })

  const multiAgencesTransactionsQuery = useQuery({
    queryKey: ['transactions-multi-agences', selectedAgenceFiltre, selectedModuleFiltre],
    queryFn: () => {
      const pAg = isSuperOrAdminSiege
        ? (selectedAgenceFiltre === 'CONSOLIDE' ? '' : `&agenceId=${selectedAgenceFiltre}`)
        : `&agenceId=${agenceId}`
      const pMod = selectedModuleFiltre === 'TOUS' ? '' : `&type=${selectedModuleFiltre}`
      return apiRequest<{ transactions: any[]; resumeAgences: any[]; totalTransactionsCount: number }>(
        `/api/reporting/siege/transactions-multi-agences?t=1${pAg}${pMod}`,
        { token }
      )
    },
    enabled: Boolean(token),
  })

  const kpis = kpisQuery.data
  const maxCa = Math.max(...(kpis?.evolutionVentes6Mois.map((m) => m.caUsd) ?? [30000]))

  const rawTransactions = multiAgencesTransactionsQuery.data?.transactions ?? []
  const filteredTransactions = rawTransactions.filter((tr) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      tr.reference?.toLowerCase().includes(term) ||
      tr.libelle?.toLowerCase().includes(term) ||
      tr.agenceNom?.toLowerCase().includes(term) ||
      tr.operateurNom?.toLowerCase().includes(term)
    )
  })

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <ModuleHeader
          title={isSuperOrAdminSiege ? "Tableau de Bord Direction Générale & Supervision Siège" : "Journal des Opérations & Reporting de l'Agence"}
          text={isSuperOrAdminSiege ? "Suivi des transactions agence par agence et consolidé, KPIs stratégiques, rentabilité de production et pièces officielles." : "Consultez l'historique et les pièces comptables officielles de votre agence locale."}
          icon={ChartLineUp}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="secondary-action" href={downloadUrl(balancePath)} target="_blank" rel="noreferrer">
            <FilePdf size={17} /> Balance Générale (PDF)
          </a>
          <a
            className="secondary-action"
            href={downloadUrl(`/api/comptabilite/export/bilan?annee=${year}${effectiveReportingAgenceId ? `&agenceId=${effectiveReportingAgenceId}` : ''}`)}
            target="_blank"
            rel="noreferrer"
            title="Télécharger le Bilan Officiel SYSCOHADA (Actif & Passif)"
          >
            <FileText size={17} /> Bilan SYSCOHADA (PDF)
          </a>
          <a className="secondary-action" href={downloadUrl(stockExportPath)} target="_blank" rel="noreferrer">
            <Package size={17} /> Inventaire PMP (PDF)
          </a>
          <a
            className="secondary-action"
            href={downloadUrl(`/api/export/print/transactions-consolidees${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Printer size={17} /> {isSuperOrAdminSiege ? "Imprimer Multi-Agences (PDF)" : "Imprimer Opérations (PDF)"}
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/transactions-consolidees${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <FileXls size={17} /> {isSuperOrAdminSiege ? "Journal Multi-Agences (.xlsx)" : "Journal des Opérations (.xlsx)"}
          </a>
          <a
            className="secondary-action"
            href={downloadUrl(`/api/export/print/balance${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Printer size={17} /> Imprimer Balance (PDF)
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/balance${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <FileXls size={17} /> Balance (.xlsx)
          </a>
          <a
            className="secondary-action"
            href={downloadUrl(`/api/export/print/compte-resultat${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Printer size={17} /> Imprimer Compte Résultat (PDF)
          </a>
          <a
            className="secondary-action"
            href={`/api/export/excel/compte-resultat${effectiveReportingAgenceId ? `?agenceId=${effectiveReportingAgenceId}` : ''}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <FileXls size={17} /> Compte Résultat (.xlsx)
          </a>
        </div>
      </div>

      {/* ONGLETS PRINCIPAUX REPORTING */}
      <div className="tab-bar">
        <button
          className={clsx('tab-button', activeTab === 'transactions' && 'active')}
          onClick={() => setActiveTab('transactions')}
        >
          <Buildings size={18} /> {isSuperOrAdminSiege ? "Supervision des Transactions Multi-Agences" : "Journal des Transactions de l'Agence"}
        </button>
        <button
          className={clsx('tab-button', activeTab === 'kpis' && 'active')}
          onClick={() => setActiveTab('kpis')}
        >
          <ChartLineUp size={18} /> KPIs Stratégiques & Rentabilité
        </button>
      </div>

      {/* ================= ONGLET 1 : SUPERVISION MULTI-AGENCES (AGENCE PAR AGENCE & CONSOLIDÉ) ================= */}
      {activeTab === 'transactions' && (
        <div className="page-grid">
          {/* BANDEAU EXPLICATIF */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  padding: 10,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Buildings size={28} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>
                  {isSuperOrAdminSiege
                    ? "Espace de Contrôle & Traçabilité Multi-Agences (Admin Siège & Direction)"
                    : "Espace de Traçabilité des Opérations de l'Agence"}
                </strong>
                <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                  {isSuperOrAdminSiege
                    ? "Visualisez en temps réel toutes les transactions opérationnelles : agence par agence ou consolidé global. Les agences opèrent en autonomie (ventes, stocks, production locale) sous la supervision des grandes décisions du siège."
                    : "Visualisez en temps réel l'ensemble des transactions et flux enregistrés au sein de votre agence locale."}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="secondary-action"
                onClick={() => multiAgencesTransactionsQuery.refetch()}
                disabled={multiAgencesTransactionsQuery.isFetching}
                style={{ fontSize: '0.82rem' }}
              >
                <ArrowsClockwise size={16} className={clsx(multiAgencesTransactionsQuery.isFetching && 'spin')} />
                Actualiser les flux
              </button>
            </div>
          </div>

          {/* CARTES DE SYNTHÈSE PAR AGENCE */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isSuperOrAdminSiege ? "Statut Opérationnel par Agence (Cliquer pour filtrer) :" : "Statut Opérationnel de votre Agence :"}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Carte globale "Tout consolidé" - STRICTEMENT RÉSERVÉE À L'ADMIN DU SIÈGE ET SUPER ADMIN */}
              {isSuperOrAdminSiege && (
                <div
                  onClick={() => setSelectedAgenceFiltre('CONSOLIDE')}
                  style={{
                    background: selectedAgenceFiltre === 'CONSOLIDE' ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface)',
                    border: `2px solid ${selectedAgenceFiltre === 'CONSOLIDE' ? '#2563eb' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}>
                      TOUT CONSOLIDÉ
                    </strong>
                    <span className="badge badge-primary">{multiAgencesTransactionsQuery.data?.totalTransactionsCount ?? 0} flux</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Vision unifiée de l'ensemble du réseau (Siège + toutes les agences provinciales).
                  </div>
                </div>
              )}

              {/* Cartes pour chaque agence */}
              {(multiAgencesTransactionsQuery.data?.resumeAgences ?? []).map((ag: any) => {
                const isSelected = selectedAgenceFiltre === ag.agenceId
                return (
                  <div
                    key={ag.agenceId}
                    onClick={() => {
                      if (isSuperOrAdminSiege) setSelectedAgenceFiltre(ag.agenceId)
                    }}
                    style={{
                      background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: 14,
                      cursor: isSuperOrAdminSiege ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {ag.estSiege ? '[Siège] ' : ''}{ag.agenceNom}
                      </strong>
                      <span className={clsx('badge', ag.estSiege ? 'badge-primary' : 'badge-neutral')} style={{ fontSize: '0.72rem' }}>
                        {ag.estSiege ? 'Siège Principal' : ag.ville}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block' }}>Ventes :</span>
                        <strong style={{ color: 'var(--text)' }}>${ag.totalVentesUsd.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block' }}>Caisse dispo :</span>
                        <strong>${ag.soldeCaisseUsd.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block' }}>Produits fabriqués :</span>
                        <strong>{ag.sacsProduits} unités/sacs</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block' }}>Attente visa :</span>
                        <strong>
                          {ag.validationsEnAttente} dossier(s)
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* BARRE DE FILTRAGE ET RECHERCHE */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Agence :</span>
                {isSuperOrAdminSiege ? (
                  <select
                    value={selectedAgenceFiltre}
                    onChange={(e) => {
                      const val = e.target.value === 'CONSOLIDE' ? 'CONSOLIDE' : Number(e.target.value)
                      setSelectedAgenceFiltre(val)
                    }}
                    style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                  >
                    <option value="CONSOLIDE">Tout Consolidé (Toutes les Agences)</option>
                    {(agencesQuery.data || []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.estSiege ? '[Siège] ' : ''}{ag.nom} ({ag.ville})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="badge badge-primary" style={{ padding: '5px 10px', fontSize: '0.84rem' }}>
                    {(agencesQuery.data || []).find((a: any) => a.id === agenceId)?.nom || 'Mon Agence'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Module :</span>
                <select
                  value={selectedModuleFiltre}
                  onChange={(e) => setSelectedModuleFiltre(e.target.value)}
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                >
                  <option value="TOUS">Tous les flux opérationnels</option>
                  <option value="VENTES">Ventes & Facturation</option>
                  <option value="TRESORERIE">Caisse & Décaissements</option>
                  <option value="ETAT_BESOIN">États de Besoin & Réquisitions</option>
                  <option value="ACHATS">Achats & Pesées Pont-Bascule</option>
                  <option value="PRODUCTION">Production & Transformation</option>
                  <option value="LOGISTIQUE">Transferts & Convois</option>
                  <option value="MAINTENANCE">Maintenance Technique</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                placeholder="Rechercher réf, client, agent, libellé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '5px 10px', fontSize: '0.84rem', width: 240 }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {filteredTransactions.length} transaction(s)
              </span>
            </div>
          </div>

          {/* TABLEAU DES TRANSACTIONS MULTI-AGENCES */}
          <DataTable
            columns={[
              'Réf. Transaction',
              'Date & Heure',
              'Agence',
              'Module / Flux',
              'Description & Détails',
              'Montant',
              'Opérateur',
              'Statut',
              'Action / Document',
            ]}
            loading={multiAgencesTransactionsQuery.isLoading}
            rows={filteredTransactions.map((f: any) => [
              <strong key={'ref-' + f.id} style={{ fontSize: '0.84rem' }}>
                {f.reference}
              </strong>,
              f.date ? new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
              <span
                key={'ag-' + f.id}
                className={clsx('badge', f.agenceNom?.includes('Siège') ? 'badge-primary' : 'badge-info')}
                style={{ fontSize: '0.78rem' }}
              >
                {f.agenceNom}
              </span>,
              <span key={'mod-' + f.id} className="badge badge-neutral" style={{ fontSize: '0.76rem' }}>
                {f.module}: {f.typeFlux?.replace(/_/g, ' ')}
              </span>,
              <span key={'lib-' + f.id} style={{ fontSize: '0.84rem' }}>
                {f.libelle}
              </span>,
              <strong
                key={'mt-' + f.id}
                style={{
                  fontSize: '0.88rem',
                  color: f.typeFlux?.includes('DECAISSEMENT') || f.module === 'MAINTENANCE' || f.module === 'ETAT_BESOIN'
                    ? '#dc2626'
                    : f.module === 'VENTES'
                    ? '#16a34a'
                    : 'inherit',
                }}
              >
                {money(f.montant, f.devise || 'USD')}
              </strong>,
              f.operateurNom || '-',
              <span
                key={'st-' + f.id}
                className={clsx(
                  'badge',
                  f.statut === 'VALIDE' || f.statut === 'TERMINE' || f.statut === 'CONFORME' || f.statut === 'RECU'
                    ? 'badge-success'
                    : f.statut === 'ANNULEE'
                    ? 'badge-danger'
                    : 'badge-warning'
                )}
                style={{ fontSize: '0.76rem' }}
              >
                {f.statut}
              </span>,
              f.documentUrl ? (
                <a
                  key={'doc-' + f.id}
                  href={downloadUrl(f.documentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-action"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    textDecoration: 'none',
                  }}
                >
                  <Printer size={14} /> {f.documentNom || 'Ouvrir'}
                </a>
              ) : (
                '-'
              ),
            ])}
            emptyText="Aucune transaction trouvée pour les critères sélectionnés."
          />
        </div>
      )}

      {/* ================= ONGLET 2 : KPIS STRATÉGIQUES DIRECTION ================= */}
      {activeTab === 'kpis' && (
        <>
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
        </>
      )}
    </section>
  )
}

function AdminPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const session = useAppStore((state) => state.session)
  const isSuperOrAdminSiege = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'
  const [adminAgenceFilter, setAdminAgenceFilter] = useState<number | 'TOUTES'>(
    isSuperOrAdminSiege ? 'TOUTES' : (session?.agenceId || 1)
  )
  const [activeTab, setActiveTab] = useState<
    'agences' | 'roles' | 'utilisateurs' | 'appareils' | 'entreprise' | 'flotte' | 'categories' | 'taux' | 'prix' | 'audit' | 'sauvegardes'
  >(isSuperOrAdminSiege ? 'agences' : 'utilisateurs')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Gestion Appareils & Déblocage
  const [showDebloquerModal, setShowDebloquerModal] = useState(false)
  const [debloquerTargetUser, setDebloquerTargetUser] = useState<any | null>(null)
  const [tempPasswordInput, setTempPasswordInput] = useState('')
  const [libererAppareilCheck, setLibererAppareilCheck] = useState(true)

  const [showNewAppareilModal, setShowNewAppareilModal] = useState(false)
  const [newAppareilNom, setNewAppareilNom] = useState('')
  const [newAppareilId, setNewAppareilId] = useState('')
  const [newAppareilType, setNewAppareilType] = useState('PC_BUREAU')
  const [newAppareilAgenceId, setNewAppareilAgenceId] = useState(1)
  const [newAppareilUserId, setNewAppareilUserId] = useState<number | ''>('')

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

  const deleteVehiculeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/flotte/vehicules/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flotte'] })
      setActionNotice('Véhicule retiré de la flotte avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la suppression'),
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
      queryClient.invalidateQueries({ queryKey: ['prix-agence'] })
      queryClient.invalidateQueries({ queryKey: ['stock-agence'] })
      queryClient.invalidateQueries({ queryKey: ['stocks-agence'] })
      queryClient.invalidateQueries({ queryKey: ['agence-articles-prix'] })
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      setActionNotice('Prix d agence validé par la Direction Siège et activé immédiatement pour la facturation POS.')
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

  const appareilsQuery = useQuery({
    queryKey: ['admin-appareils'],
    queryFn: () => apiRequest<any[]>('/api/admin/appareils', { token }),
    enabled: Boolean(token),
  })

  const deconnecterUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}/deconnecter`, {
        method: 'POST',
        token,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-appareils'] })
      setActionNotice(data.message || 'Utilisateur déconnecté de force avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la déconnexion forcée'),
  })

  const debloquerUserMutation = useMutation({
    mutationFn: ({ userId, tempPassword, libererAppareil }: { userId: number; tempPassword?: string; libererAppareil?: boolean }) =>
      apiRequest(`/api/admin/users/${userId}/debloquer-reinitialiser`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          motDePasseTemporaire: tempPassword,
          libererAppareil,
        }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-appareils'] })
      setShowDebloquerModal(false)
      setDebloquerTargetUser(null)
      setTempPasswordInput('')
      setActionNotice(data.message || 'Compte débloqué et mot de passe temporaire défini avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors du déblocage du compte'),
  })

  const toggleVipMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}/toggle-vip`, {
        method: 'POST',
        token,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setActionNotice(data.message || 'Statut VIP modifié avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la modification du statut VIP'),
  })

  const createAppareilMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/admin/appareils', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: newAppareilNom,
          deviceId: newAppareilId,
          type: newAppareilType,
          agenceId: Number(newAppareilAgenceId),
          userId: newAppareilUserId ? Number(newAppareilUserId) : undefined,
        }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appareils'] })
      setShowNewAppareilModal(false)
      setNewAppareilNom('')
      setNewAppareilId('')
      setNewAppareilUserId('')
      setActionNotice(data.message || 'Appareil enregistré avec succès.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de l enregistrement de l appareil'),
  })

  const toggleAppareilStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      apiRequest(`/api/admin/appareils/${id}/statut`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ statut }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appareils'] })
      setActionNotice(data.message || 'Statut de l appareil mis à jour.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la mise à jour'),
  })

  const deleteAppareilMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/appareils/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appareils'] })
      setActionNotice(data.message || 'Appareil supprimé du parc.')
    },
    onError: (err: any) => setActionNotice(err.message || 'Erreur lors de la suppression'),
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

      {/* BANNIÈRE DE PÉRIMÈTRE D'AGENCE / CONSOLIDATION SIÈGE */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Buildings size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text)', display: 'block' }}>
              {isSuperOrAdminSiege ? 'Périmètre Administratif & Contrôle Siège' : `Administration Locale — ${(agencesQuery.data ?? []).find((a: any) => a.id === session?.agenceId)?.nom || `Agence #${session?.agenceId || 1}`}`}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {isSuperOrAdminSiege
                ? 'Consolidation Siège multi-agences ou filtrage par agence spécifique.'
                : 'Vous administrez exclusivement les ressources, personnels, véhicules et matériels de votre agence locale.'}
            </span>
          </div>
        </div>

        {isSuperOrAdminSiege && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Filtrer l'administration par agence :</span>
            <select
              value={adminAgenceFilter}
              onChange={(e) => setAdminAgenceFilter(e.target.value === 'TOUTES' ? 'TOUTES' : Number(e.target.value))}
              style={{ padding: '5px 10px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 600 }}
            >
              <option value="TOUTES">Toutes les agences (Vue Consolidée Siège)</option>
              {(agencesQuery.data ?? []).map((ag: any) => (
                <option key={ag.id} value={ag.id}>
                  {ag.estSiege ? '[Siège] ' : ''}{ag.nom} ({ag.ville})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="tab-bar">
        {isSuperOrAdminSiege && (
          <button className={clsx('tab-button', activeTab === 'agences' && 'active')} onClick={() => setActiveTab('agences')}>
            <Buildings size={17} /> Agences & Succursales ({(agencesQuery.data ?? []).length})
          </button>
        )}
        {isSuperOrAdminSiege && (
          <button className={clsx('tab-button', activeTab === 'roles' && 'active')} onClick={() => setActiveTab('roles')}>
            <ShieldCheck size={17} /> Rôles et Habilitations RBAC
          </button>
        )}
        <button className={clsx('tab-button', activeTab === 'utilisateurs' && 'active')} onClick={() => setActiveTab('utilisateurs')}>
          <UsersThree size={17} /> Collaborateurs & Utilisateurs ({(usersQuery.data ?? []).filter((u: any) => adminAgenceFilter === 'TOUTES' ? true : u.agenceId === adminAgenceFilter).length})
        </button>
        <button className={clsx('tab-button', activeTab === 'appareils' && 'active')} onClick={() => setActiveTab('appareils')}>
          <Devices size={17} /> Appareils Enregistrés ({(appareilsQuery.data ?? []).filter((a: any) => adminAgenceFilter === 'TOUTES' ? true : a.agenceId === adminAgenceFilter).length})
        </button>
        {isSuperOrAdminSiege && (
          <button className={clsx('tab-button', activeTab === 'entreprise' && 'active')} onClick={() => setActiveTab('entreprise')}>
            <Buildings size={17} /> Mentions Légales & Société
          </button>
        )}
        <button className={clsx('tab-button', activeTab === 'flotte' && 'active')} onClick={() => setActiveTab('flotte')}>
          <Truck size={17} /> Camions & Flotte ({(flotteQuery.data ?? []).filter((f: any) => adminAgenceFilter === 'TOUTES' ? true : f.agenceId === adminAgenceFilter).length})
        </button>
        <button className={clsx('tab-button', activeTab === 'categories' && 'active')} onClick={() => setActiveTab('categories')}>
          <Package size={17} /> Catégories & Articles ({(categoriesQuery.data ?? []).length})
        </button>
        <button className={clsx('tab-button', activeTab === 'taux' && 'active')} onClick={() => setActiveTab('taux')}>
          <CurrencyCircleDollar size={17} /> {isSuperOrAdminSiege ? 'Validation Taux du jour' : 'Taux Agence'}
        </button>
        <button className={clsx('tab-button', activeTab === 'prix' && 'active')} onClick={() => setActiveTab('prix')}>
          <Package size={17} /> {isSuperOrAdminSiege ? 'Validation Prix par agence' : 'Tarifs & Prix Agence'}
        </button>
        {isSuperOrAdminSiege && (
          <button className={clsx('tab-button', activeTab === 'audit' && 'active')} onClick={() => setActiveTab('audit')}>
            <ClockCounterClockwise size={17} /> Journal d Audit
          </button>
        )}
        {isSuperOrAdminSiege && (
          <button className={clsx('tab-button', activeTab === 'sauvegardes' && 'active')} onClick={() => setActiveTab('sauvegardes')}>
            <FloppyDisk size={17} /> Sauvegardes & Exports
          </button>
        )}
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
            columns={['Nom & Prénom', 'Email / Identifiant', 'Rôle & VIP', 'Agence rattachée', 'Appareil lié & Statut', 'Actions']}
            loading={usersQuery.isLoading}
            rows={(usersQuery.data ?? [])
              .filter((u: any) => adminAgenceFilter === 'TOUTES' ? true : u.agenceId === adminAgenceFilter)
              .map((u: any) => [
              <div key={u.id + '-nom'}>
                <strong>{u.nom}</strong>
                {u.sessionActiveId && (
                  <span style={{ marginLeft: 6, fontSize: '0.68rem', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                    En Ligne
                  </span>
                )}
              </div>,
              <div key={u.id + '-email'}>
                <div>{u.email}</div>
                {u.doitChangerMotDePasse && (
                  <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                    MDP temp. à changer au 1er login
                  </span>
                )}
              </div>,
              <div key={u.id + '-role'} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <code>{u.role}</code>
                {u.estVip ? (
                  <span className="badge" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fcd34d', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Crown size={12} weight="fill" /> VIP Multi-Appareils
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>1 Appareil unique</span>
                )}
              </div>,
              u.agence?.nom ?? `Agence #${u.agenceId}`,
              <div key={u.id + '-device-stat'}>
                <div style={{ marginBottom: 4 }}>
                  {u.estBloque ? (
                    <span className="badge badge-danger" title={u.motifBlocage}>
                      Bloqué ({u.motifBlocage === 'TENTATIVES_EXCESSIVES' ? '> 5 tentatives' : u.motifBlocage === 'CONNEXION_MULTI_APPAREILS' ? 'Multi-Appareil' : 'Sécurité'})
                    </span>
                  ) : u.actif !== false ? (
                    <span className="badge badge-success">Actif</span>
                  ) : (
                    <span className="badge badge-danger">Inactif / Suspendu</span>
                  )}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Devices size={13} />
                  <span>{u.appareilActifNom || u.appareilActifId || 'Aucun appareil lié'}</span>
                </div>
              </div>,
              <div key={u.id + '-actions'} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {/* BOUTON DÉCONNEXION DE L'UTILISATEUR PAR L'ADMINISTRATEUR */}
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => deconnecterUserMutation.mutate(u.id)}
                  title="Déconnecter immédiatement cet utilisateur et révoquer sa session active"
                  disabled={deconnecterUserMutation.isPending}
                >
                  <SignOut size={14} /> Déconnecter
                </button>

                {/* BOUTON DÉBLOQUER & RÉINITIALISER MOT DE PASSE (AVEC MDP TEMPORAIRE) */}
                <button
                  type="button"
                  className="secondary-action"
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    color: u.estBloque ? '#dc2626' : undefined,
                    borderColor: u.estBloque ? '#fca5a5' : undefined,
                    fontWeight: u.estBloque ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => {
                    setDebloquerTargetUser(u)
                    setTempPasswordInput('TempPass' + Math.floor(1000 + Math.random() * 9000))
                    setLibererAppareilCheck(true)
                    setShowDebloquerModal(true)
                  }}
                  title="Débloquer le compte et lui fournir un mot de passe temporaire à changer au 1er login"
                >
                  <Key size={14} /> {u.estBloque ? 'Débloquer + MDP Temp' : 'Définir MDP Temp'}
                </button>

                {/* BOUTON VIP (MULTI-APPAREILS) */}
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => toggleVipMutation.mutate(u.id)}
                  title={u.estVip ? 'Rétrograder en mono-appareil strict' : 'Déclarer VIP pour autoriser plusieurs appareils'}
                >
                  <Crown size={14} weight={u.estVip ? 'fill' : 'regular'} /> {u.estVip ? 'Retirer VIP' : 'Rendre VIP'}
                </button>

                <button
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
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
                  <PencilSimple size={14} /> Modifier
                </button>

                <button
                  className={u.actif !== false ? 'secondary-action' : 'primary-action'}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.78rem',
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

      {/* ONGLET GESTION DU PARC D'APPAREILS ENREGISTRÉS */}
      {activeTab === 'appareils' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Devices size={22} style={{ color: 'var(--accent-strong)' }} />
                Registre & Sécurité du Parc d'Appareils
              </h3>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.88rem' }}>
                Politique de sécurité mono-appareil : chaque utilisateur non-VIP est verrouillé sur un seul terminal. Les appareils peuvent être enregistrés, autorisés ou bloqués.
              </p>
            </div>
            <button className="primary-action" onClick={() => setShowNewAppareilModal(true)}>
              <Plus size={18} /> Enregistrer un Appareil
            </button>
          </div>

          <DataTable
            columns={['Nom de l Appareil', 'Identifiant Matériel (Device ID)', 'Type / Catégorie', 'Agence Affectée', 'Utilisateur Assigné', 'Statut', 'Dernière Connexion', 'Actions']}
            loading={appareilsQuery.isLoading}
            rows={(appareilsQuery.data ?? [])
              .filter((ap: any) => adminAgenceFilter === 'TOUTES' ? true : ap.agenceId === adminAgenceFilter)
              .map((ap: any) => [
              <strong>{ap.nom}</strong>,
              <code style={{ fontSize: '0.78rem' }}>{ap.deviceId}</code>,
              <span className="badge">{ap.type}</span>,
              ap.agence?.nom ?? `Agence #${ap.agenceId}`,
              ap.userNom || (ap.user?.nom ?? 'Non assigné'),
              <span
                key={ap.id + '-stat'}
                className={clsx('badge', ap.statut === 'AUTORISE' ? 'badge-success' : 'badge-danger')}
              >
                {ap.statut}
              </span>,
              ap.derniereConnexion ? new Date(ap.derniereConnexion).toLocaleString('fr-FR') : 'Jamais',
              <div key={ap.id + '-act'} style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={ap.statut === 'AUTORISE' ? 'secondary-action' : 'primary-action'}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    color: ap.statut === 'AUTORISE' ? '#dc2626' : undefined,
                    borderColor: ap.statut === 'AUTORISE' ? '#fca5a5' : undefined,
                  }}
                  onClick={() =>
                    toggleAppareilStatutMutation.mutate({
                      id: ap.id,
                      statut: ap.statut === 'AUTORISE' ? 'BLOQUE' : 'AUTORISE',
                    })
                  }
                  title={ap.statut === 'AUTORISE' ? 'Bloquer cet appareil' : 'Autoriser cet appareil'}
                >
                  {ap.statut === 'AUTORISE' ? 'Bloquer' : 'Autoriser'}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => {
                    if (confirm(`Confirmez-vous la suppression de l'appareil "${ap.nom}" ?`)) {
                      deleteAppareilMutation.mutate(ap.id)
                    }
                  }}
                  title="Supprimer cet appareil"
                >
                  <Trash size={14} /> Supprimer
                </button>
              </div>,
            ])}
            emptyText="Aucun appareil enregistré dans le parc informatique."
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
            rows={(tauxQuery.data ?? [])
              .filter((t: any) => adminAgenceFilter === 'TOUTES' ? true : t.agenceId === adminAgenceFilter)
              .map((t: any) => [
              t.dateDebut ? new Date(t.dateDebut).toLocaleDateString() : '-',
              t.agence?.nom ?? 'Agence locale',
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
            rows={(prixQuery.data ?? [])
              .filter((p: any) => adminAgenceFilter === 'TOUTES' ? true : p.agenceId === adminAgenceFilter)
              .map((p: any) => [
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
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: 14 }}>
              <label>
                Nom / Raison Sociale officielle
                <input
                  value={formEntreprise.nomSociete || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, nomSociete: e.target.value })}
                  placeholder="ex: Votre Société SARL"
                  required
                />
              </label>
              <label>
                Sigle / Abréviation officielle
                <input
                  value={formEntreprise.sigle || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, sigle: e.target.value })}
                  placeholder="ex: Sigle ou Acronyme court"
                />
              </label>
              <label>
                Slogan / Activité principale
                <input
                  value={formEntreprise.slogan || ''}
                  onChange={(e) => setFormEntreprise({ ...formEntreprise, slogan: e.target.value })}
                  placeholder="ex: Transformation & Distribution"
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

            <div style={{ padding: 20, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.35)', marginTop: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={22} color="#059669" />
                </div>
                <div>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    Logos de l'En-Tête & Filigrane des Documents (100% Configurables)
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    Aucun logo codé en dur • Personnalisation dynamique pour l'ensemble des factures, BL et documents officiels
                  </span>
                </div>
              </div>

              <p style={{ margin: '4px 0 16px', fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.45 }}>
                Configurez librement le <strong>logo officiel principal (en-tête gauche)</strong>, le <strong>logo/sceau secondaire (en-tête droite)</strong> et le <strong>filigrane de sécurité (watermark)</strong>. Ces éléments sont injectés en temps réel lors de l'impression et de l'export PDF.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* 1. LOGO PRINCIPAL (EN-TÊTE GAUCHE) */}
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                        1. Logo Principal (Haut Gauche de l'En-Tête)
                      </span>
                      {formEntreprise.logoUrl && (
                        <button
                          type="button"
                          className="secondary-action"
                          style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setFormEntreprise({ ...formEntreprise, logoUrl: '' })}
                        >
                          <Trash size={12} /> Effacer
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '0.78rem', marginBottom: 6 }}
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
                    <input
                      type="text"
                      placeholder="Ou URL image : https://... ou data:image/..."
                      value={formEntreprise.logoUrl || ''}
                      onChange={(e) => setFormEntreprise({ ...formEntreprise, logoUrl: e.target.value })}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* 2. LOGO / SCEAU SECONDAIRE (EN-TÊTE DROITE - OPTIONNEL) */}
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                        2. Logo / Sceau Secondaire (Haut Droite de l'En-Tête - Optionnel)
                      </span>
                      {formEntreprise.logoDroiteUrl && (
                        <button
                          type="button"
                          className="secondary-action"
                          style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setFormEntreprise({ ...formEntreprise, logoDroiteUrl: '' })}
                        >
                          <Trash size={12} /> Effacer
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '0.78rem', marginBottom: 6 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            const base64 = ev.target?.result as string
                            setFormEntreprise({ ...formEntreprise, logoDroiteUrl: base64 })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Ou URL sceau/certification : https://..."
                      value={formEntreprise.logoDroiteUrl || ''}
                      onChange={(e) => setFormEntreprise({ ...formEntreprise, logoDroiteUrl: e.target.value })}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* 3. FILIGRANE DE SÉCURITÉ DÉDIÉ & OPACITÉ */}
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                        3. Filigrane de Sécurité (Watermark Centré)
                      </span>
                      {formEntreprise.logoFiligraneUrl && (
                        <button
                          type="button"
                          className="secondary-action"
                          style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setFormEntreprise({ ...formEntreprise, logoFiligraneUrl: '' })}
                        >
                          <Trash size={12} /> Réutiliser logo principal
                        </button>
                      )}
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Par défaut, le filigrane reprend le logo principal. Vous pouvez aussi téléverser une image de filigrane dédiée (ex: sceau monochrome).
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '0.78rem', marginBottom: 6 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            const base64 = ev.target?.result as string
                            setFormEntreprise({ ...formEntreprise, logoFiligraneUrl: base64 })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                      <label style={{ fontSize: '0.75rem', margin: 0 }}>
                        Opacité du filigrane ({formEntreprise.filigraneOpacite ?? 5}%)
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={formEntreprise.filigraneOpacite ?? 5}
                          onChange={(e) => setFormEntreprise({ ...formEntreprise, filigraneOpacite: Number(e.target.value) })}
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </label>
                      <label style={{ fontSize: '0.75rem', margin: 0 }}>
                        Texte alternatif filigrane
                        <input
                          type="text"
                          value={formEntreprise.filigraneTexte || ''}
                          placeholder="ex: Sigle ou Nom société"
                          onChange={(e) => setFormEntreprise({ ...formEntreprise, filigraneTexte: e.target.value })}
                          style={{ fontSize: '0.8rem', marginTop: 4 }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* TRIPLE APERÇU EN DIRECT DU DOCUMENT OFFICIEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                    Aperçu en Temps Réel sur Document :
                  </div>

                  {/* 1. RENDU EN-TÊTE BILATÉRALE */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fff' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                      En-Tête Bilatérale (Haut de Page A4)
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #0f172a', paddingBottom: 8 }}>
                      {/* GAUCHE */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {formEntreprise.logoUrl ? (
                           <img src={formEntreprise.logoUrl} alt="Logo Gauche" style={{ maxHeight: 38, maxWidth: 90, objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: 34, height: 34, background: '#0f172a', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {(formEntreprise.sigle || formEntreprise.nomSociete || 'EN').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{formEntreprise.nomSociete || formEntreprise.sigle || 'Votre Entreprise'}</div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{formEntreprise.slogan || 'Production & Distribution'}</div>
                        </div>
                      </div>

                      {/* DROITE */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#475569' }}>RCCM: {formEntreprise.rccm || 'CD/GOM/...'}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857' }}>FACTURE N° 2026-001</div>
                        </div>
                        {formEntreprise.logoDroiteUrl ? (
                          <img src={formEntreprise.logoDroiteUrl} alt="Logo Droit" style={{ maxHeight: 32, maxWidth: 60, objectFit: 'contain' }} />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* 2. RENDU FILIGRANE DE SÉCURITÉ CENTRÉ */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff', position: 'relative', overflow: 'hidden', minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ position: 'absolute', top: 6, left: 10, fontSize: '0.68rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', zIndex: 3 }}>
                      Filigrane de Sécurité Arrière-Plan (Watermark)
                    </span>

                    {/* IMAGE OU TEXTE DU FILIGRANE */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
                      {formEntreprise.logoFiligraneUrl || formEntreprise.logoUrl ? (
                        <img
                          src={formEntreprise.logoFiligraneUrl || formEntreprise.logoUrl}
                          alt="Filigrane"
                          style={{
                            maxHeight: 85,
                            maxWidth: 160,
                            objectFit: 'contain',
                            opacity: (formEntreprise.filigraneOpacite ?? 5) / 100,
                            filter: 'grayscale(100%)',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', opacity: (formEntreprise.filigraneOpacite ?? 5) / 100, border: '3px solid #0f172a', borderRadius: '50%', padding: '12px 20px', textTransform: 'uppercase' }}>
                          {formEntreprise.filigraneTexte || formEntreprise.sigle || formEntreprise.nomSociete || 'FILIGRANE'}
                        </div>
                      )}
                    </div>

                    {/* SIMULATION CONTENU DOCUMENT DEVANT LE FILIGRANE */}
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Farine de Maïs Extra • 50 Sacs x $24.50</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Total à payer : $1,225.00 USD (Payé au comptoir)</div>
                      <div style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
                        ✓ Filigrane visible et non intrusif lors de l'impression
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION GOUVERNANCE SIÈGE & RÈGLES DE VALIDATION */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: 'rgba(37, 99, 235, 0.05)',
                borderRadius: 10,
                border: '1px solid rgba(37, 99, 235, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <ShieldCheck size={24} style={{ color: '#2563eb' }} />
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>
                    Règles de Gouvernance Siège & Seuils de Validation des Agences
                  </strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    Paramétré par l'Administrateur du Siège. Les agences opèrent en autonomie courante mais les décisions majeures excédant ces montants requièrent obligatoirement le visa du siège.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label>
                  Plafond d'autonomie des États de Besoin en Agence (USD) :
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={formEntreprise.plafondAutonomieEtatBesoinAgenceUsd ?? 200}
                      onChange={(e) =>
                        setFormEntreprise({
                          ...formEntreprise,
                          plafondAutonomieEtatBesoinAgenceUsd: Number(e.target.value),
                        })
                      }
                      required
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>USD</span>
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                    Toute réquisition locale supérieure à ce montant déclenche automatiquement le circuit de <strong>Visa Obligatoire par l'Admin du Siège</strong> avant décaissement en caisse.
                  </small>
                </label>

                <label>
                  Plafond des Dépenses Directes Caisses Agence (USD) :
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={formEntreprise.plafondDepenseDirecteAgenceUsd ?? 150}
                      onChange={(e) =>
                        setFormEntreprise({
                          ...formEntreprise,
                          plafondDepenseDirecteAgenceUsd: Number(e.target.value),
                        })
                      }
                      required
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>USD</span>
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                    Plafond autorisé pour menues dépenses directes sans état de besoin préalable.
                  </small>
                </label>
              </div>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(37, 99, 235, 0.15)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={formEntreprise.doubleValidationTransfertObligatoire ?? true}
                    onChange={(e) =>
                      setFormEntreprise({
                        ...formEntreprise,
                        doubleValidationTransfertObligatoire: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Exiger systématiquement la Double Validation pour les transferts de stock</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                      Circuit rigoureux : 1. Validation de départ par le Chef d'Agence expéditrice → 2. Visa de Direction / Admin du Siège autorisant le convoi → 3. Réception contradictoire par l'Agence réceptrice.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="primary-action" type="submit" disabled={updateEntrepriseMutation.isPending}>
                <CheckCircle size={18} />
                {updateEntrepriseMutation.isPending ? 'Enregistrement...' : 'Enregistrer les Mentions Légales & Paramètres'}
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
            rows={(flotteQuery.data ?? [])
              .filter((v: any) => adminAgenceFilter === 'TOUTES' ? true : v.agenceId === adminAgenceFilter)
              .map((v: any) => [
              <strong key={'plk-' + v.id}>{v.plaqueImmatriculation}</strong>,
              v.marqueModele,
              `${v.capaciteTonnes} T (${v.capaciteSacs} sacs)`,
              <span key={'chf-' + v.id}>{v.chauffeurNom} {v.chauffeurTelephone ? <small style={{ color: 'var(--muted)' }}>({v.chauffeurTelephone})</small> : ''}</span>,
              v.agence?.nom ?? `Agence #${v.agenceId}`,
              <span key={'st-' + v.id} className={clsx('badge', v.statut === 'DISPONIBLE' ? 'badge-success' : v.statut === 'EN_COURSE' ? 'badge-warning' : 'badge-danger')}>
                {v.statut === 'DISPONIBLE' ? 'Disponible' : v.statut === 'EN_COURSE' ? 'En course' : 'Maintenance'}
              </span>,
              <div key={'act-' + v.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                  value={v.statut}
                  onChange={(e) => updateVehiculeStatutMutation.mutate({ id: v.id, statut: e.target.value })}
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="EN_COURSE">En course</option>
                  <option value="EN_MAINTENANCE">Maintenance</option>
                </select>
                <button
                  type="button"
                  className="secondary-action"
                  style={{ padding: '3px 6px', fontSize: '0.76rem', color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => {
                    if (confirm(`Confirmez-vous le retrait du véhicule ${v.marqueModele} (${v.plaqueImmatriculation}) ?`)) {
                      deleteVehiculeMutation.mutate(v.id)
                    }
                  }}
                  title="Supprimer ce véhicule"
                >
                  <Trash size={13} />
                </button>
              </div>,
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
      {/* MODAL DÉBLOCAGE UTILISATEUR & GÉNÉRATION MOT DE PASSE TEMPORAIRE */}
      {showDebloquerModal && debloquerTargetUser && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-strong)' }}>
              <Key size={22} />
              Débloquer le Compte & Définir un Mot de Passe Temporaire
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.86rem', margin: '4px 0 16px', lineHeight: 1.5 }}>
              Déblocage du compte de <strong>{debloquerTargetUser.nom}</strong> ({debloquerTargetUser.email}). Un mot de passe temporaire sera défini et l'utilisateur devra obligatoirement le modifier lors de sa prochaine connexion (premier login).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                debloquerUserMutation.mutate({
                  userId: debloquerTargetUser.id,
                  tempPassword: tempPasswordInput,
                  libererAppareil: libererAppareilCheck,
                })
              }}
            >
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Mot de passe temporaire attribué :
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    required
                    style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setTempPasswordInput('TempPass' + Math.floor(1000 + Math.random() * 9000))}
                    title="Générer un autre mot de passe"
                  >
                    Générer
                  </button>
                </div>
              </label>

              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={libererAppareilCheck}
                    onChange={(e) => setLibererAppareilCheck(e.target.checked)}
                    style={{ width: 17, height: 17 }}
                  />
                  <span>Délier l'appareil actif précédent (permet la reconnexion sur un nouveau poste)</span>
                </label>
              </div>

              <div style={{ marginTop: 12, padding: 10, background: 'var(--accent-soft)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--accent-strong)' }}>
                ℹ️ Règle de sécurité : Le compteur des 5 tentatives erronées sera remis à zéro et le compte déverrouillé immédiatement.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowDebloquerModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={debloquerUserMutation.isPending}>
                  {debloquerUserMutation.isPending ? 'Déblocage...' : 'Valider & Débloquer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENREGISTRER UN NOUVEL APPAREIL */}
      {showNewAppareilModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Devices size={22} style={{ color: 'var(--accent-strong)' }} />
              Enregistrer un Nouvel Appareil
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.86rem', margin: '4px 0 16px' }}>
              Enregistrement d'un terminal dans le parc informatique de l'entreprise avec autorisation préalable d'accès.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createAppareilMutation.mutate()
              }}
            >
              <label>
                Nom usuel de l'appareil
                <input
                  value={newAppareilNom}
                  onChange={(e) => setNewAppareilNom(e.target.value)}
                  placeholder="ex: Caisse Principale POS Goma #1"
                  required
                />
              </label>

              <label style={{ marginTop: 12 }}>
                Identifiant matériel unique (Device ID / UUID)
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={newAppareilId}
                    onChange={(e) => setNewAppareilId(e.target.value)}
                    placeholder="ex: DEV-POS-GOMA-01 ou UUID"
                    required
                    style={{ flex: 1, fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setNewAppareilId('DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase())}
                  >
                    Générer ID
                  </button>
                </div>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Type d'appareil
                  <select value={newAppareilType} onChange={(e) => setNewAppareilType(e.target.value)}>
                    <option value="PC_BUREAU">PC / Poste Bureau</option>
                    <option value="PORTABLE">PC Portable</option>
                    <option value="TERMINAL_POS">Terminal Caisse POS</option>
                    <option value="TABLETTE">Tablette Magasin</option>
                    <option value="MOBILE">Smartphone / Mobile</option>
                  </select>
                </label>

                <label>
                  Agence d'affectation
                  <select value={newAppareilAgenceId} onChange={(e) => setNewAppareilAgenceId(Number(e.target.value))}>
                    {(agencesQuery.data ?? []).map((ag: any) => (
                      <option key={ag.id} value={ag.id}>{ag.nom} ({ag.ville})</option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={{ marginTop: 12 }}>
                Assigner à un utilisateur spécifique (Optionnel)
                <select value={newAppareilUserId} onChange={(e) => setNewAppareilUserId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- Aucun utilisateur assigné (Terminal libre) --</option>
                  {(usersQuery.data ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nom} ({u.email} - {u.role})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAppareilModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={createAppareilMutation.isPending}>
                  {createAppareilMutation.isPending ? 'Enregistrement...' : 'Enregistrer l Appareil'}
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
