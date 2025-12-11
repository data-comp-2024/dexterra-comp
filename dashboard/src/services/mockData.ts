/**
 * Mock Data Generators
 * Generate deterministic mock data for development
 */

import {
  Washroom,
  Task,
  Crew,
  EmergencyEvent,
  HappyScore,
  TaskType,
  TaskPriority,
  TaskState,
  EmergencyType,
  CrewStatus,
  Flight,
  FlightStatus,
  FlightChange,
  DemandForecast,
  RiskForecast,
  ActivityLogEntry,
  Notification,
} from '../types'
import { HAPPY_SCORE_THRESHOLD } from '../constants'

// Deterministic seed for consistent data
const SEED = 12345

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const random = seededRandom(SEED)

/**
 * Generate mock washrooms
 */
export function generateMockWashrooms(count: number = 50): Washroom[] {
  const terminals = ['T1', 'T3']
  const types: Washroom['type'][] = ['standard', 'family', 'accessible', 'staff-only']
  const zones = ['A', 'B', 'C', 'D', 'E']

  return Array.from({ length: count }, (_, i) => {
    const terminal = terminals[i % terminals.length]
    const gateNum = 100 + (i % 50)
    const type = types[i % types.length]
    const zone = zones[i % zones.length]

    return {
      id: `${terminal}-${gateNum}-${i % 2 === 0 ? 'MEN' : 'WOMEN'}`,
      name: `${terminal}-${gateNum}-${i % 2 === 0 ? 'MEN' : 'WOMEN'}`,
      terminal,
      concourse: `Concourse ${zone}`,
      gateProximity: `Gate ${gateNum}`,
      type,
      status: 'active',
      coordinates: {
        x: (i % 10) * 50 + random() * 20,
        y: Math.floor(i / 10) * 50 + random() * 20,
        z: (i % 3),
      },
      sla: {
        maxHeadwayMinutes: 45,
        emergencyResponseTargetMinutes: 10,
      },
      happyScoreThreshold: HAPPY_SCORE_THRESHOLD,
    }
  })
}

/**
 * Generate mock tasks
 */
export function generateMockTasks(
  washroomIds: string[],
  crewIds: string[],
  count: number = 100
): Task[] {
  const types: TaskType[] = ['routine_cleaning', 'emergency_cleaning', 'inspection', 'consumable_refill']
  const priorities: TaskPriority[] = ['normal', 'high', 'emergency']
  const states: TaskState[] = ['unassigned', 'assigned', 'in_progress', 'completed', 'cancelled']

  // Use CURRENT_DATE for consistent date handling (Dec 31, 2024)
  const CURRENT_DATE = new Date('2024-12-31T12:00:00')
  const now = CURRENT_DATE
  const tasks: Task[] = []

  for (let i = 0; i < count; i++) {
    const washroomId = washroomIds[i % washroomIds.length]
    const type = types[i % types.length]
    const priority = priorities[i % priorities.length]
    // Spread tasks over the last 6 hours (more realistic for live ops)
    const createdTime = new Date(now.getTime() - (count - i) * (6 * 60 * 60 * 1000 / count))

    let state: TaskState = states[i % states.length]
    let assignedCrewId: string | undefined
    let startedTime: Date | undefined
    let completedTime: Date | undefined
    let slaDeadline: Date | undefined

    if (state === 'assigned' || state === 'in_progress' || state === 'completed') {
      assignedCrewId = crewIds[i % crewIds.length]
    }

    if (state === 'in_progress' || state === 'completed') {
      startedTime = new Date(createdTime.getTime() + 5 * 60 * 1000)
    }

    if (state === 'completed') {
      // Ensure completedTime is before CURRENT_DATE (Dec 31, 2024)
      const completionTime = new Date(startedTime!.getTime() + 20 * 60 * 1000)
      const maxDate = new Date('2024-12-31T23:59:59')
      completedTime = completionTime <= maxDate ? completionTime : new Date(maxDate.getTime() - 30 * 60 * 1000)
    }

    if (priority === 'emergency') {
      slaDeadline = new Date(createdTime.getTime() + 10 * 60 * 1000)
    } else {
      slaDeadline = new Date(createdTime.getTime() + 45 * 60 * 1000)
    }

    tasks.push({
      id: `task-${i + 1}`,
      type,
      washroomId,
      priority,
      state,
      assignedCrewId,
      createdTime,
      slaDeadline,
      estimatedDurationMinutes: 15 + (i % 20),
      startedTime,
      completedTime,
    })
  }

  return tasks
}

