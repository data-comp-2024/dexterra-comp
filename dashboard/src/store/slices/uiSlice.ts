import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  lastDataRefresh: Date | null
  connectionStatus: 'connected' | 'disconnected' | 'polling'
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
    setLastDataRefresh: (state, action: PayloadAction<Date>) => {
      state.lastDataRefresh = action.payload
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<'connected' | 'disconnected' | 'polling'>
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

