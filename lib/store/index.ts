import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MarketRegime = 'risk-on' | 'risk-off' | 'neutral'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  sidebarMobileOpen: boolean
  setSidebarMobileOpen: (open: boolean) => void
  toggleSidebarMobile: () => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Selected items
  selectedCountry: string | null
  setSelectedCountry: (country: string | null) => void
  selectedCluster: string | null
  setSelectedCluster: (cluster: string | null) => void

  // View preferences
  mapStyle: 'dark' | 'satellite'
  setMapStyle: (style: 'dark' | 'satellite') => void
  tablePageSize: number
  setTablePageSize: (size: number) => void

  // Alerts
  unreadAlertCount: number
  setUnreadAlertCount: (count: number) => void
  incrementUnreadAlerts: () => void

  // Research mode
  researchQuery: string
  setResearchQuery: (query: string) => void
  researchFilters: {
    countries: string[]
    topics: string[]
    sources: string[]
    dateRange: { from: string | null; to: string | null }
    minSeverity: number
    minConfidence: number
  }
  setResearchFilters: (filters: Partial<UIState['researchFilters']>) => void
  resetResearchFilters: () => void

  // Market dashboard
  selectedSymbols: string[]
  addSymbol: (symbol: string) => void
  removeSymbol: (symbol: string) => void
  marketRegime: MarketRegime
  setMarketRegime: (regime: MarketRegime) => void
}

const defaultResearchFilters = {
  countries: [],
  topics: [],
  sources: [],
  dateRange: { from: null, to: null },
  minSeverity: 0,
  minConfidence: 0,
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      sidebarMobileOpen: false,
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      toggleSidebarMobile: () => set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),

      // Command palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Selected items
      selectedCountry: null,
      setSelectedCountry: (country) => set({ selectedCountry: country }),
      selectedCluster: null,
      setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),

      // View preferences
      mapStyle: 'dark',
      setMapStyle: (style) => set({ mapStyle: style }),
      tablePageSize: 25,
      setTablePageSize: (size) => set({ tablePageSize: size }),

      // Alerts
      unreadAlertCount: 0,
      setUnreadAlertCount: (count) => set({ unreadAlertCount: count }),
      incrementUnreadAlerts: () => set((state) => ({ unreadAlertCount: state.unreadAlertCount + 1 })),

      // Research mode
      researchQuery: '',
      setResearchQuery: (query) => set({ researchQuery: query }),
      researchFilters: defaultResearchFilters,
      setResearchFilters: (filters) => set((state) => ({
        researchFilters: { ...state.researchFilters, ...filters },
      })),
      resetResearchFilters: () => set({ researchFilters: defaultResearchFilters }),

      // Market dashboard
      selectedSymbols: [],
      addSymbol: (symbol) => set((state) => ({
        selectedSymbols: state.selectedSymbols.includes(symbol)
          ? state.selectedSymbols
          : [...state.selectedSymbols, symbol],
      })),
      removeSymbol: (symbol) => set((state) => ({
        selectedSymbols: state.selectedSymbols.filter((s) => s !== symbol),
      })),
      marketRegime: 'neutral',
      setMarketRegime: (regime) => set({ marketRegime: regime }),
    }),
    {
      name: 'intel-desk-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        mapStyle: state.mapStyle,
        tablePageSize: state.tablePageSize,
        selectedSymbols: state.selectedSymbols,
      }),
    }
  )
)

// Auth store for user session
interface AuthState {
  user: {
    id: string
    email: string
    role: 'admin' | 'analyst' | 'reader'
    fullName: string | null
  } | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: AuthState['user']) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  isAdmin: () => boolean
  isAnalyst: () => boolean
  canEdit: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user, isLoading: false }),
  clearUser: () => set({ user: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized, isLoading: false }),
  isAdmin: () => get().user?.role === 'admin',
  isAnalyst: () => get().user?.role === 'analyst',
  canEdit: () => {
    const role = get().user?.role
    return role === 'admin' || role === 'analyst'
  },
}))

