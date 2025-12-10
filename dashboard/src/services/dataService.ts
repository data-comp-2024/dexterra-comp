/**
 * Data Service Layer
 * Handles loading and parsing data from various sources
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  Washroom,
  Task,
  Crew,
  EmergencyEvent,
  HappyScore,
  Headway,
  Flight,
  DemandForecast,
  RiskForecast,
  ActivityLogEntry,
} from '../types'
import { DATA_ROOT } from '../constants'

// Bathroom catalog data structure from bathroom.json
export interface BathroomCatalogItem {
  id: string
  terminal: string
  level: string
  zone: string
  gender: 'Men' | 'Women'
  nearest_gate: string
  coordinates: {
    x: number
    y: number
    z: number
  }
  facility_counts: {
    stalls: number
    urinals: number
  }
}

// Gate data structure from gates.json
export interface GateItem {
  id: string
  terminal: string
  level: string
  zone: string
  type: 'Gate'
  coordinates: {
    x: number
    y: number
    z: number
  }
}

// Janitor Closet data structure from janitorCloset.json
export interface JanitorClosetItem {
  id: string
  terminal: string
  level: string
  zone: string
  type: 'Janitor Closet'
  coordinates: {
    x: number
    y: number
    z: number
  }
}
import {
  generateMockWashrooms,
  generateMockTasks,
  generateMockCrew,
  generateMockEmergencyEvents,
  generateMockHappyScores,
  generateMockFlights,
  generateMockDemandForecast,
  generateMockRiskForecast,
  generateMockActivityLog,
} from './mockData'
import { normalizeWashroomId, validateWashroom, mapKioskPathToWashroomId } from './dataNormalization'

// Raw data types from files
export interface GatesWashroomsRow {
  name: string
  x: number
  y: number
  z: number
}

export interface SimulationData {
  metadata: {
    date: string
    export_timestamp: string
    num_bathrooms: number
  }
  bathrooms: Record<
    string,
    {
      summary: {
        total_users: number
        avg_wait_minutes: number
        max_wait_minutes: number
        avg_service_minutes: number
        max_queue_length: number
      }
      passengers: Array<{
        entry_time: string
        arrival_bath_time: string
        start_service: string
        finish_service: string
        wait_minutes: number
        service_minutes: number
        is_male: boolean
        origin: string
        destination: string
      }>
      queue_times?: Array<{
        time: string
        queue_length: number
      }>
    }
  >
}

/**
 * Load washrooms from bathroom.json catalog
 */
export async function loadWashrooms(): Promise<Washroom[]> {
  try {
    // Load from bathroom.json catalog
    const catalog = await loadBathroomCatalog()
    
    if (catalog.length === 0) {
      console.warn('No bathroom catalog data found, using mock data')
      return generateMockWashrooms()
    }

    // Convert BathroomCatalogItem[] to Washroom[]
    const washrooms: Washroom[] = catalog.map((bathroom) => {
      // Use the bathroom ID as the name (as requested)
      // Map gender to washroom type (Men/Women -> standard, could be enhanced)
      const type: WashroomType = 'standard'
      
      return {
        id: bathroom.id,
        name: bathroom.id, // Use ID as name to match catalog
        terminal: bathroom.terminal,
        gateProximity: bathroom.nearest_gate,
        type,
        coordinates: {
          x: bathroom.coordinates.x,
          y: bathroom.coordinates.y,
          z: bathroom.coordinates.z,
        },
        status: 'active' as const,
        sla: {
          maxHeadwayMinutes: 45,
          emergencyResponseTargetMinutes: 10,
        },
        happyScoreThreshold: 85,
      }
    })

    console.log(`Loaded ${washrooms.length} washrooms from bathroom catalog`)
    return washrooms
  } catch (error) {
    console.warn('Failed to load washrooms from bathroom catalog, using mock data:', error)
    return generateMockWashrooms()
  }
}

/**
 * Load simulation data from multi_od_results JSON
 */
export async function loadSimulationData(
  date: string = '2024-01-01'
): Promise<SimulationData | null> {
  try {
    // Try local file first (in dashboard directory)
    let jsonPath = `multi_od_results_${date}.json`
    let response = await fetch(jsonPath)

    // If not found, try DATA_ROOT
    if (!response.ok) {
      jsonPath = `${DATA_ROOT}/multi_od_results_${date}.json`
      response = await fetch(jsonPath)
    }

    if (!response.ok) {
      console.warn(`Simulation data not found for date ${date}`)
      return null
    }

    const data = await response.json()
    return data as SimulationData
  } catch (error) {
    console.warn('Failed to load simulation data:', error)
    return null
  }
}

/**
 * Load Happy Score monthly time series data from CSV
 * Format: Monthly aggregated data with Date, Happy Index, and Bathroom columns
 */
