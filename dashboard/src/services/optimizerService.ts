/**
 * Simplified Cleaning Crew Optimizer
 * Implements a simplified version of the Python cleaning_crew_optimizer.py heuristic
 */

import { Task, Crew, Washroom, TaskType, TaskPriority, TaskState, Flight } from '../types'
import { estimateTravelTime } from './dataTransform'
import { CURRENT_DATE } from '../constants'

export interface CleaningRequirement {
  washroomId: string
  numCleanings: number
  cleaningFrequencyHours?: number // Optional: cleaning frequency for this requirement
}

export interface OptimizationResult {
  assignments: CrewAssignment[]
  metrics: OptimizationMetrics
  taskSummary: TaskSummary
  crewSchedules: Record<string, CrewScheduleEvent[]>
}

export interface CrewAssignment {
  taskId: string
  crewId: string
  washroomId: string
  startTime: Date
  endTime: Date
  travelTimeMinutes: number
  cleaningDurationMinutes: number
}

export interface OptimizationMetrics {
  totalCost: number
  avgResponseTime: number
  taskCompletionRate: number
  crewUtilization: number
  avgWalkingDistance: number
  slaComplianceRate: number
  emergencyResponsiveness: EmergencyResponsiveness
}

export interface EmergencyResponsiveness {
  avgResponseTimeMinutes: number // Average time to respond to emergency
  maxResponseTimeMinutes: number // Worst case response time
  minResponseTimeMinutes: number // Best case response time
  availabilityRate: number // Percentage of time at least one crew is available
  avgCrewAvailable: number // Average number of crew available at any time
}

export interface TaskSummary {
  totalTasks: number
  assignedTasks: number
  completedTasks: number
  routineTasks: number
  emergencyTasks: number
  unassignedTasks: number
}

export interface CrewScheduleEvent {
  start: Date
  end: Date
  taskId: string | null
  washroomId: string | null
  status: 'cleaning' | 'traveling' | 'idle'
}

interface InternalTask {
  id: string
  washroomId: string
  type: TaskType
  priority: TaskPriority
  estimatedDurationMinutes: number
  requiredTime: Date
  deadline?: Date
  createdTime: Date
  assignedCrewId?: string
  completionTime?: Date
}

interface CrewState {
  crew: Crew
  currentLocation: string // washroom ID or 'base'
  currentTaskEndTime?: Date
  status: 'idle' | 'traveling' | 'cleaning'
  totalWorkTimeMinutes: number
}

// Configuration constants
const CLEANING_DURATIONS = {
  routine_cleaning: 15,
  emergency_cleaning: 25,
  inspection: 20,
  consumable_refill: 10,
}

const HOURLY_RATE = 20.0 // Default hourly rate
const TRAVEL_COST_PER_MINUTE = 0.5
const EMERGENCY_COST_MULTIPLIER = 2.0

/**
 * Generate routine cleaning tasks based on requirements
 * Uses cleaning frequency to space tasks evenly throughout the day
 */
function scheduleRoutineCleanings(
  requirements: CleaningRequirement[],
  simulationDurationHours: number,
  startTime: Date,
  cleaningFrequencyHours?: number
): InternalTask[] {
  const tasks: InternalTask[] = []
  let taskIdCounter = 1

  // If cleaning frequency is provided, use it; otherwise calculate from numCleanings
  for (const req of requirements) {
    if (req.numCleanings <= 0) continue

    let cleaningTimes: Date[] = []
    
    if (cleaningFrequencyHours && cleaningFrequencyHours > 0) {
      // Schedule cleanings at regular intervals based on frequency
      const intervalMinutes = cleaningFrequencyHours * 60
      const endTime = startTime.getTime() + simulationDurationHours * 60 * 60 * 1000
      
      // Start first cleaning at the first interval (e.g., if frequency is 2h, first at 02:00:00)
      let currentTime = startTime.getTime() + intervalMinutes * 60 * 1000
      
      while (currentTime < endTime && cleaningTimes.length < req.numCleanings) {
        cleaningTimes.push(new Date(currentTime))
        currentTime += intervalMinutes * 60 * 1000
      }
    } else {
      // Fallback: distribute evenly across duration
      const step = (simulationDurationHours * 60) / (req.numCleanings + 1)
      for (let k = 1; k <= req.numCleanings; k++) {
        const minutesFromStart = k * step
        cleaningTimes.push(new Date(startTime.getTime() + minutesFromStart * 60 * 1000))
      }
    }

    // Create tasks for each cleaning time
    for (const requiredTime of cleaningTimes) {
      const deadline = new Date(requiredTime.getTime() + 30 * 60 * 1000) // 30 min deadline

      tasks.push({
        id: `ROUTINE_${taskIdCounter.toString().padStart(4, '0')}`,
        washroomId: req.washroomId,
        type: 'routine_cleaning',
        priority: 'normal',
        estimatedDurationMinutes: CLEANING_DURATIONS.routine_cleaning,
        requiredTime,
        deadline,
        createdTime: startTime,
      })
      taskIdCounter++
    }
  }

  return tasks
}

