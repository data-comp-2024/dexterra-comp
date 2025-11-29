import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FilterState } from '../../types'

const initialState: FilterState = {
  terminal: undefined,
  zone: undefined,
  washroomType: undefined,
  crewGroup: undefined,
  timeRange: undefined,
}

const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setTerminalFilter: (state, action: PayloadAction<string[] | undefined>) => {
      state.terminal = action.payload
    },
    setZoneFilter: (state, action: PayloadAction<string[] | undefined>) => {
      state.zone = action.payload
    },
    setWashroomTypeFilter: (
      state,
      action: PayloadAction<string[] | undefined>
    ) => {
      state.washroomType = action.payload as any
    },
    setCrewGroupFilter: (state, action: PayloadAction<string[] | undefined>) => {
      state.crewGroup = action.payload
    },
    setTimeRangeFilter: (
      state,
      action: PayloadAction<{ start: Date; end: Date } | undefined>
    ) => {
      state.timeRange = action.payload
    },
    clearFilters: () => initialState,
  },
})

export const {
  setTerminalFilter,
  setZoneFilter,
  setWashroomTypeFilter,
  setCrewGroupFilter,
  setTimeRangeFilter,
  clearFilters,
} = filterSlice.actions

export default filterSlice.reducer

