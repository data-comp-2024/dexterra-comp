/**
 * Simple logistic model to predict Happy Score based on cleaning schedule
 * 
 * Features:
 * - Time since last cleaning (headway)
 * - Number of cleanings in last 24 hours
 * - Average cleaning frequency
 * - Time of day (peak vs off-peak)
 */

export interface HappyScoreFeatures {
  headwayMinutes: number // Time since last cleaning
  cleaningsLast24Hours: number
  avgCleaningFrequencyHours: number
  timeOfDayHour: number // 0-23
  isPeakHours: boolean // Peak hours: 6-10, 15-19
}

/**
 * Predict happy score using logistic regression
 * Score ranges from 0-100
 */
export function predictHappyScore(features: HappyScoreFeatures): number {
  const {
    headwayMinutes,
    cleaningsLast24Hours,
    avgCleaningFrequencyHours,
    timeOfDayHour,
    isPeakHours,
  } = features

  // Base score (logistic function)
  let score = 85.0

  // Penalty for long headway (time since last cleaning)
  // After 45 minutes, score starts dropping significantly
  if (headwayMinutes > 45) {
    const excessMinutes = headwayMinutes - 45
    const penalty = Math.min(excessMinutes * 0.5, 40) // Max penalty of 40 points
    score -= penalty
  }

  // Bonus for frequent cleanings
  if (cleaningsLast24Hours >= 8) {
    score += 5
  } else if (cleaningsLast24Hours >= 6) {
    score += 2
  } else if (cleaningsLast24Hours < 4) {
    score -= 10
  }

  // Penalty for infrequent average cleaning
  if (avgCleaningFrequencyHours > 3) {
    const excessHours = avgCleaningFrequencyHours - 3
    score -= Math.min(excessHours * 2, 15)
  }

  // Time of day adjustment
  if (isPeakHours) {
    // During peak hours, need more frequent cleaning
    if (headwayMinutes > 30) {
      score -= 5
    }
  } else {
    // Off-peak hours are more forgiving
    if (headwayMinutes < 60) {
      score += 3
    }
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

/**
 * Calculate average happy score for a washroom based on cleaning schedule
 */
export function calculateWashroomHappyScore(
  washroomId: string,
  cleaningTimes: Date[],
  currentTime: Date
): number {
  // Find most recent cleaning
  const recentCleanings = cleaningTimes
    .filter((time) => time <= currentTime)
    .sort((a, b) => b.getTime() - a.getTime())

  if (recentCleanings.length === 0) {
    // No cleanings - very low score
    return 30.0
  }

  const lastCleaningTime = recentCleanings[0]
  const headwayMinutes = (currentTime.getTime() - lastCleaningTime.getTime()) / (1000 * 60)

  // Count cleanings in last 24 hours
  const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000)
  const cleaningsLast24Hours = recentCleanings.filter(
    (time) => time >= twentyFourHoursAgo
  ).length

  // Calculate average cleaning frequency
  let avgCleaningFrequencyHours = 2.0 // Default
  if (recentCleanings.length >= 2) {
    const intervals: number[] = []
    for (let i = 0; i < recentCleanings.length - 1; i++) {
      const interval =
        (recentCleanings[i].getTime() - recentCleanings[i + 1].getTime()) / (1000 * 60 * 60)
      intervals.push(interval)
    }
    avgCleaningFrequencyHours =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length
  }

  // Determine time of day
  const timeOfDayHour = currentTime.getHours()
  const isPeakHours =
    (timeOfDayHour >= 6 && timeOfDayHour < 10) ||
    (timeOfDayHour >= 15 && timeOfDayHour < 19)

  return predictHappyScore({
    headwayMinutes,
    cleaningsLast24Hours,
    avgCleaningFrequencyHours,
    timeOfDayHour,
    isPeakHours,
  })
}

/**
 * Predict happy scores for all washrooms based on optimized schedule
 */
export function predictHappyScoresFromSchedule(
  washroomIds: string[],
  assignments: Array<{ washroomId: string; startTime: Date }>,
  currentTime: Date
): Map<string, number> {
  const scores = new Map<string, number>()

  washroomIds.forEach((washroomId) => {
    const washroomCleanings = assignments
      .filter((a) => a.washroomId === washroomId)
      .map((a) => a.startTime)
      .sort((a, b) => a.getTime() - b.getTime())

    const score = calculateWashroomHappyScore(washroomId, washroomCleanings, currentTime)
    scores.set(washroomId, score)
  })

  return scores
}

