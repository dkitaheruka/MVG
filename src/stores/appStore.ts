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
  selectedAgenceId: 'CONSOLIDE',

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
  setSelectedAgenceId: (selectedAgenceId) => set({ selectedAgenceId }),

  can: (permission) => {
    const { session } = get()
    if (!session) return false
    if (session.role === 'SUPER_ADMIN' || session.role === 'ADMIN_SIEGE') return true
    return session.permissions ? (session.permissions as string[]).includes(permission) : false
  },
}))
