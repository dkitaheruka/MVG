import { create } from 'zustand'
import type { Language, PermissionCode, ThemeMode, UserSession } from '../types'

type AppState = {
  session: UserSession | null
  theme: ThemeMode
  language: Language
  sidebarOpen: boolean
  setSession: (session: UserSession | null) => void
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Language) => void
  setSidebarOpen: (open: boolean) => void
  can: (permission: PermissionCode) => boolean
}

const storedSession = localStorage.getItem('matabishi.session')
const storedTheme = localStorage.getItem('matabishi.theme') as ThemeMode | null
const storedLanguage = localStorage.getItem('matabishi.language') as Language | null

export const useAppStore = create<AppState>((set, get) => ({
  session: storedSession ? (JSON.parse(storedSession) as UserSession) : null,
  theme: storedTheme ?? 'light',
  language: storedLanguage ?? 'fr',
  sidebarOpen: false,
  setSession: (session) => {
    if (session) localStorage.setItem('matabishi.session', JSON.stringify(session))
    else localStorage.removeItem('matabishi.session')
    set({ session })
  },
  setTheme: (theme) => {
    localStorage.setItem('matabishi.theme', theme)
    document.documentElement.dataset.theme = theme
    set({ theme })
  },
  setLanguage: (language) => {
    localStorage.setItem('matabishi.language', language)
    set({ language })
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  can: (permission) => {
    const session = get().session
    if (!session) return false
    return session.role === 'SUPER_ADMIN' || session.role === 'ADMIN_SIEGE' || session.permissions.includes(permission)
  },
}))

document.documentElement.dataset.theme = storedTheme ?? 'light'