/**
 * Calculate peak times based on flights
 * Returns a map of time (in ms) to peak intensity (0-1) for each washroom
 */
function calculatePeakTimes(
  flights: Flight[],
  washrooms: Washroom[],
  startTime: Date,
  endTime: Date
): Map<string, Map<number, number>> {
  const peakTimes = new Map<string, Map<number, number>>()
  
  // Initialize peak times for all washrooms
  washrooms.forEach((w) => {
    peakTimes.set(w.id, new Map<number, number>())
  })

  // Process each flight to determine peak periods
  flights.forEach((flight) => {
    const flightTime =
      flight.actualArrivalTime ||
      flight.actualDepartureTime ||
      flight.scheduledArrivalTime ||
      flight.scheduledDepartureTime

    if (!flightTime) return

    // Determine peak period based on flight type
    // Arrivals: peak is 0-30 min after arrival (passengers deplaning)
    // Departures: peak is 30-90 min before departure (passengers boarding)
    let peakStart: Date
    let peakEnd: Date
    const passengers = flight.passengers || 100

    if (flight.actualArrivalTime || flight.scheduledArrivalTime) {
      // Arrival flight - peak right after arrival
      peakStart = new Date(flightTime.getTime())
      peakEnd = new Date(flightTime.getTime() + 30 * 60 * 1000) // 30 min after
    } else {
      // Departure flight - peak before departure
      peakStart = new Date(flightTime.getTime() - 90 * 60 * 1000) // 90 min before
      peakEnd = new Date(flightTime.getTime() - 30 * 60 * 1000) // 30 min before
    }

    // Find washrooms near this gate
    const gate = flight.gate || ''
    const nearbyWashrooms = washrooms.filter((w) => {
      if (!gate) return true // If no gate, apply to all washrooms
      return w.gateProximity === gate || !w.gateProximity
    })

    // Calculate peak intensity based on passenger count
    // Normalize to 0-1 scale (assuming max 300 passengers = 1.0)
    const intensity = Math.min(passengers / 300, 1.0)

    // Distribute peak intensity across the peak period (hourly buckets)
    const bucketSizeMs = 60 * 60 * 1000 // 1 hour buckets
    let currentBucket = Math.floor(peakStart.getTime() / bucketSizeMs) * bucketSizeMs

    while (currentBucket < peakEnd.getTime()) {
      const bucketEnd = currentBucket + bucketSizeMs
      const overlapStart = Math.max(currentBucket, peakStart.getTime())
      const overlapEnd = Math.min(bucketEnd, peakEnd.getTime())
      const overlapRatio = (overlapEnd - overlapStart) / bucketSizeMs

      nearbyWashrooms.forEach((washroom) => {
        const washroomPeaks = peakTimes.get(washroom.id)!
        const existingIntensity = washroomPeaks.get(currentBucket) || 0
        // Add intensity, but cap at 1.0
        washroomPeaks.set(currentBucket, Math.min(existingIntensity + intensity * overlapRatio, 1.0))
      })

      currentBucket += bucketSizeMs
    }
  })

  return peakTimes
}

/**
 * Get peak intensity for a washroom at a specific time
 */
function getPeakIntensity(
  washroomId: string,
  time: Date,
  peakTimes: Map<string, Map<number, number>>
): number {
  const washroomPeaks = peakTimes.get(washroomId)
  if (!washroomPeaks) return 0

  // Find the hour bucket for this time
  const bucketSizeMs = 60 * 60 * 1000
  const bucket = Math.floor(time.getTime() / bucketSizeMs) * bucketSizeMs
  return washroomPeaks.get(bucket) || 0
}