/**
 * Generate mock crew
 */
export function generateMockCrew(count: number = 15): Crew[] {
  const roles = ['Cleaner', 'Supervisor', 'Lead']
  const names = [
    'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown',
    'Emily Davis', 'Chris Wilson', 'Lisa Anderson', 'Tom Martinez', 'Amy Taylor',
    'Robert Thomas', 'Jessica Jackson', 'Daniel White', 'Michelle Harris', 'Kevin Martin',
  ]

  // Use CURRENT_DATE for consistent date handling (Dec 31, 2024)
  const CURRENT_DATE = new Date('2024-12-31T12:00:00')
  const now = CURRENT_DATE
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

  return Array.from({ length: count }, (_, i) => {
    // Spread shifts throughout the entire 24-hour day
    // Each shift is 8 hours, so we can fit 3 shifts per day
    // Distribute start times evenly across 24 hours with some overlap
    const shiftDuration = 8 * 60 * 60 * 1000 // 8 hours
    const dayDuration = 24 * 60 * 60 * 1000 // 24 hours
    
    // Create 4 shift periods to better cover the day:
    // Early morning (0-8), Morning (6-14), Afternoon (12-20), Evening (16-24)
    // This ensures coverage throughout the day with overlaps
    const shiftPeriods = [
      { start: 0, end: 8 },      // 00:00 - 08:00
      { start: 6, end: 14 },     // 06:00 - 14:00
      { start: 12, end: 20 },    // 12:00 - 20:00
      { start: 16, end: 24 },    // 16:00 - 24:00 (next day 00:00)
    ]
    
    const shiftIndex = i % shiftPeriods.length
    const period = shiftPeriods[shiftIndex]
    
    // Add some variation within each shift period (stagger by up to 1 hour)
    const staggerHours = (i % 3) * 0.5 // Stagger by 30 min increments
    const shiftStartHours = period.start + staggerHours
    
    const shiftStart = new Date(startOfDay.getTime() + shiftStartHours * 60 * 60 * 1000)
    let shiftEnd = new Date(shiftStart.getTime() + shiftDuration)
    
    // Handle shifts that extend past midnight
    if (shiftEnd.getTime() > startOfDay.getTime() + dayDuration) {
      const nextDay = new Date(startOfDay)
      nextDay.setDate(nextDay.getDate() + 1)
      const overflowMs = shiftEnd.getTime() - (startOfDay.getTime() + dayDuration)
      shiftEnd = new Date(nextDay.getTime() + overflowMs)
    }

    let status: CrewStatus = 'on_shift'
    const shiftStartTime = shiftStart.getTime()
    const shiftEndTime = shiftEnd.getTime()
    const nowTime = now.getTime()
    
    // Handle overnight shifts (end time is on next day)
    const isOvernight = shiftEnd.getDate() > shiftStart.getDate()
    
    if (isOvernight) {
      // Overnight shift: active if now is after start OR before end (next day)
      if (nowTime >= shiftStartTime || nowTime < shiftEndTime) {
        status = 'on_shift'
      } else {
        status = 'off_shift'
      }
    } else {
      // Regular shift: active if now is between start and end
      if (nowTime >= shiftStartTime && nowTime < shiftEndTime) {
        status = 'on_shift'
      } else {
        status = 'off_shift'
      }
    }
    
    // Some crew members are on break
    if (i % 5 === 0 && status === 'on_shift') {
      status = 'on_break'
    }

    return {
      id: `crew-${i + 1}`,
      name: names[i % names.length],
      role: roles[i % roles.length],
      shift: {
        startTime: shiftStart,
        endTime: shiftEnd,
      },
      status,
      cumulativeWalkingDistance: (i % 10) * 500 + random() * 200,
    }
  })
}

/**
 * Generate mock emergency events
 */
