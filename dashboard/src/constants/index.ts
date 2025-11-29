/**
 * Application constants
 */

// Environment variables
export const DATA_ROOT =
  import.meta.env.VITE_DATA_ROOT || '../GTAA flights arrival departure data 2024'

// Refresh intervals (milliseconds)
export const REFRESH_INTERVAL_LIVE_OPS = 30000 // 30 seconds
export const REFRESH_INTERVAL_DEFAULT = 60000 // 60 seconds

// Happy Score threshold (Section 4.2)
export const HAPPY_SCORE_THRESHOLD = 85

// Default SLA values
export const DEFAULT_MAX_HEADWAY_MINUTES = 45
export const DEFAULT_EMERGENCY_RESPONSE_TARGET_MINUTES = 10

// Task time horizon (Section 6.2.1)
export const TASK_TIME_HORIZON_HOURS = 6

// Demand forecast horizon (Section 6.4.1)
export const DEMAND_FORECAST_HOURS = 12

