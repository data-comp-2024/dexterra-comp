/**
 * Generate cleaning requirements from flight schedules
 * Rule: Clean bathrooms every ~2 hours based on flight times
 */

import { Flight, Washroom } from '../types'
import { CleaningRequirement } from './optimizerService'
import { CURRENT_DATE } from '../constants'

/**
 * Generate cleaning requirements based on flights
 * Each washroom should be cleaned approximately every 2 hours
 * Cleaning times are aligned with flight arrival/departure times
 */
export function generateCleaningRequirementsFromFlights(
  flights: Flight[],
  washrooms: Washroom[],
  cleaningFrequencyHours: number = 2,
  simulationStartTime: Date = CURRENT_DATE,
  simulationDurationHours: number = 8
): CleaningRequirement[] {
  const simulationEndTime = new Date(
    simulationStartTime.getTime() + simulationDurationHours * 60 * 60 * 1000
  )

  // Filter flights within simulation window
  const relevantFlights = flights.filter((flight) => {
    const flightTime =
      flight.actualArrivalTime?.getTime() ||
      flight.actualDepartureTime?.getTime() ||
      flight.scheduledArrivalTime?.getTime() ||
      flight.scheduledDepartureTime?.getTime() ||
      0

    return (
      flightTime >= simulationStartTime.getTime() &&
      flightTime <= simulationEndTime.getTime()
    )
  })

  // Group flights by gate/area to determine which washrooms need cleaning
  const gateToWashrooms = new Map<string, string[]>()
  
  // Map washrooms to gates based on proximity
  washrooms.forEach((washroom) => {
    const gate = washroom.gateProximity || ''
    if (gate) {
      if (!gateToWashrooms.has(gate)) {
        gateToWashrooms.set(gate, [])
      }
      gateToWashrooms.get(gate)!.push(washroom.id)
    }
  })

  // Generate cleaning times based on flights
  const washroomCleaningTimes = new Map<string, Date[]>()
  
  // Initialize all washrooms
  washrooms.forEach((w) => {
    washroomCleaningTimes.set(w.id, [])
  })

  // For each flight, schedule cleanings for nearby washrooms
  relevantFlights.forEach((flight) => {
    const flightTime =
      flight.actualArrivalTime ||
      flight.actualDepartureTime ||
      flight.scheduledArrivalTime ||
      flight.scheduledDepartureTime

    if (!flightTime) return

    const gate = flight.gate || ''
    const nearbyWashrooms = gateToWashrooms.get(gate) || []

    // If no specific gate match, assign to all washrooms (fallback)
    const targetWashrooms = nearbyWashrooms.length > 0 ? nearbyWashrooms : washrooms.map((w) => w.id)

    targetWashrooms.forEach((washroomId) => {
      const existingTimes = washroomCleaningTimes.get(washroomId) || []
      
      // Check if we already have a cleaning scheduled near this time
      const hasNearbyCleaning = existingTimes.some(
        (time) => Math.abs(time.getTime() - flightTime.getTime()) < 30 * 60 * 1000 // 30 min window
      )

      if (!hasNearbyCleaning) {
        existingTimes.push(flightTime)
        washroomCleaningTimes.set(washroomId, existingTimes)
      }
    })
  })

  // Fill in gaps to ensure ~2 hour intervals
  const requirements: CleaningRequirement[] = []
  const cleaningIntervalMs = cleaningFrequencyHours * 60 * 60 * 1000

  washroomCleaningTimes.forEach((cleaningTimes, washroomId) => {
    // Sort cleaning times
    cleaningTimes.sort((a, b) => a.getTime() - b.getTime())

    // Fill gaps to ensure regular cleaning
    const allCleaningTimes: Date[] = []
    let currentTime = simulationStartTime.getTime()

    for (const flightTime of cleaningTimes) {
      // Add cleanings between current time and flight time if gap is > interval
      while (currentTime + cleaningIntervalMs < flightTime.getTime()) {
        allCleaningTimes.push(new Date(currentTime + cleaningIntervalMs))
        currentTime += cleaningIntervalMs
      }
      
      // Add the flight-aligned cleaning
      allCleaningTimes.push(flightTime)
      currentTime = flightTime.getTime()
    }

    // Continue adding cleanings until end of simulation
    while (currentTime + cleaningIntervalMs <= simulationEndTime.getTime()) {
      allCleaningTimes.push(new Date(currentTime + cleaningIntervalMs))
      currentTime += cleaningIntervalMs
    }

    // Count unique cleanings (within simulation window)
    const cleaningsInWindow = allCleaningTimes.filter(
      (time) =>
        time.getTime() >= simulationStartTime.getTime() &&
        time.getTime() <= simulationEndTime.getTime()
    ).length

    if (cleaningsInWindow > 0) {
      requirements.push({
        washroomId,
        numCleanings: cleaningsInWindow,
        cleaningFrequencyHours, // Include frequency in requirement
      })
    }
  })

  // Ensure all washrooms have at least some cleanings
  washrooms.forEach((washroom) => {
    const hasRequirement = requirements.some((r) => r.washroomId === washroom.id)
    if (!hasRequirement) {
      // Default: clean at specified frequency
      const numCleanings = Math.floor(simulationDurationHours / cleaningFrequencyHours)
      if (numCleanings > 0) {
        requirements.push({
          washroomId: washroom.id,
          numCleanings,
          cleaningFrequencyHours, // Include frequency in requirement
        })
      }
    }
  })

  return requirements
}