async function loadMonthlyHappyScoreData(washrooms: Washroom[] = []): Promise<HappyScore[]> {
  try {
    const possiblePaths = [
      '/df_monthly_distribution.csv', // Since publicDir is 'data', files are at root
      'data/df_monthly_distribution.csv',
      '/data/df_monthly_distribution.csv',
      './data/df_monthly_distribution.csv',
      '../data/df_monthly_distribution.csv',
      `${DATA_ROOT}/df_monthly_distribution.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      return []
    }

    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Monthly Happy Score CSV parsing warnings:', results.errors.slice(0, 5))
          }

          if (!results.data || results.data.length === 0) {
            resolve([])
            return
          }

          const happyScores: HappyScore[] = []

          // Log first row for debugging
          if (results.data.length > 0) {
            console.log('Sample monthly CSV row:', results.data[0])
            console.log('Available columns:', Object.keys(results.data[0]))
          }

          results.data.forEach((row: any, index: number) => {
            try {
              const bathroomId = String(row.Bathroom || '').trim()
              if (!bathroomId) {
                if (index < 3) console.warn(`Row ${index}: Missing Bathroom ID`, row)
                return
              }

              // Parse date - Year column contains the date string (e.g., "2024-01-01")
              // Date column appears to be empty, so use Year column
              let dateStr = String(row.Year || row.Date || '').trim()
              if (!dateStr && row.Year && row.Month) {
                // Fallback: construct date from Year and Month if Year is numeric
                const year = parseInt(String(row.Year), 10)
                const month = parseInt(String(row.Month), 10)
                if (!isNaN(year) && !isNaN(month)) {
                  dateStr = `${year}-${String(month).padStart(2, '0')}-01`
                }
              }
              if (!dateStr) {
                if (index < 3) console.warn(`Row ${index}: Missing date`, row)
                return
              }

              let timestamp: Date
              try {
                timestamp = new Date(dateStr)
                if (isNaN(timestamp.getTime())) {
                  if (index < 3) console.warn(`Row ${index}: Invalid date string: ${dateStr}`)
                  return
                }
              } catch {
                if (index < 3) console.warn(`Row ${index}: Date parsing error: ${dateStr}`)
                return
              }

              // Parse Happy Index (already 0-100 scale)
              const happyIndex = parseFloat(String(row['Happy Index'] || '0'))
              if (isNaN(happyIndex) || happyIndex < 0 || happyIndex > 100) {
                if (index < 3) console.warn(`Row ${index}: Invalid Happy Index: ${row['Happy Index']}`)
                return
              }

              happyScores.push({
                washroomId: bathroomId,
                score: Math.round(happyIndex),
                timestamp,
                source: 'aggregated',
                windowMinutes: 30 * 24 * 60, // Monthly aggregation (~30 days)
              })
            } catch (error) {
              if (index < 10) {
                console.warn(`Skipping malformed monthly Happy Score row ${index}:`, error, row)
              }
            }
          })

          console.log(`Loaded ${happyScores.length} monthly Happy Score entries from CSV`)
          resolve(happyScores)
        },
        error: (error: unknown) => {
          console.warn('Monthly Happy Score CSV parsing error:', error)
          resolve([])
        },
      })
    })
  } catch (error: unknown) {
    console.warn('Failed to load monthly Happy Score data:', error)
    return []
  }
}

/**
 * Load Happy Score hourly distribution data from CSV
 * Format: Hourly aggregated data with Time, Happy Index, and Bathroom columns
 */
async function loadHourlyHappyScoreData(washrooms: Washroom[] = []): Promise<HappyScore[]> {
  try {
    const possiblePaths = [
      '/bathroom_hourly_distribution.csv', // Since publicDir is 'data', files are at root
      'data/bathroom_hourly_distribution.csv',
      '/data/bathroom_hourly_distribution.csv',
      './data/bathroom_hourly_distribution.csv',
      '../data/bathroom_hourly_distribution.csv',
      `${DATA_ROOT}/bathroom_hourly_distribution.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      return []
    }

    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Hourly Happy Score CSV parsing warnings:', results.errors.slice(0, 5))
          }

          if (!results.data || results.data.length === 0) {
            resolve([])
            return
          }

          const happyScores: HappyScore[] = []
          const baseDate = new Date('2024-01-01') // Use 2024 as base year

          results.data.forEach((row: any, index: number) => {
            try {
              const bathroomId = String(row.Bathroom || '').trim()
              if (!bathroomId) return

              // Parse time (format: HH:MM:SS or HH:MM)
              const timeStr = String(row.Time || '').trim()
              if (!timeStr) return

              const [hours, minutes] = timeStr.split(':').map(Number)
              if (isNaN(hours) || isNaN(minutes)) return

              // Create timestamp using base date + time
              const timestamp = new Date(baseDate)
              timestamp.setHours(hours, minutes || 0, 0, 0)

              // Parse Happy Index (already 0-100 scale)
              const happyIndex = parseFloat(String(row['Happy Index'] || '0'))
              if (isNaN(happyIndex) || happyIndex < 0 || happyIndex > 100) return

              happyScores.push({
                washroomId: bathroomId,
                score: Math.round(happyIndex),
                timestamp,
                source: 'aggregated',
                windowMinutes: 60, // Hourly aggregation
              })
            } catch (error) {
              if (index < 10) {
                console.warn(`Skipping malformed hourly Happy Score row ${index}:`, error)
              }
            }
          })

          console.log(`Loaded ${happyScores.length} hourly Happy Score entries from CSV`)
          resolve(happyScores)
        },
        error: (error: unknown) => {
          console.warn('Hourly Happy Score CSV parsing error:', error)
          resolve([])
        },
      })
    })
  } catch (error: unknown) {
    console.warn('Failed to load hourly Happy Score data:', error)
    return []
  }
}

