import { create } from 'zustand'
import type { UserSession } from '../types'

export type SessionData = UserSession & {
  nom?: string
  agenceNom?: string
}

export type PrintProposal = {
  title: string
  subtitle?: string
  ref?: string
  primaryDocName: string
  primaryDocUrl: string
  secondaryDocName?: string
  secondaryDocUrl?: string
}

interface AppStore {
  session: SessionData | null
  theme: 'light' | 'dark'
  language: 'fr' | 'sw' | 'en'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  sidebarHidden: boolean
  printProposal: PrintProposal | null
  selectedAgenceId: number | 'CONSOLIDE'
  setSession: (session: SessionData | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (lang: 'fr' | 'sw' | 'en') => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  setSidebarHidden: (hidden: boolean) => void
  toggleSidebarHidden: () => void
  setPrintProposal: (proposal: PrintProposal | null) => void
  setSelectedAgenceId: (id: number | 'CONSOLIDE') => void
  updateSessionPermissions: (permissions: string[]) => void
  can: (permission: string) => boolean
}

const savedSession = (() => {
  try {
    const raw = localStorage.getItem('matabishi_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

const initialTheme = (localStorage.getItem('matabishi_theme') as 'light' | 'dark') || 'light'
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme)
}

export const useAppStore = create<AppStore>((set, get) => ({
  session: savedSession,
  theme: initialTheme,
  language: (localStorage.getItem('matabishi_lang') as 'fr' | 'sw' | 'en') || 'fr',
  sidebarOpen: true,
  sidebarCollapsed: localStorage.getItem('matabishi_sidebar_collapsed') === 'true',
  sidebarHidden: localStorage.getItem('matabishi_sidebar_hidden') === 'true',
  printProposal: null,
  selectedAgenceId:
    savedSession && savedSession.role !== 'SUPER_ADMIN' && savedSession.role !== 'ADMIN_SIEGE'
      ? savedSession.agenceId || 1
      : 'CONSOLIDE',

  setSession: (session) => {
    if (session) {
      localStorage.setItem('matabishi_session', JSON.stringify(session))
      // If agency employee, lock selected agency to their own agency
      if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN_SIEGE') {
        set({ session, selectedAgenceId: session.agenceId || 1 })
        return
      }
    } else {
      localStorage.removeItem('matabishi_session')
    }
    set({ session })
  },

  setTheme: (theme) => {
    localStorage.setItem('matabishi_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  setLanguage: (language) => {
    localStorage.setItem('matabishi_lang', language)
    set({ language })
  },

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    localStorage.setItem('matabishi_sidebar_collapsed', String(sidebarCollapsed))
    set({ sidebarCollapsed })
  },
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed
    localStorage.setItem('matabishi_sidebar_collapsed', String(next))
    set({ sidebarCollapsed: next })
  },
  setSidebarHidden: (sidebarHidden) => {
    localStorage.setItem('matabishi_sidebar_hidden', String(sidebarHidden))
    set({ sidebarHidden })
  },
  toggleSidebarHidden: () => {
    const next = !get().sidebarHidden
    localStorage.setItem('matabishi_sidebar_hidden', String(next))
    set({ sidebarHidden: next })
  },
  setPrintProposal: (printProposal) => set({ printProposal }),
  setSelectedAgenceId: (selectedAgenceId) => {
    const { session } = get()
    if (session && session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN_SIEGE') {
      set({ selectedAgenceId: session.agenceId || 1 })
      return
    }
    set({ selectedAgenceId })
  },

  updateSessionPermissions: (permissions: string[]) => {
    const { session } = get()
    if (session) {
      const updated: SessionData = { ...session, permissions: permissions as any }
      try {
        localStorage.setItem('matabishi_session', JSON.stringify(updated))
      } catch {}
      set({ session: updated })
    }
  },

  can: (permission) => {
    const { session } = get()
    if (!session) return false
    // 1. Super Admin et Admin Siège ont tous les droits
    if (session.role === 'SUPER_ADMIN' || session.role === 'ADMIN_SIEGE') return true

    const perms = (session.permissions as string[]) || []

    // 2. Correspondance directe
    if (perms.includes(permission)) return true

    // 3. Correspondances configurables selon matrice RBAC de l'Administration :
    // - Maintenance & Gestion du parc matériel : accordé si flotte.gerer OU maintenance.gerer
    if (permission === 'flotte.gerer') {
      return perms.includes('flotte.gerer') || perms.includes('maintenance.gerer')
    }

    // - Contrôle de Gestion & TFT : accordé si cage.voir
    if (permission === 'cage.voir') {
      return perms.includes('cage.voir')
    }

    // - Graphiques & Analyses : analytics.voir
    if (permission === 'analytics.voir') {
      return perms.includes('analytics.voir')
    }

    // - Comptabilité SYSCOHADA : accordé si comptabilite.voir ou sous-permission
    if (
      permission === 'comptabilite.voir' ||
      permission === 'comptabilite.plan_gerer' ||
      permission === 'comptabilite.ecritures_voir'
    ) {
      return perms.includes('comptabilite.voir') || perms.some((p) => p.startsWith('comptabilite.'))
    }

    // - Reporting & Décisionnel
    if (permission === 'reporting.voir') {
      return perms.includes('reporting.voir') || perms.includes('reporting.exporter')
    }

    // - Ventes & Caisse POS
    if (permission === 'ventes.voir') {
      return perms.includes('ventes.voir') || perms.includes('ventes.creer')
    }

    // - Stocks & Dépôts
    if (permission === 'stocks.voir') {
      return perms.includes('stocks.voir') || perms.includes('stocks.corriger')
    }

    // - Achats & Matières premières
    if (permission === 'achats.gerer') {
      return perms.includes('achats.gerer') || perms.includes('achats.commandes')
    }

    // - RH & Paie
    if (permission === 'rh.gerer') {
      return perms.includes('rh.gerer') || perms.includes('rh.bulletins')
    }

    return false
  },
}))
