/**
 * Mini KPI Panel - System-level real-time indicators
 */

import { Box, Card, CardContent, Typography, Grid, Tooltip } from '@mui/material'
import {
  SentimentSatisfiedAlt,
  Warning,
  AssignmentLate,
  AccessTime,
  Timeline,
} from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { useOptimization } from '../../context/OptimizationContext'
import {
  calculateAverageHappyScore,
  calculateHeadway,
} from '../../services/dataTransform'
import { predictHappyScoresFromSchedule } from '../../services/happyScorePrediction'
import { HAPPY_SCORE_THRESHOLD, CURRENT_DATE } from '../../constants'

interface KPICardProps {
  title: string
  value: string | number | null
  icon: React.ReactNode
  color?: 'primary' | 'success' | 'error' | 'warning'
  subtitle?: string
}

function KPICard({ title, value, icon, color = 'primary', subtitle }: KPICardProps) {
  const colorMap = {
    primary: '#7B2CBF',
    success: '#06A77D',
    error: '#D32F2F',
    warning: '#ED6C02',
  }

  const tooltipText = subtitle ? `${title}: ${value}. ${subtitle}` : `${title}: ${value}`

  return (
    <Tooltip title={tooltipText} arrow>
      <Card sx={{ height: '100%' }} role="region" aria-label={title}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                color: colorMap[color],
                mr: 1.5,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-hidden="true"
            >
              {icon}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {title}
            </Typography>
          </Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 600, mb: subtitle ? 0.5 : 0 }}
            aria-label={`${title} value is ${value ?? 'not available'}`}
          >
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Tooltip>
  )
}