/**
 * Load Happy Score data from Happy or Not CSV
 * Format: Semicolon-delimited CSV with feedback events
 * Now also tries loading from monthly and hourly aggregated CSVs first
 */
export async function loadHappyScoreData(washrooms: Washroom[] = []): Promise<HappyScore[]> {
  try {
    // First, try loading monthly time series data (preferred for time series visualization)
    const monthlyData = await loadMonthlyHappyScoreData(washrooms)
    if (monthlyData.length > 0) {
      console.log(`Using monthly Happy Score data: ${monthlyData.length} entries`)
      return monthlyData
    }

    // Fallback to hourly data
    const hourlyData = await loadHourlyHappyScoreData(washrooms)
    if (hourlyData.length > 0) {
      console.log(`Using hourly Happy Score data: ${hourlyData.length} entries`)
      return hourlyData
    }

    // Fallback to original Happy or Not CSV format
    const possiblePaths = [
      `${DATA_ROOT}/Happy or Not 2024/Happy or Not Combined Data 2024.csv`,
      '../Happy or Not 2024/Happy or Not Combined Data 2024.csv',
      './Happy or Not 2024/Happy or Not Combined Data 2024.csv',
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      console.log('Happy Score CSV not found, using mock data')
      const washroomIds = washrooms.map((w) => w.id)
      return generateMockHappyScores(washroomIds)
    }

    return new Promise((resolve) => {
      // Parse semicolon-delimited CSV
      Papa.parse(text, {
        header: true,
        delimiter: ';', // Semicolon delimiter
        skipEmptyLines: true,
        dynamicTyping: false, // Keep as strings for flexible parsing
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Happy Score CSV parsing warnings:', results.errors.slice(0, 5))
          }

          if (!results.data || results.data.length === 0) {
            console.log('No Happy Score data in CSV, using mock data')
            const washroomIds = washrooms.map((w) => w.id)
            resolve(generateMockHappyScores(washroomIds))
            return
          }

          const happyScores: HappyScore[] = []
          const washroomIdMap = new Map<string, string>() // Map kiosk paths to washroom IDs

          // Process each feedback event
          results.data.forEach((row: any, index: number) => {
            try {
              // Filter out spam/profanity/harmful flags
              if (row.spam === 'true' || row.profanity === 'true' || row.harmful === 'true') {
                return
              }

              // Extract location/path and map to washroom ID
              const path = String(row.path || '').trim()
              if (!path) return

              // Try to extract washroom ID from path using normalization
              let washroomId = washroomIdMap.get(path)
              if (!washroomId) {
                // Use normalization utility if washrooms are available
                if (washrooms.length > 0) {
                  const mappedId = mapKioskPathToWashroomId(path, washrooms)
                  if (mappedId) {
                    washroomId = mappedId
                  } else {
                    // Fallback: try to extract gate number
                    const gateMatch = path.match(/gate\s*(\d+)/i)
                    if (gateMatch) {
                      const gateNum = gateMatch[1]
                      washroomId = `T1-${gateNum}-MEN`
                    } else {
                      washroomId = path.replace(/\s+/g, '-').toUpperCase()
                    }
                  }
                } else {
                  // Fallback when washrooms not loaded yet
                  const gateMatch = path.match(/gate\s*(\d+)/i)
                  if (gateMatch) {
                    const gateNum = gateMatch[1]
                    washroomId = `T1-${gateNum}-MEN`
                  } else {
                    washroomId = path.replace(/\s+/g, '-').toUpperCase()
                  }
                }
                washroomIdMap.set(path, washroomId)
              }

              // Parse timestamp (try UTC or local timestamp)
              const timestampStr = row.utc_timestamp || row.local_timestamp || row.timestamp || row.time
              if (!timestampStr) return

              let timestamp: Date
              try {
                timestamp = new Date(timestampStr)
                if (isNaN(timestamp.getTime())) return
              } catch {
                return
              }

              // Parse response (feedback scale 1-4, convert to 0-100)
              const response = parseInt(String(row.response || row.feedback || '0'), 10)
              if (isNaN(response) || response < 1 || response > 4) return

              // Convert 1-4 scale to 0-100 scale
              // 1 = very unhappy (0-25), 2 = unhappy (25-50), 3 = happy (50-75), 4 = very happy (75-100)
              const score = ((response - 1) / 3) * 100

              happyScores.push({
                washroomId,
                score: Math.round(score),
                timestamp,
                source: 'feedback',
                windowMinutes: 15,
              })
            } catch (error) {
              // Skip malformed rows
              if (index < 10) {
                console.warn(`Skipping malformed Happy Score row ${index}:`, error)
              }
            }
          })

          if (happyScores.length === 0) {
            console.log('No valid Happy Score data after filtering, using mock data')
            const washroomIds = washrooms.map((w) => w.id)
            resolve(generateMockHappyScores(washroomIds))
            return
          }

          console.log(`Loaded ${happyScores.length} Happy Score entries from CSV`)
          resolve(happyScores)
        },
        error: (error: unknown) => {
          console.warn('Happy Score CSV parsing error, using mock data:', error)
          const washroomIds = washrooms.map((w) => w.id)
          resolve(generateMockHappyScores(washroomIds))
        },
      })
    })
  } catch (error: unknown) {
    console.warn('Failed to load Happy Score data, using mock data:', error)
    const washroomIds = washrooms.map((w) => w.id)
    return generateMockHappyScores(washroomIds)
  }
}