export function generateMockEmergencyEvents(
  washroomIds: string[],
  crewIds: string[],
  count: number = 5 // Reduced from 20 to 5 for more realistic frequency
): EmergencyEvent[] {
  const types: EmergencyType[] = [
    'overflowing_toilet',
    'bodily_fluids',
    'slip_hazard',
    'odor_threshold_exceeded',
    'other',
  ]
  const severities: EmergencyEvent['severity'][] = ['low', 'medium', 'high', 'critical']
  const sources: EmergencyEvent['source'][] = ['sensor', 'staff_report', 'passenger_report']

  // Import CURRENT_DATE for consistent date handling
  const CURRENT_DATE = new Date('2024-12-31T12:00:00')
  const now = CURRENT_DATE
  const events: EmergencyEvent[] = []

  // Ensure we have at least some washroom and crew IDs
  const defaultWashroomIds = washroomIds.length > 0 ? washroomIds : ['T1-134-MEN', 'T1-135-WOMEN', 'T3-201-MEN']
  const defaultCrewIds = crewIds.length > 0 ? crewIds : ['crew-1', 'crew-2', 'crew-3']

  for (let i = 0; i < count; i++) {
    const washroomId = defaultWashroomIds[i % defaultWashroomIds.length]
    // Spread emergencies over the last 24 hours (more realistic)
    const detectedAt = new Date(now.getTime() - (count - i) * (24 * 60 * 60 * 1000 / count))
    const severity = severities[i % severities.length]

    let status: EmergencyEvent['status'] = 'active'
    let assignedCrewId: string | undefined
    let firstResponseTime: Date | undefined
    let resolutionTime: Date | undefined

    // More realistic: only 10-20% are active (most emergencies are resolved quickly)
    if (i % 10 < 1) {
      // 10% are active
      status = 'active'
      assignedCrewId = defaultCrewIds[i % defaultCrewIds.length]
      firstResponseTime = new Date(detectedAt.getTime() + 8 * 60 * 1000)
    } else {
      // 90% are resolved
      status = 'resolved'
      assignedCrewId = defaultCrewIds[i % defaultCrewIds.length]
      firstResponseTime = new Date(detectedAt.getTime() + 5 * 60 * 1000)
      resolutionTime = new Date(firstResponseTime.getTime() + 15 * 60 * 1000)
    }

    events.push({
      id: `emergency-${i + 1}`,
      type: types[i % types.length],
      washroomId,
      detectedAt,
      source: sources[i % sources.length],
      severity,
      assignedCrewId,
      firstResponseTime,
      resolutionTime,
      status,
    })
  }

  return events
}

/**
 * Generate mock happy scores
 */
export function generateMockHappyScores(
  washroomIds: string[],
  count: number = 200
): HappyScore[] {
  const now = new Date()
  const scores: HappyScore[] = []

  for (let i = 0; i < count; i++) {
    const washroomId = washroomIds[i % washroomIds.length]
    const timestamp = new Date(now.getTime() - (count - i) * 10 * 60 * 1000)
    
    // Deterministic score based on washroom ID and time
    const baseScore = 70 + ((i % washroomIds.length) * 3) % 30
    const timeVariation = Math.sin((i / 10) * Math.PI) * 5
    const score = Math.max(0, Math.min(100, Math.round(baseScore + timeVariation)))

    scores.push({
      washroomId,
      score,
      timestamp,
      source: i % 3 === 0 ? 'feedback' : i % 3 === 1 ? 'sensor' : 'aggregated',
      windowMinutes: 15,
    })
  }

  return scores
}

/**
 * Generate mock flights
 */
