/**
 * Core domain types based on context.MD Section 4
 */

// Section 4.1: Washroom
export interface Washroom {
  id: string // Canonical key (e.g., "T1-134-MEN", "FE2097")
  name: string
  terminal: string
  concourse?: string
  gateProximity?: string
  type: WashroomType
  poopProfile?: string // Qualitative demand label
  coordinates: {
    x: number
    y: number
    z: number
  }
  status: WashroomStatus
  sla?: {
    maxHeadwayMinutes: number
    emergencyResponseTargetMinutes: number
  }
  happyScoreThreshold?: number // Default: 85
}

export type WashroomType =
  | 'standard'
  | 'family'
  | 'accessible'
  | 'staff-only'
  | 'other'

export type WashroomStatus = 'active' | 'inactive' | 'closed'

// Section 4.2: Happy Score
export interface HappyScore {
  washroomId: string
  score: number // 0-100
  timestamp: Date
  source: 'feedback' | 'sensor' | 'aggregated'
  windowMinutes?: number // Rolling window size
}

// Section 4.3: Task
export interface Task {
  id: string
  type: TaskType
  washroomId: string
  priority: TaskPriority
  state: TaskState
  assignedCrewId?: string
  createdTime: Date
  slaDeadline?: Date
  estimatedDurationMinutes?: number
  startedTime?: Date
  completedTime?: Date
  cancelledTime?: Date
  cancellationReason?: string
}

export type TaskType =
  | 'routine_cleaning'
  | 'emergency_cleaning'
  | 'inspection'
  | 'consumable_refill'

export type TaskPriority = 'normal' | 'high' | 'emergency'

export type TaskState =
  | 'unassigned'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue'

// Section 4.4: Emergency Event
export interface EmergencyEvent {
  id: string
  type: EmergencyType
  washroomId: string
  detectedAt: Date
  source: 'sensor' | 'staff_report' | 'passenger_report'
  severity: 'low' | 'medium' | 'high' | 'critical'
  assignedCrewId?: string
  firstResponseTime?: Date
  resolutionTime?: Date
  status: 'active' | 'resolved' | 'escalated'
}

export type EmergencyType =
  | 'overflowing_toilet'
  | 'bodily_fluids'
  | 'poor_aim'
  | 'just_too_much_poop'
  | 'slip_hazard'
  | 'odor_threshold_exceeded'
  | 'unhappy_washroom'
  | 'other'

// Section 4.5: Crew and Crew Status
export interface Crew {
  id: string
  name: string
  role: string
  skills?: string[]
  shift: {
    startTime: Date
    endTime: Date
  }
  status: CrewStatus
  currentTaskId?: string
  nextTaskId?: string
  lastBreakStart?: Date
  lastBreakEnd?: Date
  cumulativeWalkingDistance?: number // meters
}

export type CrewStatus =
  | 'off_shift'
  | 'on_shift'
  | 'on_break'
  | 'available'
  | 'busy'
  | 'unavailable'

// Section 4.6: Headway
export interface Headway {
  washroomId: string
  headwayMinutes: number // Time between last completed cleaning and next start
  lastCompletedTime: Date
  nextScheduledTime?: Date
  slaMinutes: number
  isWithinSLA: boolean
}

// Additional types for UI state
export interface FilterState {
  terminal?: string[]
  zone?: string[]
  washroomType?: WashroomType[]
  crewGroup?: string[]
  timeRange?: {
    start: Date
    end: Date
  }
}

export interface User {
  id: string
  name: string
  role: 'dispatcher' | 'ops_manager' | 'system_admin'
}

// Activity Log Entry
export interface ActivityLogEntry {
  id: string
  timestamp: Date
  userId: string
  userName: string
  actionType:
    | 'task_assigned'
    | 'task_reassigned'
    | 'task_cancelled'
    | 'task_priority_changed'
    | 'optimization_run'
    | 'config_changed'
    | 'crew_availability_changed'
    | 'crew_updated'
    | 'washroom_deleted'
    | 'emergency_resolved'
    | 'task_completed'
  affectedEntityType: 'task' | 'washroom' | 'crew' | 'config'
  affectedEntityId: string
  details: Record<string, unknown>
  beforeValues?: Record<string, unknown>
  afterValues?: Record<string, unknown>
}

// Section 6.4: Flight and Demand Forecast
export interface Flight {
  id: string
  airline: string
  flightNumber: string
  gate: string
  origin?: string // Origin location (e.g., "Security" for departures, gate number for arrivals)
  destination?: string // Destination location (e.g., gate number for departures, "Security" for arrivals)
  scheduledArrivalTime?: Date
  scheduledDepartureTime?: Date
  actualArrivalTime?: Date
  actualDepartureTime?: Date
  passengers: number
  aircraftType: string
  status: FlightStatus
  changes?: FlightChange[]
  impactOnDemand?: string // Description of demand impact
}

export type FlightStatus = 'scheduled' | 'delayed' | 'cancelled' | 'boarding' | 'departed' | 'arrived'

export interface FlightChange {
  type: 'delay' | 'cancellation' | 'gate_change'
  originalValue?: string | Date
  newValue?: string | Date
  detectedAt: Date
  impactDescription?: string
}

export interface DemandForecast {
  timestamp: Date
  terminal?: string
  concourse?: string
  washroomType?: WashroomType
  predictedDemand: number // Predicted cleaning tasks needed
  confidence?: number // 0-1
}

export interface RiskForecast {
  area: string // Terminal, zone, or washroom ID
  timeWindow: {
    start: Date
    end: Date
  }
  riskLevel: 'low' | 'medium' | 'high'
  headwayBreachProbability?: number // 0-1
  happyScoreBelowThresholdProbability?: number // 0-1
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}