function MiniKPIPanel() {
  const { washrooms, tasks, emergencyEvents, happyScores } = useData()
  const { optimizationResult } = useOptimization()

  const kpis = useMemo(() => {
    // If optimization results exist, use them; otherwise use fallback calculations
    if (optimizationResult && optimizationResult.metrics) {
      const metrics = optimizationResult.metrics
      const emergencyResp = metrics.emergencyResponsiveness

      // Calculate overdue tasks from optimization assignments
      const now = CURRENT_DATE
      const overdueTasks = optimizationResult.assignments.filter(
        (a) => a.endTime < now && a.endTime < a.startTime
      ).length

      // Calculate avg headway from optimization assignments
      // Group assignments by washroom and calculate time between cleanings
      const washroomAssignments = new Map<string, Date[]>()
      optimizationResult.assignments.forEach((a) => {
        if (!washroomAssignments.has(a.washroomId)) {
          washroomAssignments.set(a.washroomId, [])
        }
        washroomAssignments.get(a.washroomId)!.push(a.startTime)
      })

      let totalHeadway = 0
      let headwayCount = 0
      washroomAssignments.forEach((times) => {
        const sortedTimes = [...times].sort((a, b) => a.getTime() - b.getTime())
        for (let i = 1; i < sortedTimes.length; i++) {
          const headwayMinutes =
            (sortedTimes[i].getTime() - sortedTimes[i - 1].getTime()) /
            (1000 * 60)
          totalHeadway += headwayMinutes
          headwayCount++
        }
      })

      const avgHeadway =
        headwayCount > 0 ? totalHeadway / headwayCount : 0

      // Calculate avg happy score as the average of individual washroom scores
      // This matches what's shown on the optimization page
      const predictedScores = predictHappyScoresFromSchedule(
        washrooms.map((w) => w.id),
        optimizationResult.assignments.map((a) => ({ washroomId: a.washroomId, startTime: a.startTime })),
        CURRENT_DATE
      )

      // Calculate average of all predicted scores
      const scoresArray = Array.from(predictedScores.values())
      const avgHappyScore = scoresArray.length > 0
        ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
        : 82 // Fallback if no scores

      return {
        avgHappyScore: Math.round(avgHappyScore * 10) / 10,
        activeEmergencies: emergencyEvents.filter((e) => e.status === 'active')
          .length, // Still use emergencyEvents as it's real-time
        overdueTasks,
        avgResponseTime: Math.round(emergencyResp.avgResponseTimeMinutes * 10) / 10,
        avgHeadway: Math.round(avgHeadway * 10) / 10,
        avgSlaMinutes: 45, // Default SLA, could be calculated from requirements
      }
    }

    // Fallback: Use original calculation when no optimization results
    const now = CURRENT_DATE

    // 2. Number of active emergencies
    const activeEmergencies = emergencyEvents.filter(
      (e) => e.status === 'active'
    ).length

    // 3. Number of overdue tasks
    const overdueTasks = tasks.filter((t) => t.state === 'overdue').length

    // 4. Avg response time to emergencies (last 24 hours for more realistic data)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentResolved = emergencyEvents.filter(
      (e) =>
        e.status === 'resolved' &&
        e.detectedAt >= oneDayAgo &&
        e.firstResponseTime
    )

    const avgResponseTime =
      recentResolved.length > 0
        ? recentResolved.reduce((sum, e) => {
            const responseTime =
              (e.firstResponseTime!.getTime() - e.detectedAt.getTime()) /
              (1000 * 60) // minutes
            return sum + responseTime
          }, 0) / recentResolved.length
        : null // Return null when no data

    // 5. Avg headway vs SLA
    const headways = washrooms
      .map((w) => calculateHeadway(w.id, tasks))
      .filter((h): h is NonNullable<typeof h> => h !== null)

    const avgHeadway =
      headways.length > 0
        ? headways.reduce((sum, h) => sum + h.headwayMinutes, 0) /
          headways.length
        : null

    const avgSlaMinutes =
      headways.length > 0
        ? headways.reduce((sum, h) => sum + h.slaMinutes, 0) / headways.length
        : 45

    // 1. Expected Average Happy Score - Based on optimization/task assignment quality
    const baseScore = 82
    const overduePenalty = overdueTasks * 0.5
    const emergencyPenalty = activeEmergencies * 1.5
    const headwayComplianceRate = headways.length > 0
      ? headways.filter((h) => h.isWithinSLA).length / headways.length
      : 1.0
    const headwayBonus = (headwayComplianceRate - 0.8) * 5
    const responseTimeBonus =
      avgResponseTime !== null
        ? Math.max(0, 10 - avgResponseTime) * 0.3
        : 0
    const totalTasks = tasks.length
    const assignedTasks = tasks.filter((t) => t.assignedCrewId).length
    const assignmentRate = totalTasks > 0 ? assignedTasks / totalTasks : 1.0
    const assignmentBonus = (assignmentRate - 0.9) * 3

    let avgHappyScore =
      baseScore -
      overduePenalty -
      emergencyPenalty +
      headwayBonus +
      responseTimeBonus +
      assignmentBonus
    avgHappyScore = Math.max(60, Math.min(95, avgHappyScore))

    return {
      avgHappyScore: Math.round(avgHappyScore * 10) / 10,
      activeEmergencies,
      overdueTasks,
      avgResponseTime: avgResponseTime !== null ? Math.round(avgResponseTime * 10) / 10 : null,
      avgHeadway: avgHeadway !== null ? Math.round(avgHeadway * 10) / 10 : null,
      avgSlaMinutes: Math.round(avgSlaMinutes),
    }
  }, [washrooms, tasks, emergencyEvents, happyScores, optimizationResult])

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        System KPIs
      </Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid item xs={6} sm={6} md={2.4}>
          <KPICard
            title="Expected Avg Happy Score"
            value={kpis.avgHappyScore}
            icon={<SentimentSatisfiedAlt />}
            color={kpis.avgHappyScore >= HAPPY_SCORE_THRESHOLD ? 'success' : 'warning'}
            subtitle={`Target: ${HAPPY_SCORE_THRESHOLD}+`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Active Emergencies"
            value={kpis.activeEmergencies}
            icon={<Warning />}
            color={kpis.activeEmergencies > 0 ? 'error' : 'success'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Overdue Tasks"
            value={kpis.overdueTasks}
            icon={<AssignmentLate />}
            color={kpis.overdueTasks > 0 ? 'error' : 'success'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Avg Response Time"
            value={kpis.avgResponseTime !== null ? `${kpis.avgResponseTime}m` : '—'}
            icon={<AccessTime />}
            color={
              kpis.avgResponseTime === null
                ? 'primary'
                : kpis.avgResponseTime > 10
                  ? 'warning'
                  : 'success'
            }
            subtitle={optimizationResult ? 'From optimization' : 'Last 24 hours'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Avg Headway"
            value={kpis.avgHeadway !== null ? `${kpis.avgHeadway}m` : '—'}
            icon={<Timeline />}
            color={
              kpis.avgHeadway === null
                ? 'primary'
                : kpis.avgHeadway > kpis.avgSlaMinutes
                  ? 'warning'
                  : 'success'
            }
            subtitle={`SLA: ${kpis.avgSlaMinutes}m`}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default MiniKPIPanel

