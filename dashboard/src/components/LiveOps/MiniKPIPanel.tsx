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
import {
  calculateAverageHappyScore,
  calculateHeadway,
} from '../../services/dataTransform'
import { HAPPY_SCORE_THRESHOLD } from '../../constants'

interface KPICardProps {
  title: string
  value: string | number
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
            aria-label={`${title} value is ${value}`}
          >
            {value}
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

  const kpis = useMemo(() => {
    // 1. Current avg happy score
    const avgHappyScore = washrooms.reduce((sum, washroom) => {
      const score = calculateAverageHappyScore(washroom.id, happyScores)
      return sum + (score || 0)
    }, 0) / (washrooms.length || 1)

    // 2. Number of active emergencies
    const activeEmergencies = emergencyEvents.filter(
      (e) => e.status === 'active'
    ).length

    // 3. Number of overdue tasks
    const overdueTasks = tasks.filter((t) => t.state === 'overdue').length

    // 4. Avg response time to emergencies (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentResolved = emergencyEvents.filter(
      (e) =>
        e.status === 'resolved' &&
        e.detectedAt >= twoHoursAgo &&
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
        : 0

    // 5. Avg headway vs SLA
    const headways = washrooms
      .map((w) => calculateHeadway(w.id, tasks))
      .filter((h): h is NonNullable<typeof h> => h !== null)

    const avgHeadway =
      headways.length > 0
        ? headways.reduce((sum, h) => sum + h.headwayMinutes, 0) /
          headways.length
        : 0

    const avgSlaMinutes =
      headways.length > 0
        ? headways.reduce((sum, h) => sum + h.slaMinutes, 0) / headways.length
        : 45

    return {
      avgHappyScore: Math.round(avgHappyScore * 10) / 10,
      activeEmergencies,
      overdueTasks,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgHeadway: Math.round(avgHeadway * 10) / 10,
      avgSlaMinutes: Math.round(avgSlaMinutes),
    }
  }, [washrooms, tasks, emergencyEvents, happyScores])

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        System KPIs
      </Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid item xs={6} sm={6} md={2.4}>
          <KPICard
            title="Avg Happy Score"
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
            value={`${kpis.avgResponseTime}m`}
            icon={<AccessTime />}
            color={kpis.avgResponseTime > 10 ? 'warning' : 'success'}
            subtitle="Last 2 hours"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Avg Headway"
            value={`${kpis.avgHeadway}m`}
            icon={<Timeline />}
            color={kpis.avgHeadway > kpis.avgSlaMinutes ? 'warning' : 'success'}
            subtitle={`SLA: ${kpis.avgSlaMinutes}m`}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default MiniKPIPanel

