/**
 * Data Transformation Utilities
 * Transform raw data into domain models and compute derived metrics
 */

import {
  Washroom,
  Task,
  HappyScore,
  Headway,
  TaskState,
  TaskPriority,
} from '../types'
import { HAPPY_SCORE_THRESHOLD, DEFAULT_MAX_HEADWAY_MINUTES, CURRENT_DATE } from '../constants'

/**
 * Calculate headway for a washroom based on completed tasks
 */
export function calculateHeadway(
  washroomId: string,
  tasks: Task[],
  defaultSlaMinutes: number = DEFAULT_MAX_HEADWAY_MINUTES
): Headway | null {
  // Filter completed tasks for this washroom, sorted by completion time
  const completedTasks = tasks
    .filter(
      (t) =>
        t.washroomId === washroomId &&
        t.state === 'completed' &&
        t.completedTime
    )
    .sort(
      (a, b) =>
        (a.completedTime?.getTime() || 0) - (b.completedTime?.getTime() || 0)
    )

  if (completedTasks.length === 0) {
    return null
  }

  const lastCompleted = completedTasks[completedTasks.length - 1]
  const lastCompletedTime = lastCompleted.completedTime!

  // Find next scheduled or in-progress task
  const nextTask = tasks.find(
    (t) =>
      t.washroomId === washroomId &&
      (t.state === 'assigned' || t.state === 'in_progress') &&
      t.startedTime
  )

  const now = CURRENT_DATE
  
  // Calculate headway: time since last completed task
  // Ensure lastCompletedTime is not in the future (shouldn't happen, but handle edge case)
  const headwayMinutes = Math.max(0, (now.getTime() - lastCompletedTime.getTime()) / (1000 * 60))
  
  // If headway is unreasonably large (more than 7 days), cap it to a reasonable value
  const maxReasonableHeadway = 7 * 24 * 60 // 7 days in minutes
  const clampedHeadway = Math.min(headwayMinutes, maxReasonableHeadway)

  const slaMinutes = defaultSlaMinutes

  return {
    washroomId,
    headwayMinutes: Math.round(clampedHeadway * 10) / 10,
    lastCompletedTime,
    nextScheduledTime: nextTask?.startedTime,
    slaMinutes,
    isWithinSLA: clampedHeadway <= slaMinutes,
  }
}

/**
 * Calculate average Happy Score for a washroom over a time window
 */
export function calculateAverageHappyScore(
  washroomId: string,
  happyScores: HappyScore[],
  windowMinutes: number = 60
): number | null {
  const now = CURRENT_DATE
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000)

  const scoresInWindow = happyScores.filter(
    (hs) =>
      hs.washroomId === washroomId &&
      hs.timestamp >= windowStart &&
      hs.timestamp <= now
  )

  if (scoresInWindow.length === 0) {
    return null
  }

  const sum = scoresInWindow.reduce((acc, hs) => acc + hs.score, 0)
  return Math.round((sum / scoresInWindow.length) * 10) / 10
}

/**
 * Check if a washroom is "unhappy" (score < threshold)
 */
export function isWashroomUnhappy(
  washroomId: string,
  happyScores: HappyScore[],
  threshold: number = HAPPY_SCORE_THRESHOLD
): boolean {
  const avgScore = calculateAverageHappyScore(washroomId, happyScores)
  return avgScore !== null && avgScore < threshold
}

/**
 * Determine task state based on current time and SLA
 */
export function updateTaskState(task: Task): TaskState {
  const now = new Date()

  // If already completed or cancelled, return as-is
  if (task.state === 'completed' || task.state === 'cancelled') {
    return task.state
  }

  // Check if overdue
  if (task.slaDeadline && now > task.slaDeadline) {
    return 'overdue'
  }

  return task.state
}

/**
 * Calculate walking distance between two washrooms
 */
export function calculateWalkingDistance(
  washroom1: Washroom,
  washroom2: Washroom
): number {
  const dx = washroom1.coordinates.x - washroom2.coordinates.x
  const dy = washroom1.coordinates.y - washroom2.coordinates.y
  const dz = washroom1.coordinates.z - washroom2.coordinates.z

  // Euclidean distance in 3D space
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  
  // Convert to meters (assuming coordinates are in some unit that needs conversion)
  // This is a simplified calculation - actual implementation might need scaling factor
  return Math.round(distance * 10) / 10
}

/**
 * Estimate travel time between two washrooms (in minutes)
 */
export function estimateTravelTime(
  washroom1: Washroom,
  washroom2: Washroom,
  walkingSpeedMetersPerMinute: number = 80 // ~5 km/h
): number {
  const distance = calculateWalkingDistance(washroom1, washroom2)
  return Math.ceil(distance / walkingSpeedMetersPerMinute)
}

/**
 * Aggregate Happy Scores by time window
 */
export function aggregateHappyScoresByWindow(
  happyScores: HappyScore[],
  windowMinutes: number = 15
): HappyScore[] {
  const aggregated: Map<string, HappyScore> = new Map()

  happyScores.forEach((score) => {
    // Round timestamp to nearest window
    const windowStart = new Date(score.timestamp)
    const minutes = windowStart.getMinutes()
    windowStart.setMinutes(Math.floor(minutes / windowMinutes) * windowMinutes, 0, 0)

    const key = `${score.washroomId}-${windowStart.toISOString()}`

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!
      // Average the scores
      const count = (existing.windowMinutes || 1) / windowMinutes
      existing.score = (existing.score * count + score.score) / (count + 1)
      existing.windowMinutes = (existing.windowMinutes || windowMinutes) + windowMinutes
    } else {
      aggregated.set(key, {
        ...score,
        timestamp: windowStart,
        windowMinutes,
      })
    }
  })

  return Array.from(aggregated.values())
}

/**
 * Filter tasks by various criteria
 */
export function filterTasks(
  tasks: Task[],
  filters: {
    washroomId?: string
    state?: TaskState[]
    priority?: TaskPriority[]
    assignedCrewId?: string
    terminal?: string[]
  }
): Task[] {
  return tasks.filter((task) => {
    if (filters.washroomId && task.washroomId !== filters.washroomId) {
      return false
    }
    if (filters.state && !filters.state.includes(task.state)) {
      return false
    }
    if (filters.priority && !filters.priority.includes(task.priority)) {
      return false
    }
    if (filters.assignedCrewId && task.assignedCrewId !== filters.assignedCrewId) {
      return false
    }
    // Terminal filtering would require joining with washroom data
    return true
  })
}