export function generateMockFlights(count: number = 30): Flight[] {
  const airlines = ['AA', 'DL', 'UA', 'AC', 'WS', 'B6', 'WN']
  const gates = Array.from({ length: 50 }, (_, i) => `Gate ${100 + i}`)
  const aircraftTypes = ['small', 'medium', 'large']
  
  const now = new Date()
  const flights: Flight[] = []

  for (let i = 0; i < count; i++) {
    const airline = airlines[i % airlines.length]
    const flightNumber = `${airline}${1000 + i}`
    const gate = gates[i % gates.length]
    
    // Mix of arrivals and departures
    const isArrival = i % 2 === 0
    const baseTime = new Date(now.getTime() + (i - count / 2) * 30 * 60 * 1000)
    
    let scheduledArrivalTime: Date | undefined
    let scheduledDepartureTime: Date | undefined
    let actualArrivalTime: Date | undefined
    let actualDepartureTime: Date | undefined
    let status: FlightStatus = 'scheduled'
    const changes: FlightChange[] = []

    if (isArrival) {
      scheduledArrivalTime = baseTime
      // Some delays
      if (i % 5 === 0) {
        actualArrivalTime = new Date(baseTime.getTime() + 60 * 60 * 1000) // 1 hour delay
        status = 'delayed'
        changes.push({
          type: 'delay',
          originalValue: baseTime,
          newValue: actualArrivalTime,
          detectedAt: new Date(baseTime.getTime() - 30 * 60 * 1000),
          impactDescription: `Delayed 60 min → reduced demand now, spike later`,
        })
      } else {
        actualArrivalTime = baseTime
        status = 'arrived'
      }
    } else {
      scheduledDepartureTime = baseTime
      // Some gate changes
      if (i % 7 === 0) {
        const newGate = gates[(i + 1) % gates.length]
        status = 'boarding'
        changes.push({
          type: 'gate_change',
          originalValue: gate,
          newValue: newGate,
          detectedAt: new Date(baseTime.getTime() - 60 * 60 * 1000),
          impactDescription: `Gate changed from ${gate} to ${newGate}`,
        })
      } else {
        status = 'boarding'
      }
    }

    // Some cancellations
    if (i % 10 === 0) {
      status = 'cancelled'
      changes.push({
        type: 'cancellation',
        detectedAt: new Date(baseTime.getTime() - 2 * 60 * 60 * 1000),
        impactDescription: 'Flight cancelled → no demand expected',
      })
    }

    const passengers = 150 + (i % 100)
    const impactOnDemand = changes.length > 0 
      ? changes[changes.length - 1].impactDescription
      : undefined

    flights.push({
      id: `flight-${i + 1}`,
      airline,
      flightNumber,
      gate,
      scheduledArrivalTime,
      scheduledDepartureTime,
      actualArrivalTime,
      actualDepartureTime,
      passengers,
      aircraftType: aircraftTypes[i % aircraftTypes.length],
      status,
      changes: changes.length > 0 ? changes : undefined,
      impactOnDemand,
    })
  }

  return flights.sort((a, b) => {
    const timeA = a.scheduledArrivalTime || a.scheduledDepartureTime || new Date(0)
    const timeB = b.scheduledArrivalTime || b.scheduledDepartureTime || new Date(0)
    return timeA.getTime() - timeB.getTime()
  })
}

/**
 * Generate mock demand forecast
 */
