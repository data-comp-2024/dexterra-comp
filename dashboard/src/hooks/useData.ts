/**
 * Custom hook for loading and managing data
 * Now backed by Redux store
 */

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { fetchInitialData } from '../store/slices/dataSlice'
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
} from '../types'
import { SimulationData } from '../services/dataService'

interface UseDataReturn {
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
  taskTitleMap?: Record<string, string>
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useData(): UseDataReturn {
  const dispatch = useDispatch<AppDispatch>()
  const {
    washrooms,
    tasks,
    crew,
    emergencyEvents,
    happyScores,
    simulationData,
    flights,
    demandForecast,
    riskForecast,
    activityLog,
    taskTitleMap,
    loading,
    error,
    lastUpdated,
  } = useSelector((state: RootState) => state.data)

  useEffect(() => {
    // Only fetch if data hasn't been loaded yet
    if (!lastUpdated && !loading) {
      dispatch(fetchInitialData())
    }
  }, [dispatch, lastUpdated, loading])

  const refresh = async () => {
    await dispatch(fetchInitialData()).unwrap()
  }

  return {
    washrooms,
    tasks,
    crew,
    emergencyEvents,
    happyScores,
    simulationData,
    flights,
    demandForecast,
    riskForecast,
    activityLog,
    taskTitleMap,
    loading,
    error: error ? new Error(error) : null,
    refresh,
  }
}


