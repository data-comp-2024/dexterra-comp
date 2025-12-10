/**
 * Custom hook for loading and managing data
 */

import { useState, useEffect } from 'react'
import {
  loadWashrooms,
  loadTasks,
  loadCrewData,
  loadEmergencyEvents,
  loadHappyScoreData,
  loadSimulationData,
} from '../services/dataService'
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
import { SimulationData, loadFlights, loadDemandForecast, loadRiskForecast, loadActivityLog } from '../services/dataService'

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
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useData(): UseDataReturn {
  const [washrooms, setWashrooms] = useState<Washroom[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [crew, setCrew] = useState<Crew[]>([])
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEvent[]>([])
  const [happyScores, setHappyScores] = useState<HappyScore[]>([])
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const [demandForecast, setDemandForecast] = useState<DemandForecast[]>([])
  const [riskForecast, setRiskForecast] = useState<RiskForecast[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load washrooms first (needed for tasks)
      const washroomsResult = await loadWashrooms()
      setWashrooms(washroomsResult)
      
      // Load crew data (needed for tasks)
      const crewResult = await loadCrewData()
      setCrew(crewResult)
      const crewIds = crewResult.map((c) => c.id)
      const washroomIds = washroomsResult.map((w) => w.id)
      
      // Load all other data in parallel with individual error handling
      // Each function now handles its own errors and falls back to mock data
      const [
        tasksData,
        emergencyEventsData,
        simulationDataResult,
        flightsData,
        activityLogData,
      ] = await Promise.allSettled([
        loadTasks(washroomIds, crewIds),
        loadEmergencyEvents(),
        loadSimulationData(),
        loadFlights(),
        loadActivityLog(),
      ])

      // Extract values from Promise.allSettled results
      const tasksResult = tasksData.status === 'fulfilled' ? tasksData.value : { tasks: [], taskTitleMap: new Map() }
      setTasks(tasksResult.tasks || [])
      setEmergencyEvents(
        emergencyEventsData.status === 'fulfilled' ? emergencyEventsData.value : []
      )
      setSimulationData(
        simulationDataResult.status === 'fulfilled' ? simulationDataResult.value : null
      )
      setFlights(flightsData.status === 'fulfilled' ? flightsData.value : [])
      
      // Load Happy Score data with washrooms for better ID mapping
      const [happyScoresResult, demandForecastData, riskForecastData] = await Promise.allSettled([
        loadHappyScoreData(washroomsResult),
        loadDemandForecast(washroomsResult, 12),
        loadRiskForecast(washroomsResult, 12),
      ])
      
      setHappyScores(
        happyScoresResult.status === 'fulfilled' ? happyScoresResult.value : []
      )

      setDemandForecast(
        demandForecastData.status === 'fulfilled' ? demandForecastData.value : []
      )
      setRiskForecast(
        riskForecastData.status === 'fulfilled' ? riskForecastData.value : []
      )
      setActivityLog(
        activityLogData.status === 'fulfilled' ? activityLogData.value : []
      )

      // Log any rejected promises (though they should all resolve with mock data)
      const rejected = [
        tasksData,
        emergencyEventsData,
        simulationDataResult,
        flightsData,
        happyScoresResult,
        demandForecastData,
        riskForecastData,
        activityLogData,
      ].filter((result) => result.status === 'rejected')

      if (rejected.length > 0) {
        console.warn('Some data sources failed to load:', rejected)
      }
    } catch (err) {
      // This should rarely happen now since individual functions handle errors
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Unexpected error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

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
    loading,
    error,
    refresh: loadAllData,
  }
}

