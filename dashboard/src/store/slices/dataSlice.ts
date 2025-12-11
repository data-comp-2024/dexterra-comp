import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  Washroom,
  Task,
  Crew,
  EmergencyEvent,
  HappyScore,
  Flight,
  DemandForecast,
  RiskForecast,
  ActivityLogEntry,
  Notification,
} from '../../types'
import {
  loadWashrooms,
  loadTasks,
  loadCrewData,
  loadEmergencyEvents,
  loadHappyScoreData,
  loadSimulationData,
  loadFlights,
  loadDemandForecast,
  loadRiskForecast,
  loadActivityLog,
  loadNotifications,
  SimulationData,
} from '../../services/dataService'

interface DataState {
  washrooms: Washroom[]
  tasks: Task[]
  crew: Crew[]
  emergencyEvents: EmergencyEvent[]
  happyScores: HappyScore[]
  simulationData: SimulationData | null
  flights: Flight[]
  demandForecast: DemandForecast[]
  riskForecast: RiskForecast[]
  activityLog: ActivityLogEntry[]
  notifications: Notification[]
  taskTitleMap: Record<string, string>
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

const initialState: DataState = {
  washrooms: [],
  tasks: [],
  crew: [],
  emergencyEvents: [],
  happyScores: [],
  simulationData: null,
  flights: [],
  demandForecast: [],
  riskForecast: [],
  activityLog: [],
  notifications: [],
  taskTitleMap: {},
  loading: false,
  error: null,
  lastUpdated: null,
}

export const fetchInitialData = createAsyncThunk(
  'data/fetchInitialData',
  async (_, { rejectWithValue }) => {
    try {
      // Load washrooms first (needed for tasks)
      const washrooms = await loadWashrooms()
      const washroomIds = washrooms.map((w) => w.id)

      // Load crew data (needed for tasks)
      const crew = await loadCrewData()
      const crewIds = crew.map((c) => c.id)

      // Load all other data in parallel
      const [
        tasksData,
        emergencyEvents,
        simulationData,
        flights,
        activityLog,
        happyScores,
        demandForecast,
        riskForecast,
        notifications,
      ] = await Promise.all([
        loadTasks(washroomIds, crewIds),
        loadEmergencyEvents(),
        loadSimulationData(),
        loadFlights(),
        loadActivityLog(),
        loadHappyScoreData(washrooms),
        loadDemandForecast(washrooms),
        loadRiskForecast(washrooms),
        loadNotifications(),
      ])

      // Convert Map to Record
      const taskTitleMap: Record<string, string> = {}
      if (tasksData.taskTitleMap) {
        tasksData.taskTitleMap.forEach((value, key) => {
          taskTitleMap[key] = value
        })
      }

      return {
        washrooms,
        crew,
        tasks: tasksData.tasks || [],
        taskTitleMap,
        emergencyEvents,
        simulationData,
        flights,
        activityLog,
        happyScores,
        demandForecast,
        riskForecast,
        notifications,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load data')
    }
  }
)

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    updateWashroom: (state, action: PayloadAction<Washroom>) => {
      const index = state.washrooms.findIndex((w) => w.id === action.payload.id)
      if (index !== -1) {
        state.washrooms[index] = action.payload
      }
    },
    deleteWashroom: (state, action: PayloadAction<string>) => {
      state.washrooms = state.washrooms.filter((w) => w.id !== action.payload)
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id)
      if (index !== -1) {
        state.tasks[index] = action.payload
      } else {
        state.tasks.push(action.payload)
      }
    },
    updateCrew: (state, action: PayloadAction<Crew>) => {
      const index = state.crew.findIndex((c) => c.id === action.payload.id)
      if (index !== -1) {
        state.crew[index] = action.payload
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload)
    },
    addActivityLogEntry: (state, action: PayloadAction<ActivityLogEntry>) => {
      state.activityLog.unshift(action.payload)
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInitialData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInitialData.fulfilled, (state, action) => {
        state.loading = false
        state.washrooms = action.payload.washrooms
        state.crew = action.payload.crew
        state.tasks = action.payload.tasks
        state.taskTitleMap = action.payload.taskTitleMap
        state.emergencyEvents = action.payload.emergencyEvents
        state.simulationData = action.payload.simulationData
        state.flights = action.payload.flights
        state.activityLog = action.payload.activityLog
        state.happyScores = action.payload.happyScores
        state.demandForecast = action.payload.demandForecast
        state.riskForecast = action.payload.riskForecast
        state.notifications = action.payload.notifications
        state.lastUpdated = Date.now()
      })
      .addCase(fetchInitialData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { updateWashroom, deleteWashroom, updateTask, updateCrew, deleteTask, addActivityLogEntry, addNotification } = dataSlice.actions
export default dataSlice.reducer
