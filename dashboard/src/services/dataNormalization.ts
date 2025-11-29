/**
 * Data Normalization Utilities
 * Provides consistent ID mapping and data transformation across data sources
 */

import { Washroom } from '../types'

/**
 * Map kiosk path to washroom ID
 * Attempts to extract washroom identifier from Happy or Not kiosk paths
 */
export function mapKioskPathToWashroomId(path: string, washrooms: Washroom[]): string | null {
  if (!path) return null

  const pathLower = path.toLowerCase().trim()

  // Try to find exact match first
  const exactMatch = washrooms.find((w) => {
    const washroomPath = w.id.toLowerCase()
    return pathLower.includes(washroomPath) || washroomPath.includes(pathLower)
  })
  if (exactMatch) return exactMatch.id

  // Try to extract gate number from path
  const gateMatch = pathLower.match(/gate\s*(\d+)/i)
  if (gateMatch) {
    const gateNum = gateMatch[1]
    // Try to find washroom with matching gate proximity
    const gateMatchWashroom = washrooms.find((w) => {
      const gateProx = w.gateProximity?.toLowerCase() || ''
      return gateProx.includes(`gate ${gateNum}`) || gateProx.includes(`gate${gateNum}`)
    })
    if (gateMatchWashroom) return gateMatchWashroom.id

    // Fallback: construct ID from gate number (assume T1-MEN)
    return `T1-${gateNum}-MEN`
  }

  // Try to extract terminal and gate from path
  const terminalMatch = pathLower.match(/t(\d+)/i)
  if (terminalMatch && gateMatch) {
    const terminal = `T${terminalMatch[1]}`
    const gateNum = gateMatch[1]
    // Try to find matching washroom
    const terminalGateMatch = washrooms.find(
      (w) => w.terminal === terminal && w.gateProximity?.includes(`Gate ${gateNum}`)
    )
    if (terminalGateMatch) return terminalGateMatch.id
  }

  return null
}

/**
 * Normalize washroom ID across different data sources
 * Handles variations like "T1-134-MEN" vs "T1-134-M" vs "134"
 */
export function normalizeWashroomId(id: string, washrooms: Washroom[]): string | null {
  if (!id) return null

  const idLower = id.toLowerCase().trim()

  // Try exact match first
  const exactMatch = washrooms.find((w) => w.id.toLowerCase() === idLower)
  if (exactMatch) return exactMatch.id

  // Try partial match (e.g., "134" matches "T1-134-MEN")
  const partialMatch = washrooms.find((w) => {
    const washroomId = w.id.toLowerCase()
    return washroomId.includes(idLower) || idLower.includes(washroomId)
  })
  if (partialMatch) return partialMatch.id

  // Try gate number extraction
  const gateNum = idLower.match(/\d+/)?.[0]
  if (gateNum) {
    const gateMatch = washrooms.find((w) => {
      const gateProx = w.gateProximity?.toLowerCase() || ''
      return gateProx.includes(`gate ${gateNum}`) || gateProx.includes(`gate${gateNum}`)
    })
    if (gateMatch) return gateMatch.id
  }

  return null
}

/**
 * Validate and clean washroom data
 */
export function validateWashroom(washroom: Partial<Washroom>): Washroom | null {
  if (!washroom.id || !washroom.name) {
    return null
  }

  // Ensure coordinates are valid numbers
  const x = Number(washroom.coordinates?.x)
  const y = Number(washroom.coordinates?.y)
  const z = Number(washroom.coordinates?.z) || 0

  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    return null
  }

  return {
    id: String(washroom.id).trim(),
    name: String(washroom.name).trim(),
    terminal: washroom.terminal || 'T1',
    concourse: washroom.concourse,
    gateProximity: washroom.gateProximity,
    type: washroom.type || 'standard',
    status: washroom.status || 'active',
    coordinates: { x, y, z },
    sla: washroom.sla || {
      maxHeadwayMinutes: 45,
      emergencyResponseTargetMinutes: 10,
    },
    happyScoreThreshold: washroom.happyScoreThreshold || 85,
    poopProfile: washroom.poopProfile,
  }
}

/**
 * Cache for normalized data to improve performance
 */
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private ttl = 5 * 60 * 1000 // 5 minutes

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const dataCache = new DataCache()