export function generateMockDemandForecast(
  washrooms: Washroom[],
  hoursAhead: number = 12
): DemandForecast[] {
  const now = new Date()
  const forecasts: DemandForecast[] = []
  const terminals = Array.from(new Set(washrooms.map((w) => w.terminal)))
  const washroomTypes: Washroom['type'][] = ['standard', 'family', 'accessible']

  // Generate hourly forecasts for next N hours
  for (let hour = 0; hour < hoursAhead; hour++) {
    const timestamp = new Date(now.getTime() + hour * 60 * 60 * 1000)
    
    // By terminal
    terminals.forEach((terminal) => {
      const baseDemand = 5 + Math.sin((hour / 12) * Math.PI * 2) * 3
      forecasts.push({
        timestamp,
        terminal,
        predictedDemand: Math.max(0, Math.round(baseDemand + (hour % 3) * 2)),
        confidence: 0.7 + (hour < 6 ? 0.2 : 0),
      })
    })

    // By washroom type
    washroomTypes.forEach((type) => {
      const baseDemand = 3 + Math.cos((hour / 8) * Math.PI * 2) * 2
      forecasts.push({
        timestamp,
        washroomType: type,
        predictedDemand: Math.max(0, Math.round(baseDemand + (hour % 2))),
        confidence: 0.65 + (hour < 4 ? 0.25 : 0),
      })
    })
  }

  return forecasts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Generate mock risk forecast
 */
export function generateMockRiskForecast(
  washrooms: Washroom[],
  hoursAhead: number = 12
): RiskForecast[] {
  const now = new Date()
  const forecasts: RiskForecast[] = []
  const terminals = Array.from(new Set(washrooms.map((w) => w.terminal)))
  const zones = Array.from(new Set(washrooms.map((w) => w.concourse).filter(Boolean)))

  // Generate 2-hour window forecasts
  for (let window = 0; window < hoursAhead / 2; window++) {
    const start = new Date(now.getTime() + window * 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

    // By terminal
    terminals.forEach((terminal, idx) => {
      const riskLevel: 'low' | 'medium' | 'high' = idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low'
      forecasts.push({
        area: terminal,
        timeWindow: { start, end },
        riskLevel,
        headwayBreachProbability: riskLevel === 'high' ? 0.7 : riskLevel === 'medium' ? 0.4 : 0.1,
        happyScoreBelowThresholdProbability: riskLevel === 'high' ? 0.8 : riskLevel === 'medium' ? 0.5 : 0.2,
      })
    })

    // By zone
    zones.slice(0, 5).forEach((zone, idx) => {
      const riskLevel: 'low' | 'medium' | 'high' = idx % 3 === 0 ? 'medium' : 'low'
      forecasts.push({
        area: zone || 'Unknown',
        timeWindow: { start, end },
        riskLevel,
        headwayBreachProbability: riskLevel === 'medium' ? 0.3 : 0.1,
        happyScoreBelowThresholdProbability: riskLevel === 'medium' ? 0.4 : 0.15,
      })
    })
  }

  return forecasts
}

/**
 * Generate mock activity log entries
 */
export function generateMockActivityLog(count: number = 100): ActivityLogEntry[] {
  const users = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown']
  const actionTypes: ActivityLogEntry['actionType'][] = [
    'task_assigned',
    'task_reassigned',
    'task_cancelled',
    'task_priority_changed',
    'optimization_run',
    'config_changed',
    'crew_availability_changed',
  ]
  const affectedEntityTypes: ActivityLogEntry['affectedEntityType'][] = ['task', 'washroom', 'crew', 'config']

  const now = new Date()
  const entries: ActivityLogEntry[] = []

  for (let i = 0; i < count; i++) {
    const actionType = actionTypes[i % actionTypes.length]
    const affectedEntityType = affectedEntityTypes[i % affectedEntityTypes.length]
    const timestamp = new Date(now.getTime() - (count - i) * 10 * 60 * 1000) // Spread over time
    const userId = `user-${(i % users.length) + 1}`
    const userName = users[i % users.length]

    let details: Record<string, unknown> = {}
    let beforeValues: Record<string, unknown> | undefined
    let afterValues: Record<string, unknown> | undefined

    // Generate details based on action type
    switch (actionType) {
      case 'task_assigned':
        details = {
          taskId: `task-${i + 1}`,
          crewId: `crew-${(i % 5) + 1}`,
          washroomId: `T1-${100 + (i % 20)}-MEN`,
        }
        break
      case 'task_reassigned':
        beforeValues = { crewId: `crew-${(i % 5) + 1}` }
        afterValues = { crewId: `crew-${((i + 1) % 5) + 1}` }
        details = {
          taskId: `task-${i + 1}`,
          reason: 'Workload rebalancing',
        }
        break
      case 'task_cancelled':
        details = {
          taskId: `task-${i + 1}`,
          reason: 'Washroom closed for maintenance',
        }
        break
      case 'task_priority_changed':
        beforeValues = { priority: 'normal' }
        afterValues = { priority: 'high' }
        details = {
          taskId: `task-${i + 1}`,
        }
        break
      case 'optimization_run':
        details = {
          parameters: {
            timeWindowHours: 2,
            minimizeWalkingDistance: 50,
            minimizeEmergencyResponse: 50,
            maximizeHeadwaySLA: 50,
          },
          summary: `Reassigned ${5 + (i % 10)} tasks, changed ${2 + (i % 5)} routes`,
        }
        break
      case 'config_changed':
        beforeValues = { maxHeadwayMinutes: 45 }
        afterValues = { maxHeadwayMinutes: 50 }
        details = {
          washroomId: `T1-${100 + (i % 20)}-MEN`,
          field: 'sla.maxHeadwayMinutes',
        }
        break
      case 'crew_availability_changed':
        beforeValues = { status: 'available' }
        afterValues = { status: 'unavailable' }
        details = {
          crewId: `crew-${(i % 5) + 1}`,
          reason: 'Break',
        }
        break
    }

    entries.push({
      id: `log-${i + 1}`,
      timestamp,
      userId,
      userName,
      actionType,
      affectedEntityType,
      affectedEntityId: (details.taskId as string) || (details.washroomId as string) || (details.crewId as string) || `entity-${i + 1}`,
      details,
      beforeValues,
      afterValues,
    })
  }

  // Sort by timestamp (newest first)
  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

/**
 * Generate mock notifications
 */
export function generateMockNotifications(): Notification[] {
  return [
    {
      id: '1',
      type: 'error',
      title: 'Emergency Alert',
      message: 'Emergency detected at T1-134-MEN',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'warning',
      title: 'SLA Breach',
      message: 'Task T-2024-001 is overdue',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'success',
      title: 'Task Completed',
      message: 'Task T-2024-002 completed successfully',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'System Update',
      message: 'Optimization completed for next 2 hours',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      read: true,
    },
  ]
}

