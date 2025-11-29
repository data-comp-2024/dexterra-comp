import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ConnectionStatus } from '../../services/websocketService'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  lastDataRefresh: number | null // Store as timestamp (number) instead of Date
  connectionStatus: ConnectionStatus | 'polling' // 'polling' means fallback mode
}

const initialState: UIState = {
  theme: 'light',
  sidebarOpen: true,
  lastDataRefresh: null,
  connectionStatus: 'polling',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setLastDataRefresh: (state, action: PayloadAction<number>) => {
      // Store timestamp as number (serializable)
      state.lastDataRefresh = action.payload
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<ConnectionStatus | 'polling'>
    ) => {
      state.connectionStatus = action.payload
    },
  },
})

export const {
  setTheme,
  toggleSidebar,
  setLastDataRefresh,
  setConnectionStatus,
} = uiSlice.actions

export default uiSlice.reducer