/**
 * Calculate assignment score (higher is better)
 */
function calculateAssignmentScore(
  crew: Crew,
  task: InternalTask,
  currentTime: Date,
  washrooms: Map<string, Washroom>,
  crewLocation: string,
  peakTimes?: Map<string, Map<number, number>>
): number {
  let score = 0.0

  // Skill match bonus
  const skillLevel = crew.skills?.length || 1
  if (task.priority === 'emergency') {
    score += skillLevel * 15
  }

  // Distance penalty
  const crewWashroom = washrooms.get(crewLocation)
  const taskWashroom = washrooms.get(task.washroomId)
  if (crewWashroom && taskWashroom) {
    const travelTime = estimateTravelTime(crewWashroom, taskWashroom)
    score -= travelTime * 2
  }

  // Peak time bonus - prioritize cleaning during peak periods
  if (peakTimes && task.priority !== 'emergency') {
    // Check peak intensity at task start time (after travel)
    const taskStartTime = new Date(
      currentTime.getTime() + (crewWashroom && taskWashroom ? estimateTravelTime(crewWashroom, taskWashroom) * 60 * 1000 : 0)
    )
    const peakIntensity = getPeakIntensity(task.washroomId, taskStartTime, peakTimes)
    // Bonus for cleaning during peak times (up to 40 points)
    score += peakIntensity * 40
  }

  // Urgency bonus
  if (task.deadline) {
    const timeUntilDeadline = (task.deadline.getTime() - currentTime.getTime()) / (1000 * 60)
    if (timeUntilDeadline < 30) {
      score += 30
    }
  }

  // Priority bonus
  if (task.priority === 'emergency') {
    score += 50
  } else if (task.priority === 'high') {
    score += 20
  }

  return score
}

/**
 * Check if crew is available
 */
function isCrewAvailable(crewState: CrewState, currentTime: Date): boolean {
  const crew = crewState.crew
  
  // Normalize dates to Dec 31, 2024 for comparison
  const currentDate = new Date(currentTime)
  const shiftStart = new Date(crew.shift.startTime)
  const shiftEnd = new Date(crew.shift.endTime)
  
  // Normalize to same day (Dec 31, 2024)
  const normalizedCurrent = new Date(2024, 11, 31, currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds())
  const normalizedShiftStart = new Date(2024, 11, 31, shiftStart.getHours(), shiftStart.getMinutes(), shiftStart.getSeconds())
  let normalizedShiftEnd = new Date(2024, 11, 31, shiftEnd.getHours(), shiftEnd.getMinutes(), shiftEnd.getSeconds())
  
  // If end time is before start time, it's an overnight shift (next day)
  if (normalizedShiftEnd <= normalizedShiftStart) {
    normalizedShiftEnd = new Date(2024, 11, 32, shiftEnd.getHours(), shiftEnd.getMinutes(), shiftEnd.getSeconds()) // Next day
  }
  
  // Check if crew is on shift
  if (normalizedCurrent < normalizedShiftStart || normalizedCurrent >= normalizedShiftEnd) {
    return false
  }

  // Check if crew is busy
  if (crewState.status !== 'idle') {
    if (crewState.currentTaskEndTime && currentTime < crewState.currentTaskEndTime) {
      return false
    }
  }

  return true
}

/**
 * Check if a washroom is already occupied during a time period
 */
function isWashroomOccupied(
  washroomId: string,
  startTime: Date,
  endTime: Date,
  existingAssignments: CrewAssignment[]
): boolean {
  // Check if any existing assignment overlaps with the proposed time period
  return existingAssignments.some((assignment) => {
    if (assignment.washroomId !== washroomId) {
      return false
    }
    // Check for overlap: assignment overlaps if it starts before proposed end and ends after proposed start
    return assignment.startTime < endTime && assignment.endTime > startTime
  })
}

/**
 * Find best crew for a task
 */
