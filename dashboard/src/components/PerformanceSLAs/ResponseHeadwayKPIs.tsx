/**
 * Response & Headway KPIs - Emergency response and headway metrics
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { TimeRange } from './TimeRangeSelector'
import { differenceInMinutes } from 'date-fns'
import { calculateHeadway } from '../../services/dataTransform'

interface ResponseHeadwayKPIsProps {
  timeRange: TimeRange
}

function ResponseHeadwayKPIs({ timeRange }: ResponseHeadwayKPIsProps) {
  const { emergencyEvents, tasks, washrooms } = useData()

  const metrics = useMemo(() => {
    // Filter emergencies within time range
    const emergenciesInRange = emergencyEvents.filter(
      (e) =>
        e.detectedAt >= timeRange.start &&
        e.detectedAt <= timeRange.end &&
        e.firstResponseTime
    )

    // Calculate response times
    const responseTimes = emergenciesInRange.map((e) =>
      differenceInMinutes(e.firstResponseTime!, e.detectedAt)
    )

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0

    // Response time distribution (buckets)
    const distribution: { [key: string]: number } = {
      '0-5min': 0,
      '5-10min': 0,
      '10-15min': 0,
      '15-20min': 0,
      '20+min': 0,
    }

    responseTimes.forEach((rt) => {
      if (rt <= 5) distribution['0-5min']++
      else if (rt <= 10) distribution['5-10min']++
      else if (rt <= 15) distribution['10-15min']++
      else if (rt <= 20) distribution['15-20min']++
      else distribution['20+min']++
    })

    const distributionData = Object.entries(distribution).map(([name, value]) => ({
      name,
      count: value,
    }))

    // Headway analysis by washroom type
    const headwayByType: { [key: string]: number[] } = {}
    washrooms.forEach((w) => {
      const headway = calculateHeadway(w.id, tasks)
      if (headway) {
        if (!headwayByType[w.type]) {
          headwayByType[w.type] = []
        }
        headwayByType[w.type].push(headway.headwayMinutes)
      }
    })

    const headwayStats = Object.entries(headwayByType).map(([type, values]) => {
      const sorted = [...values].sort((a, b) => a - b)
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
      const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length

      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        avg: Math.round(avg * 10) / 10,
        p50: Math.round(p50 * 10) / 10,
        p90: Math.round(p90 * 10) / 10,
      }
    })

    // Tasks completed within SLA
    const tasksInRange = tasks.filter(
      (t) =>
        t.completedTime &&
        t.completedTime >= timeRange.start &&
        t.completedTime <= timeRange.end
    )

    const tasksWithinSLA = tasksInRange.filter((t) => {
      if (!t.slaDeadline || !t.completedTime) return false
      return t.completedTime <= t.slaDeadline
    })

    const percentWithinSLA =
      tasksInRange.length > 0
        ? (tasksWithinSLA.length / tasksInRange.length) * 100
        : 0

    return {
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      distributionData,
      headwayStats,
      percentWithinSLA: Math.round(percentWithinSLA * 10) / 10,
      tasksCompleted: tasksInRange.length,
      tasksWithinSLA: tasksWithinSLA.length,
    }
  }, [emergencyEvents, tasks, washrooms, timeRange])

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Response & Headway
        </Typography>

        <Grid container spacing={3}>
          {/* Average Response Time */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Avg Emergency Response Time
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.avgResponseTime <= 10
                      ? 'success.main'
                      : metrics.avgResponseTime <= 15
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.avgResponseTime.toFixed(1)} min
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Target: ≤10 min
              </Typography>
            </Box>
          </Grid>

          {/* % Tasks Within SLA */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tasks Completed Within SLA
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.percentWithinSLA >= 90
                      ? 'success.main'
                      : metrics.percentWithinSLA >= 75
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.percentWithinSLA.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.tasksWithinSLA} / {metrics.tasksCompleted} tasks
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.percentWithinSLA}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
                color={
                  metrics.percentWithinSLA >= 90
                    ? 'success'
                    : metrics.percentWithinSLA >= 75
                    ? 'warning'
                    : 'error'
                }
              />
            </Box>
          </Grid>

          {/* Response Time Distribution */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Emergency Response Time Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Headway by Type */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Headway by Washroom Type
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.headwayStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#4caf50" name="Average" />
                  <Bar dataKey="p50" fill="#2196f3" name="P50" />
                  <Bar dataKey="p90" fill="#ff9800" name="P90" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ResponseHeadwayKPIs