/**
 * Load current tasks from CSV file (all regular tasks, unassigned)
 * Also generates a small number of emergency tasks
 * Returns tasks and a map of task ID to title
 */
export async function loadTasks(
  washroomIds: string[] = [],
  crewIds: string[] = []
): Promise<{ tasks: Task[]; taskTitleMap: Map<string, string> }> {
  try {
    const possiblePaths = [
      '/Tasks 2024lighthouse_tasks_combined.csv',
      'data/Tasks 2024lighthouse_tasks_combined.csv',
      '/data/Tasks 2024lighthouse_tasks_combined.csv',
      './data/Tasks 2024lighthouse_tasks_combined.csv',
      '../data/Tasks 2024lighthouse_tasks_combined.csv',
      `${DATA_ROOT}/Tasks 2024lighthouse_tasks_combined.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    const tasks: Task[] = []
    const taskTitleMap = new Map<string, string>()

    if (text) {
      // Parse CSV to get regular tasks
      await new Promise<void>((resolve) => {
        Papa.parse(text, {
          header: true,
          delimiter: ',',
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              results.data.forEach((row: any, index: number) => {
                try {
                  const taskId = String(row['Task ID'] || '').trim()
                  const title = String(row['Title'] || '').trim()
                  const bathroomId = String(row['Bathroom'] || '').trim()
                  const dtStr = String(row['dt'] || '').trim()

                  if (!taskId || !bathroomId || !dtStr) {
                    return
                  }

                  // Extract date part
                  const dateMatch = dtStr.match(/^(\d{4}-\d{2}-\d{2})/)
                  if (!dateMatch) return
                  const taskDateStr = dateMatch[1]

                  // Only include Dec 31, 2024 tasks for current tasks
                  if (taskDateStr !== '2024-12-31') {
                    return
                  }

                  // Parse date/time
                  let createdTime: Date
                  try {
                    createdTime = new Date(dtStr)
                    if (isNaN(createdTime.getTime())) return
                  } catch {
                    return
                  }

                  // Store title
                  if (title) {
                    taskTitleMap.set(taskId, title)
                  }

                  // Map title to task type
                  let taskType: TaskType = 'routine_cleaning'
                  if (title.toLowerCase().includes('emergency')) {
                    taskType = 'emergency_cleaning'
                  } else if (title.toLowerCase().includes('inspection')) {
                    taskType = 'inspection'
                  } else if (title.toLowerCase().includes('refill') || title.toLowerCase().includes('air freshener')) {
                    taskType = 'consumable_refill'
                  }

                  // All regular tasks are unassigned, normal priority, no SLA
                  tasks.push({
                    id: taskId,
                    type: taskType,
                    washroomId: bathroomId,
                    priority: 'normal',
                    state: 'unassigned',
                    createdTime,
                    // No assignedCrewId, no slaDeadline
                  })
                } catch (error) {
                  // Skip malformed rows
                }
              })
            }
            resolve()
          },
          error: () => {
            resolve()
          },
        })
      })
    }

    // Generate exactly 5 emergency tasks
    const mockWashroomIds = washroomIds.length > 0 ? washroomIds : ['T1-134-MEN', 'T1-134-WOMEN']
    const now = new Date('2024-12-31T12:00:00')
    const emergencyTasks: Task[] = []
    
    for (let i = 0; i < 5; i++) {
      const washroomId = mockWashroomIds[i % mockWashroomIds.length]
      const createdTime = new Date(now.getTime() - (5 - i) * 30 * 60 * 1000) // Spread over last 2.5 hours
      const slaDeadline = new Date(createdTime.getTime() + 10 * 60 * 1000) // 10 min SLA for emergencies
      
      emergencyTasks.push({
        id: `emergency-task-${i + 1}`,
        type: 'emergency_cleaning',
        washroomId,
        priority: 'emergency',
        state: 'unassigned',
        createdTime,
        slaDeadline,
        estimatedDurationMinutes: 15 + (i % 10),
      })
    }

    // Combine regular tasks from CSV with emergency tasks
    const allTasks = [...tasks, ...emergencyTasks]

    console.log(`Loaded ${tasks.length} regular tasks from CSV and ${emergencyTasks.length} emergency tasks`)
    return { tasks: allTasks, taskTitleMap }
  } catch (error: unknown) {
    console.warn('Failed to load tasks from CSV, using mock data:', error)
    const mockWashroomIds = washroomIds.length > 0 ? washroomIds : ['T1-134-MEN', 'T1-134-WOMEN']
    // Generate exactly 5 emergency tasks as fallback
    const now = new Date('2024-12-31T12:00:00')
    const emergencyTasks: Task[] = []
    
    for (let i = 0; i < 5; i++) {
      const washroomId = mockWashroomIds[i % mockWashroomIds.length]
      const createdTime = new Date(now.getTime() - (5 - i) * 30 * 60 * 1000)
      const slaDeadline = new Date(createdTime.getTime() + 10 * 60 * 1000)
      
      emergencyTasks.push({
        id: `emergency-task-${i + 1}`,
        type: 'emergency_cleaning',
        washroomId,
        priority: 'emergency',
        state: 'unassigned',
        createdTime,
        slaDeadline,
        estimatedDurationMinutes: 15 + (i % 10),
      })
    }
    return { tasks: emergencyTasks, taskTitleMap: new Map() }
  }
}

/**
 * Load historical tasks from CSV file
 * CSV format: Task ID,Title,Name,Bathroom,dt
 * Returns tasks, a map of crew ID to crew name, a map of task ID to title, and a map of task ID to original date string
 */
export async function loadHistoricalTasks(
  date?: string
): Promise<{ tasks: Task[]; crewNameMap: Map<string, string>; taskTitleMap: Map<string, string>; taskDateStringMap: Map<string, string> }> {
  try {
    const possiblePaths = [
      '/Tasks 2024lighthouse_tasks_combined.csv', // Since publicDir is 'data', files are at root
      'data/Tasks 2024lighthouse_tasks_combined.csv',
      '/data/Tasks 2024lighthouse_tasks_combined.csv',
      './data/Tasks 2024lighthouse_tasks_combined.csv',
      '../data/Tasks 2024lighthouse_tasks_combined.csv',
      `${DATA_ROOT}/Tasks 2024lighthouse_tasks_combined.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          console.log(`Loaded historical tasks from ${csvPath}`)
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      console.warn('Could not load historical tasks CSV')
      return { tasks: [], crewNameMap: new Map(), taskTitleMap: new Map(), taskDateStringMap: new Map() }
    }

    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Historical tasks CSV parsing warnings:', results.errors.slice(0, 5))
          }

          if (!results.data || results.data.length === 0) {
            console.warn('No historical tasks data in CSV')
            resolve({ tasks: [], crewNameMap: new Map(), taskTitleMap: new Map(), taskDateStringMap: new Map() })
            return
          }

          const tasks: Task[] = []
          const crewNameToIdMap = new Map<string, string>() // Map crew names to IDs
          const taskTitleMap = new Map<string, string>() // Map task ID to title
          const taskDateStringMap = new Map<string, string>() // Map task ID to original date string
          let crewIdCounter = 1

          results.data.forEach((row: any, index: number) => {
            try {
              const taskId = String(row['Task ID'] || '').trim()
              const title = String(row['Title'] || '').trim()
              const crewName = String(row['Name'] || '').trim()
              const bathroomId = String(row['Bathroom'] || '').trim()
              const dtStr = String(row['dt'] || '').trim()

              if (!taskId || !bathroomId || !dtStr) {
                if (index < 3) console.warn(`Row ${index}: Missing required fields`, row)
                return
              }

              // Parse date/time - extract date part before parsing to avoid timezone issues
              // Format: "2024-12-31 23:45:09-05:00" -> extract "2024-12-31"
              const dateMatch = dtStr.match(/^(\d{4}-\d{2}-\d{2})/)
              if (!dateMatch) {
                if (index < 3) console.warn(`Row ${index}: Invalid date format: ${dtStr}`)
                return
              }
              const taskDateStr = dateMatch[1]

              // Filter out Dec 31, 2024 tasks
              if (taskDateStr === '2024-12-31') {
                return
              }

              // Filter by date if provided (compare dates only, not time)
              if (date) {
                if (taskDateStr !== date) {
                  return
                }
              }

              // Parse the full date/time for the createdTime field
              let createdTime: Date
              try {
                createdTime = new Date(dtStr)
                if (isNaN(createdTime.getTime())) {
                  if (index < 3) console.warn(`Row ${index}: Invalid date string: ${dtStr}`)
                  return
                }
              } catch {
                if (index < 3) console.warn(`Row ${index}: Date parsing error: ${dtStr}`)
                return
              }

              // Map crew name to ID
              let crewId: string | undefined
              if (crewName) {
                if (!crewNameToIdMap.has(crewName)) {
                  const newCrewId = `crew-historical-${crewIdCounter++}`
                  crewNameToIdMap.set(crewName, newCrewId)
                }
                crewId = crewNameToIdMap.get(crewName)
              }

              // Store the title for display
              if (title) {
                taskTitleMap.set(taskId, title)
              }

              // Store the original date string for display (exactly as it appears in CSV)
              taskDateStringMap.set(taskId, dtStr)

              // Map title to task type for internal use (default to routine_cleaning)
              // The actual title will be displayed from taskTitleMap
              let taskType: TaskType = 'routine_cleaning'
              if (title.toLowerCase().includes('emergency')) {
                taskType = 'emergency_cleaning'
              } else if (title.toLowerCase().includes('inspection')) {
                taskType = 'inspection'
              } else if (title.toLowerCase().includes('refill') || title.toLowerCase().includes('air freshener')) {
                taskType = 'consumable_refill'
              }

              tasks.push({
                id: taskId,
                type: taskType,
                washroomId: bathroomId,
                priority: 'normal', // All tasks are normal priority
                state: 'completed', // All tasks are completed
                assignedCrewId: crewId,
                createdTime,
              })
            } catch (error) {
              if (index < 10) {
                console.warn(`Skipping malformed historical task row ${index}:`, error, row)
              }
            }
          })

          // Create reverse map: crew ID -> crew name
          const crewNameMap = new Map<string, string>()
          crewNameToIdMap.forEach((crewId, crewName) => {
            crewNameMap.set(crewId, crewName)
          })

          console.log(`Loaded ${tasks.length} historical tasks${date ? ` for date ${date}` : ''}`)
          resolve({ tasks, crewNameMap, taskTitleMap, taskDateStringMap })
        },
        error: (error: unknown) => {
          console.warn('Historical tasks CSV parsing error:', error)
          resolve({ tasks: [], crewNameMap: new Map(), taskTitleMap: new Map(), taskDateStringMap: new Map() })
        },
      })
    })
  } catch (error: unknown) {
    console.warn('Failed to load historical tasks:', error)
    return { tasks: [], crewNameMap: new Map(), taskTitleMap: new Map(), taskDateStringMap: new Map() }
  }
}