function findBestCrew(
  task: InternalTask,
  crewStates: CrewState[],
  currentTime: Date,
  washrooms: Map<string, Washroom>,
  peakTimes?: Map<string, Map<number, number>>
): CrewState | null {
  const availableCrew = crewStates.filter((cs) => isCrewAvailable(cs, currentTime))

  if (availableCrew.length === 0) {
    return null
  }

  let bestCrew: CrewState | null = null
  let bestScore = -Infinity

  for (const crewState of availableCrew) {
    const score = calculateAssignmentScore(
      crewState.crew,
      task,
      currentTime,
      washrooms,
      crewState.currentLocation,
      peakTimes
    )

    if (score > bestScore) {
      bestScore = score
      bestCrew = crewState
    }
  }

  return bestCrew
}

/**
 * Run optimization simulation
 */
export function runOptimization(
  tasks: Task[],
  crew: Crew[],
  washrooms: Washroom[],
  cleaningRequirements: CleaningRequirement[],
  simulationDurationHours: number = 8,
  timeStepMinutes: number = 1,
  cleaningFrequencyHours?: number,
  flights?: Flight[]
): OptimizationResult {
  // Start simulation at beginning of day (Dec 31, 2024, 00:00:00)
  const dayStart = new Date(CURRENT_DATE)
  dayStart.setFullYear(2024, 11, 31) // December 31, 2024
  dayStart.setHours(0, 0, 0, 0)
  
  // Use day start as simulation start time
  const startTime = dayStart
  const endTime = new Date(startTime.getTime() + simulationDurationHours * 60 * 60 * 1000)

  // Calculate peak times based on flights
  const peakTimes = flights ? calculatePeakTimes(flights, washrooms, startTime, endTime) : undefined

  // Convert existing tasks to internal format, filtering out normal tasks for today
  const todayStart = new Date(startTime)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const existingTasks: InternalTask[] = tasks
    .filter((t) => {
      // Keep only emergency tasks for today
      if (t.createdTime >= todayStart && t.createdTime < todayEnd) {
        return t.priority === 'emergency' || t.type === 'emergency_cleaning'
      }
      // Keep all tasks from other days
      return true
    })
    .map((t) => ({
      id: t.id,
      washroomId: t.washroomId,
      type: t.type,
      priority: t.priority,
      estimatedDurationMinutes: t.estimatedDurationMinutes || CLEANING_DURATIONS[t.type] || 15,
      requiredTime: t.createdTime,
      deadline: t.slaDeadline,
      createdTime: t.createdTime,
      assignedCrewId: t.assignedCrewId,
      completionTime: t.completedTime,
    }))

  // Generate new routine tasks from requirements
  // Use cleaningFrequencyHours from requirements or parameter
  const frequency = cleaningFrequencyHours || cleaningRequirements[0]?.cleaningFrequencyHours || 2
  const newRoutineTasks = scheduleRoutineCleanings(cleaningRequirements, simulationDurationHours, startTime, frequency)

  // Combine all tasks
  const allTasks: InternalTask[] = [...existingTasks, ...newRoutineTasks]

  // Initialize crew states
  const washroomMap = new Map(washrooms.map((w) => [w.id, w]))
  const crewStates: CrewState[] = crew.map((c) => {
    // Start crew at their base location (first washroom or a default)
    // In a real system, this would be their actual base location
    const baseLocation = washrooms.find((w) => w.terminal === washrooms[0]?.terminal)?.id || washrooms[0]?.id || 'base'
    return {
      crew: c,
      currentLocation: baseLocation,
      status: 'idle',
      totalWorkTimeMinutes: 0,
    }
  })

  // Initialize crew schedules
  const crewSchedules: Record<string, CrewScheduleEvent[]> = {}
  crew.forEach((c) => {
    crewSchedules[c.id] = []
  })

  const assignments: CrewAssignment[] = []
  const timeSteps: Date[] = []
  for (let t = startTime.getTime(); t <= endTime.getTime(); t += timeStepMinutes * 60 * 1000) {
    timeSteps.push(new Date(t))
  }

  // Simulation loop
  for (const currentTime of timeSteps) {
    // Update crew status (check if tasks are completed)
    for (const crewState of crewStates) {
      if (crewState.currentTaskEndTime && currentTime >= crewState.currentTaskEndTime) {
        crewState.status = 'idle'
        crewState.currentTaskEndTime = undefined
      }
    }

    // Find unassigned tasks that are ready
    const readyTasks = allTasks.filter(
      (t) =>
        !t.assignedCrewId &&
        !t.completionTime &&
        t.requiredTime <= currentTime &&
        (!t.deadline || t.deadline >= currentTime)
    )

    // Sort by priority and deadline
    readyTasks.sort((a, b) => {
      const priorityOrder = { emergency: 3, high: 2, normal: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      const aDeadline = a.deadline?.getTime() || Infinity
      const bDeadline = b.deadline?.getTime() || Infinity
      return aDeadline - bDeadline
    })

    // Assign tasks to crew
    for (const task of readyTasks) {
      const bestCrew = findBestCrew(task, crewStates, currentTime, washroomMap, peakTimes)

      if (bestCrew) {
        const crewWashroom = washroomMap.get(bestCrew.currentLocation)
        const taskWashroom = washroomMap.get(task.washroomId)

        if (crewWashroom && taskWashroom) {
          const travelTime = estimateTravelTime(crewWashroom, taskWashroom)
          const cleaningDuration = task.estimatedDurationMinutes
          const startTime = new Date(currentTime.getTime() + travelTime * 60 * 1000)
          const endTime = new Date(startTime.getTime() + cleaningDuration * 60 * 1000)

          // Check if washroom is already occupied during this time period
          // Only one person can clean a washroom at a time
          if (isWashroomOccupied(task.washroomId, startTime, endTime, assignments)) {
            // Washroom is already occupied, skip this assignment
            continue
          }

          // Record assignment
          assignments.push({
            taskId: task.id,
            crewId: bestCrew.crew.id,
            washroomId: task.washroomId,
            startTime,
            endTime,
            travelTimeMinutes: travelTime,
            cleaningDurationMinutes: cleaningDuration,
          })

          // Update crew state
          task.assignedCrewId = bestCrew.crew.id
          bestCrew.currentLocation = task.washroomId
          bestCrew.currentTaskEndTime = endTime
          bestCrew.status = travelTime > 0 ? 'traveling' : 'cleaning'
          bestCrew.totalWorkTimeMinutes += cleaningDuration

          // Record schedule events
          if (travelTime > 0) {
            crewSchedules[bestCrew.crew.id].push({
              start: currentTime,
              end: startTime,
              taskId: null,
              washroomId: null,
              status: 'traveling',
            })
          }

          crewSchedules[bestCrew.crew.id].push({
            start: startTime,
            end: endTime,
            taskId: task.id,
            washroomId: task.washroomId,
            status: 'cleaning',
          })
        }
      }
    }
  }

  // Calculate metrics
  const assignedTasks = allTasks.filter((t) => t.assignedCrewId)
  const completedTasks = allTasks.filter((t) => t.completionTime)
  const routineTasks = allTasks.filter((t) => t.type === 'routine_cleaning')
  const emergencyTasks = allTasks.filter((t) => t.priority === 'emergency' || t.type === 'emergency_cleaning')

  // Calculate costs
  let totalCost = 0
  for (const assignment of assignments) {
    const hours = assignment.cleaningDurationMinutes / 60
    const baseCost = hours * HOURLY_RATE
    const travelCost = assignment.travelTimeMinutes * TRAVEL_COST_PER_MINUTE
    const task = allTasks.find((t) => t.id === assignment.taskId)
    const multiplier = task?.priority === 'emergency' ? EMERGENCY_COST_MULTIPLIER : 1.0
    totalCost += (baseCost + travelCost) * multiplier
  }

  // Calculate response times (for emergency tasks)
  const emergencyAssignments = assignments.filter((a) => {
    const task = allTasks.find((t) => t.id === a.taskId)
    return task?.priority === 'emergency' || task?.type === 'emergency_cleaning'
  })
  const avgResponseTime =
    emergencyAssignments.length > 0
      ? emergencyAssignments.reduce((sum, a) => sum + a.travelTimeMinutes, 0) / emergencyAssignments.length
      : 0

  // Calculate crew utilization
  const totalCrewMinutes = crewStates.reduce((sum, cs) => {
    const shiftMinutes = (cs.crew.shift.endTime.getTime() - cs.crew.shift.startTime.getTime()) / (1000 * 60)
    return sum + shiftMinutes
  }, 0)
  const workedMinutes = crewStates.reduce((sum, cs) => sum + cs.totalWorkTimeMinutes, 0)
  const crewUtilization = totalCrewMinutes > 0 ? (workedMinutes / totalCrewMinutes) * 100 : 0

  // Calculate average walking distance
  const totalDistance = assignments.reduce((sum, a) => {
    const crewWashroom = washroomMap.get(crewStates.find((cs) => cs.crew.id === a.crewId)?.currentLocation || '')
    const taskWashroom = washroomMap.get(a.washroomId)
    if (crewWashroom && taskWashroom) {
      const dx = crewWashroom.coordinates.x - taskWashroom.coordinates.x
      const dy = crewWashroom.coordinates.y - taskWashroom.coordinates.y
      const dz = crewWashroom.coordinates.z - taskWashroom.coordinates.z
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
    return sum
  }, 0)
  const avgWalkingDistance = assignments.length > 0 ? totalDistance / assignments.length : 0

  // Calculate SLA compliance
  const tasksWithDeadline = allTasks.filter((t) => t.deadline)
  const compliantTasks = tasksWithDeadline.filter((t) => {
    const assignment = assignments.find((a) => a.taskId === t.id)
    return assignment && assignment.endTime <= t.deadline!
  })
  const slaComplianceRate =
    tasksWithDeadline.length > 0 ? (compliantTasks.length / tasksWithDeadline.length) * 100 : 100

  // Calculate emergency responsiveness
  const emergencyResponsiveness = calculateEmergencyResponsiveness(
    crewSchedules,
    crewStates,
    assignments,
    washroomMap,
    startTime,
    endTime,
    timeStepMinutes
  )

  const metrics: OptimizationMetrics = {
    totalCost,
    avgResponseTime,
    taskCompletionRate: allTasks.length > 0 ? (assignedTasks.length / allTasks.length) * 100 : 0,
    crewUtilization,
    avgWalkingDistance,
    slaComplianceRate,
    emergencyResponsiveness,
  }

  const taskSummary: TaskSummary = {
    totalTasks: allTasks.length,
    assignedTasks: assignedTasks.length,
    completedTasks: completedTasks.length,
    routineTasks: routineTasks.length,
    emergencyTasks: emergencyTasks.length,
    unassignedTasks: allTasks.length - assignedTasks.length,
  }

  return {
    assignments,
    metrics,
    taskSummary,
    crewSchedules,
  }
}

/**
 * Calculate emergency responsiveness based on crew schedules
 * Simulates emergency events throughout the day and calculates response times
 * Response time = wait time (until crew becomes available) + travel time + cleaning duration
 * The busier the crew, the longer the wait time, resulting in worse response times
 */
function calculateEmergencyResponsiveness(
  crewSchedules: Record<string, CrewScheduleEvent[]>,
  crewStates: CrewState[],
  assignments: CrewAssignment[],
  washroomMap: Map<string, Washroom>,
  startTime: Date,
  endTime: Date,
  timeStepMinutes: number
): EmergencyResponsiveness {
  const responseTimes: number[] = []
  let totalTimeSteps = 0
  let timeStepsWithAvailableCrew = 0
  let totalCrewAvailable = 0

  // Emergency cleaning duration (minutes)
  const EMERGENCY_CLEANING_DURATION = CLEANING_DURATIONS.emergency_cleaning

  // Sample emergency scenarios throughout the day (every hour)
  const sampleTimes: Date[] = []
  for (let t = startTime.getTime(); t <= endTime.getTime(); t += 60 * 60 * 1000) {
    sampleTimes.push(new Date(t))
  }

  for (const emergencyTime of sampleTimes) {
    // Simulate emergency at multiple washrooms to get average response
    const washroomIds = Array.from(washroomMap.keys())
    const sampleWashrooms = washroomIds.slice(0, Math.min(10, washroomIds.length)) // Sample 10 washrooms

    for (const emergencyWashroomId of sampleWashrooms) {
      const emergencyWashroom = washroomMap.get(emergencyWashroomId)
      if (!emergencyWashroom) continue

      // Find the earliest time any crew can complete the emergency task
      let bestResponseTime = Infinity
      let crewAvailableCount = 0

      for (const crewState of crewStates) {
        const crew = crewState.crew
        const shiftStart = crew.shift.startTime
        const shiftEnd = crew.shift.endTime

        // Check if crew is on shift
        if (emergencyTime < shiftStart || emergencyTime > shiftEnd) {
          continue
        }

        // Find when this crew can start the emergency task
        const crewSchedule = crewSchedules[crew.id] || []
        
        // Sort schedule by start time
        const sortedSchedule = [...crewSchedule].sort((a, b) => a.start.getTime() - b.start.getTime())
        
        // Find the earliest time when crew becomes available after emergencyTime
        let earliestAvailableTime = emergencyTime
        let crewLocationAtTime = crewState.currentLocation
        
        // Check if crew is busy at emergency time
        const overlappingEvent = sortedSchedule.find((event) => {
          return emergencyTime >= event.start && emergencyTime < event.end
        })

        if (overlappingEvent) {
          // Crew is busy, find when they become free
          let currentTime = overlappingEvent.end
          let lastEvent = overlappingEvent
          
          // Check for back-to-back tasks (no gap between tasks)
          while (true) {
            // Find next event that starts right after currentTime (within 1 minute buffer)
            const nextEvent = sortedSchedule.find((event) => {
              const gapMs = event.start.getTime() - currentTime.getTime()
              return gapMs >= 0 && gapMs < 60 * 1000 // Less than 1 minute gap
            })
            
            if (nextEvent) {
              // Back-to-back task, continue waiting
              currentTime = nextEvent.end
              lastEvent = nextEvent
            } else {
              // No more back-to-back tasks, crew is available at currentTime
              earliestAvailableTime = currentTime
              // Crew location is where they finished their last task
              if (lastEvent.washroomId) {
                crewLocationAtTime = lastEvent.washroomId
              }
              break
            }
          }
        } else {
          // Crew is immediately available at emergencyTime
          // Find their location at emergencyTime (where they finished their last task)
          const eventsBeforeTime = sortedSchedule
            .filter((event) => event.end <= emergencyTime)
            .sort((a, b) => b.end.getTime() - a.end.getTime())
          
          if (eventsBeforeTime.length > 0 && eventsBeforeTime[0].washroomId) {
            crewLocationAtTime = eventsBeforeTime[0].washroomId
          }
        }

        // Check if crew can still complete task within their shift
        const taskEndTime = new Date(
          earliestAvailableTime.getTime() + 
          EMERGENCY_CLEANING_DURATION * 60 * 1000
        )
        
        if (taskEndTime > shiftEnd) {
          // Crew can't complete task within shift, skip
          continue
        }

        const crewWashroom = washroomMap.get(crewLocationAtTime)
        if (!crewWashroom) continue

        const travelTime = estimateTravelTime(crewWashroom, emergencyWashroom)
        
        // Total response time = wait time + travel time + cleaning duration
        const waitTimeMinutes = Math.max(0, (earliestAvailableTime.getTime() - emergencyTime.getTime()) / (1000 * 60))
        const totalResponseTime = waitTimeMinutes + travelTime + EMERGENCY_CLEANING_DURATION

        // Only consider this crew if they can respond (response time is finite and reasonable)
        if (totalResponseTime < Infinity && totalResponseTime < 120) { // Max 2 hours response time
          bestResponseTime = Math.min(bestResponseTime, totalResponseTime)
          crewAvailableCount++
        }
      }

      if (bestResponseTime < Infinity) {
        responseTimes.push(bestResponseTime)
      }

      totalTimeSteps++
      if (crewAvailableCount > 0) {
        timeStepsWithAvailableCrew++
        totalCrewAvailable += crewAvailableCount
      }
    }
  }

  const avgResponseTimeMinutes =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 30 // Default if no samples

  const maxResponseTimeMinutes = responseTimes.length > 0 ? Math.max(...responseTimes) : 30
  const minResponseTimeMinutes = responseTimes.length > 0 ? Math.min(...responseTimes) : 5

  const availabilityRate =
    totalTimeSteps > 0 ? (timeStepsWithAvailableCrew / totalTimeSteps) * 100 : 0

  const avgCrewAvailable =
    totalTimeSteps > 0 ? totalCrewAvailable / totalTimeSteps : 0

  return {
    avgResponseTimeMinutes,
    maxResponseTimeMinutes,
    minResponseTimeMinutes,
    availabilityRate,
    avgCrewAvailable,
  }
}