/**
 * Get available dates from historical tasks CSV (excluding Dec 31, 2024)
 */
export async function getAvailableHistoricalDates(): Promise<string[]> {
  try {
    // Load all tasks without date filter to get all available dates
    const possiblePaths = [
      '/Tasks 2024lighthouse_tasks_combined.csv',
      'data/Tasks 2024lighthouse_tasks_combined.csv',
      '/data/Tasks 2024lighthouse_tasks_combined.csv',
      './data/Tasks 2024lighthouse_tasks_combined.csv',
      '../data/Tasks 2024lighthouse_tasks_combined.csv',
      `${DATA_ROOT}/Tasks 2024lighthouse_tasks_combined.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      return []
    }

    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const dates = new Set<string>()
          
          if (results.data && results.data.length > 0) {
            results.data.forEach((row: any) => {
              const dtStr = String(row['dt'] || '').trim()
              if (dtStr) {
                const dateMatch = dtStr.match(/^(\d{4}-\d{2}-\d{2})/)
                if (dateMatch) {
                  const dateStr = dateMatch[1]
                  // Exclude Dec 31, 2024
                  if (dateStr !== '2024-12-31') {
                    dates.add(dateStr)
                  }
                }
              }
            })
          }
          
          resolve(Array.from(dates).sort().reverse()) // Most recent first
        },
        error: () => {
          resolve([])
        },
      })
    })
  } catch (error) {
    console.warn('Failed to get available historical dates:', error)
    return []
  }
}

/**
 * Load crew data from CSV file
 * Extracts unique crew member names and determines who was active on Dec 31, 2024
 */
export async function loadCrewData(): Promise<Crew[]> {
  try {
    const possiblePaths = [
      '/Tasks 2024lighthouse_tasks_combined.csv',
      'data/Tasks 2024lighthouse_tasks_combined.csv',
      '/data/Tasks 2024lighthouse_tasks_combined.csv',
      './data/Tasks 2024lighthouse_tasks_combined.csv',
      '../data/Tasks 2024lighthouse_tasks_combined.csv',
      `${DATA_ROOT}/Tasks 2024lighthouse_tasks_combined.csv`,
    ]

    let text: string | null = null
    for (const csvPath of possiblePaths) {
      try {
        const response = await fetch(csvPath)
        if (response.ok) {
          text = await response.text()
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!text) {
      console.warn('Could not load crew data from CSV, using mock data')
      return generateMockCrew()
    }

    return new Promise((resolve) => {
      const crewMap = new Map<string, { name: string; activeOnDec31: boolean }>()
      const dec31DateStr = '2024-12-31'

      Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            results.data.forEach((row: any) => {
              let name = String(row['Name'] || '').trim()
              const dtStr = String(row['dt'] || '').trim()

              // Remove quotes if present
              name = name.replace(/^["']|["']$/g, '')

              if (!name || name === 'Name') return // Skip header or empty names

              // Extract date part
              const dateMatch = dtStr.match(/^(\d{4}-\d{2}-\d{2})/)
              if (!dateMatch) return
              const taskDateStr = dateMatch[1]

              // Track all crew members
              if (!crewMap.has(name)) {
                crewMap.set(name, { name, activeOnDec31: false })
              }

              // Mark as active on Dec 31 if they have tasks on that date
              if (taskDateStr === dec31DateStr) {
                const crewInfo = crewMap.get(name)
                if (crewInfo) {
                  crewInfo.activeOnDec31 = true
                }
              }
            })
          }

          // Convert to Crew array
          const crew: Crew[] = Array.from(crewMap.values()).map((crewInfo, index) => {
            const crewId = `crew-${index + 1}`
            const now = new Date('2024-12-31T12:00:00') // Dec 31, 2024, noon
            const startTime = new Date(now)
            startTime.setHours(6, 0, 0, 0) // Default shift: 6 AM
            const endTime = new Date(now)
            endTime.setHours(18, 0, 0, 0) // Default shift: 6 PM

            return {
              id: crewId,
              name: crewInfo.name,
              role: 'Cleaner',
              shift: {
                startTime,
                endTime,
              },
              status: crewInfo.activeOnDec31 ? ('available' as CrewStatus) : ('off_shift' as CrewStatus),
            }
          })

          console.log(`Loaded ${crew.length} crew members from CSV (${crew.filter(c => c.status === 'available').length} active on Dec 31)`)
          resolve(crew)
        },
        error: (error: unknown) => {
          console.warn('Failed to parse crew data from CSV, using mock data:', error)
          resolve(generateMockCrew())
        },
      })
    })
  } catch (error) {
    console.warn('Failed to load crew data from CSV, using mock data:', error)
    return generateMockCrew()
  }
}

/**
 * Load emergency events
 */
export async function loadEmergencyEvents(): Promise<EmergencyEvent[]> {
  try {
    // Emergency events might come from lighthouse.io Issues or sensors
    // Load washrooms and crew first to generate proper mock data
    const washrooms = await loadWashrooms()
    const crew = await loadCrewData()
    const washroomIds = washrooms.map((w) => w.id)
    const crewIds = crew.map((c) => c.id)
    return generateMockEmergencyEvents(washroomIds, crewIds, 5) // Reduced from 20 to 5
  } catch (error) {
    console.warn('Failed to load emergency events, using mock data:', error)
    // Fallback: generate with empty arrays (will still create events)
    return generateMockEmergencyEvents([], [], 5) // Reduced from 20 to 5
  }
}

/**
 * Load flights from unified_flight_data.csv
 */
export async function loadFlights(): Promise<Flight[]> {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      'data/unified_flight_data.csv',
      '../data/unified_flight_data.csv',
      './data/unified_flight_data.csv',
      `${DATA_ROOT}/unified_flight_data.csv`,
    ]

    let text: string | null = null
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          text = await response.text()
          console.log(`Loaded flight data from ${path}`)
          break
        }
      } catch (err) {
        // Try next path
        continue
      }
    }

    if (!text) {
      console.warn('Could not load unified_flight_data.csv, using mock data')
      return generateMockFlights(30)
    }

    return new Promise((resolve) => {
      Papa.parse<{
        'Actual Arrival Time': string
        'Flight Id': string
        Destination: string
        Pax: string
        Origin: string
      }>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Flight CSV parsing warnings:', results.errors.slice(0, 5))
          }

          if (!results.data || results.data.length === 0) {
            console.warn('No flight data in CSV, using mock data')
            resolve(generateMockFlights(30))
            return
          }

          const flights: Flight[] = results.data
            .filter((row) => {
              // Filter out invalid rows
              if (!row || !row['Actual Arrival Time'] || !row['Flight Id']) return false
              const timeStr = String(row['Actual Arrival Time']).trim()
              const flightId = String(row['Flight Id']).trim()
              return timeStr.length > 0 && flightId.length > 0
            })
            .map((row) => {
              const timeStr = String(row['Actual Arrival Time']).trim()
              const flightId = String(row['Flight Id']).trim()
              const origin = String(row.Origin || '').trim()
              const destination = String(row.Destination || '').trim()
              const pax = parseInt(String(row.Pax || '0'), 10) || 0

              // Parse the actual arrival time
              const actualTime = new Date(timeStr)

              // Determine if it's a departure or arrival
              const isDeparture = origin.toLowerCase() === 'security'
              const isArrival = destination.toLowerCase() === 'security'

              // Get gate (skip if "Security")
              let gate = ''
              if (isDeparture) {
                gate = destination !== 'Security' ? destination : ''
              } else if (isArrival) {
                gate = origin !== 'Security' ? origin : ''
              } else {
                // Fallback: use destination if not security, otherwise origin
                gate = destination !== 'Security' ? destination : origin !== 'Security' ? origin : ''
              }

              // Extract airline code from flight ID (first 2-3 letters)
              const airlineMatch = flightId.match(/^([A-Z]{2,3})/)
              const airline = airlineMatch ? airlineMatch[1] : flightId.substring(0, 2)
              const flightNumber = flightId

              return {
                id: `flight-${flightId}-${timeStr}`,
                airline,
                flightNumber,
                gate,
                origin,
                destination,
                actualArrivalTime: actualTime,
                actualDepartureTime: isDeparture ? actualTime : undefined,
                scheduledArrivalTime: isArrival ? actualTime : undefined,
                scheduledDepartureTime: isDeparture ? actualTime : undefined,
                passengers: pax,
                aircraftType: 'unknown', // Not in CSV
                status: 'arrived' as const, // All flights are historical
              }
            })

          console.log(`Loaded ${flights.length} flights from CSV`)
          resolve(flights)
        },
        error: (error: unknown) => {
          console.error('Error parsing flight CSV:', error)
          resolve(generateMockFlights(30))
        },
      })
    })
  } catch (error) {
    console.warn('Failed to load flights, using mock data:', error)
    return generateMockFlights(30)
  }
}

/**
 * Generate demand forecast based on flights and washrooms
 */
export async function loadDemandForecast(
  washrooms: Washroom[],
  hoursAhead: number = 12
): Promise<DemandForecast[]> {
  try {
    // TODO: Generate from actual flight data and demand models
    return generateMockDemandForecast(washrooms, hoursAhead)
  } catch (error) {
    console.warn('Failed to generate demand forecast, using mock data:', error)
    return generateMockDemandForecast(washrooms, hoursAhead)
  }
}

/**
 * Generate risk forecast based on current state
 */
export async function loadRiskForecast(
  washrooms: Washroom[],
  hoursAhead: number = 12
): Promise<RiskForecast[]> {
  try {
    // TODO: Generate from actual risk models
    return generateMockRiskForecast(washrooms, hoursAhead)
  } catch (error) {
    console.warn('Failed to generate risk forecast, using mock data:', error)
    return generateMockRiskForecast(washrooms, hoursAhead)
  }
}

/**
 * Load activity log entries
 */
export async function loadActivityLog(): Promise<ActivityLogEntry[]> {
  try {
    // TODO: Load from actual activity log API/database
    console.log('Loading activity log - using mock data')
    return generateMockActivityLog(100)
  } catch (error) {
    console.warn('Failed to load activity log, using mock data:', error)
    return generateMockActivityLog(100)
  }
}

// Helper functions

function extractTerminal(name: string): string {
  // Extract terminal from name (e.g., "T1-134-MEN" -> "T1")
  // For numeric gate names (e.g., "171"), default to T1
  const match = name.match(/^T(\d+)/i)
  if (match) {
    return `T${match[1]}`
  }
  // If it's just a number, assume T1 (most common terminal)
  if (/^\d+$/.test(name.trim())) {
    return 'T1'
  }
  return 'Unknown'
}

function inferWashroomType(name: string): Washroom['type'] {
  const lower = name.toLowerCase()
  if (lower.includes('family')) return 'family'
  if (lower.includes('accessible') || lower.includes('access')) return 'accessible'
  if (lower.includes('staff')) return 'staff-only'
  return 'standard'
}

function mapKioskToWashroomId(path: string): string {
  // Map kiosk path to washroom ID
  // This is a simplified mapping - full implementation would need proper mapping
  const match = path.match(/Gate\s*(\d+)/i)
  if (match) {
    return `T1-${match[1]}-MEN` // Simplified assumption
  }
  return 'unknown'
}

function convertResponseToScore(response: number | string): number {
  // Convert 1-4 scale to 0-100 scale
  // Assuming 1 = very unhappy, 4 = very happy
  const num = typeof response === 'string' ? parseInt(response, 10) : response
  if (isNaN(num) || num < 1 || num > 4) return 50 // Default to neutral
  
  // Map 1-4 to 0-100
  return ((num - 1) / 3) * 100
}

/**
 * Load bathroom catalog data from bathroom.json
 */
export async function loadBathroomCatalog(): Promise<BathroomCatalogItem[]> {
  try {
    const possiblePaths = [
      'data/bathroom.json',
      '../data/bathroom.json',
      './data/bathroom.json',
      `${DATA_ROOT}/bathroom.json`,
    ]

    let text: string | null = null
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          text = await response.text()
          console.log(`Loaded bathroom catalog from ${path}`)
          break
        }
      } catch (err) {
        continue
      }
    }

    if (!text) {
      console.warn('Could not load bathroom.json, returning empty array')
      return []
    }

    const data = JSON.parse(text)
    const bathrooms: BathroomCatalogItem[] = Object.entries(data).map(([id, item]: [string, any]) => ({
      id,
      terminal: item.terminal || '',
      level: item.level || '',
      zone: item.zone || '',
      gender: item.gender || 'Men',
      nearest_gate: item.nearest_gate || '',
      coordinates: item.coordinates || { x: 0, y: 0, z: 0 },
      facility_counts: item.facility_counts || { stalls: 0, urinals: 0 },
    }))

    console.log(`Loaded ${bathrooms.length} bathrooms from catalog`)
    return bathrooms
  } catch (error) {
    console.error('Failed to load bathroom catalog:', error)
    return []
  }
}

/**
 * Load gates data from gates.json
 */
export async function loadGates(): Promise<GateItem[]> {
  try {
    const possiblePaths = [
      'data/gates.json',
      '../data/gates.json',
      './data/gates.json',
      `${DATA_ROOT}/gates.json`,
    ]

    let text: string | null = null
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          text = await response.text()
          console.log(`Loaded gates from ${path}`)
          break
        }
      } catch (err) {
        continue
      }
    }

    if (!text) {
      console.warn('Could not load gates.json, returning empty array')
      return []
    }

    const data = JSON.parse(text)
    const gates: GateItem[] = Object.entries(data).map(([id, item]: [string, any]) => ({
      id,
      terminal: item.terminal || '',
      level: item.level || '',
      zone: item.zone || '',
      type: 'Gate' as const,
      coordinates: item.coordinates || { x: 0, y: 0, z: 0 },
    }))

    console.log(`Loaded ${gates.length} gates from catalog`)
    return gates
  } catch (error) {
    console.error('Failed to load gates:', error)
    return []
  }
}

/**
 * Load janitor closets data from janitorCloset.json
 */
export async function loadJanitorClosets(): Promise<JanitorClosetItem[]> {
  try {
    const possiblePaths = [
      'data/janitorCloset.json',
      '../data/janitorCloset.json',
      './data/janitorCloset.json',
      `${DATA_ROOT}/janitorCloset.json`,
    ]

    let text: string | null = null
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          text = await response.text()
          console.log(`Loaded janitor closets from ${path}`)
          break
        }
      } catch (err) {
        continue
      }
    }

    if (!text) {
      console.warn('Could not load janitorCloset.json, returning empty array')
      return []
    }

    const data = JSON.parse(text)
    const closets: JanitorClosetItem[] = Object.entries(data).map(([id, item]: [string, any]) => ({
      id,
      terminal: item.terminal || '',
      level: item.level || '',
      zone: item.zone || '',
      type: 'Janitor Closet' as const,
      coordinates: item.coordinates || { x: 0, y: 0, z: 0 },
    }))

    console.log(`Loaded ${closets.length} janitor closets from catalog`)
    return closets
  } catch (error) {
    console.error('Failed to load janitor closets:', error)
    return []
  }
}

