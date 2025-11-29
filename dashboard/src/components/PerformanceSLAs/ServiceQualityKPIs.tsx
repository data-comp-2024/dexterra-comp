/**
 * Service Quality KPIs - Happy Score metrics
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { TimeRange } from './TimeRangeSelector'
import { HAPPY_SCORE_THRESHOLD } from '../../constants'
import { calculateAverageHappyScore } from '../../services/dataTransform'

interface ServiceQualityKPIsProps {
  timeRange: TimeRange
}

function ServiceQualityKPIs({ timeRange }: ServiceQualityKPIsProps) {
  const { happyScores, washrooms } = useData()

  const metrics = useMemo(() => {
    // Filter happy scores within time range
    const scoresInRange = happyScores.filter(
      (hs) => hs.timestamp >= timeRange.start && hs.timestamp <= timeRange.end
    )

    if (scoresInRange.length === 0) {
      return {
        avgScore: 0,
        percentAboveThreshold: 0,
        trendData: [],
        complaintsPer1k: 0,
      }
    }

    // Calculate average happy score
    const avgScore =
      scoresInRange.reduce((sum, hs) => sum + hs.score, 0) / scoresInRange.length

    // Calculate % time above threshold
    const scoresAboveThreshold = scoresInRange.filter(
      (hs) => hs.score >= HAPPY_SCORE_THRESHOLD
    ).length
    const percentAboveThreshold =
      (scoresAboveThreshold / scoresInRange.length) * 100

    // Create trend data (hourly buckets)
    const trendMap = new Map<string, { time: string; score: number; count: number }>()
    scoresInRange.forEach((hs) => {
      const hourKey = hs.timestamp.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      if (!trendMap.has(hourKey)) {
        trendMap.set(hourKey, {
          time: new Date(hourKey).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          score: 0,
          count: 0,
        })
      }
      const entry = trendMap.get(hourKey)!
      entry.score += hs.score
      entry.count += 1
    })

    const trendData = Array.from(trendMap.values())
      .map((entry) => ({
        time: entry.time,
        score: Math.round((entry.score / entry.count) * 10) / 10,
      }))
      .sort((a, b) => a.time.localeCompare(b.time))

    // Mock complaints per 1k passengers (would come from real data)
    const complaintsPer1k = Math.max(0, (100 - avgScore) * 0.5)

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      percentAboveThreshold: Math.round(percentAboveThreshold * 10) / 10,
      trendData,
      complaintsPer1k: Math.round(complaintsPer1k * 10) / 10,
    }
  }, [happyScores, timeRange])

  const gaugeData = [
    { name: 'Above Threshold', value: metrics.percentAboveThreshold },
    { name: 'Below Threshold', value: 100 - metrics.percentAboveThreshold },
  ]

  const COLORS = ['#4caf50', '#ff9800']

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Service Quality
        </Typography>

        <Grid container spacing={3}>
          {/* Average Happy Score Card */}
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
                Average Happy Score
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.avgScore >= HAPPY_SCORE_THRESHOLD
                      ? 'success.main'
                      : 'warning.main',
                }}
              >
                {metrics.avgScore.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Target: {HAPPY_SCORE_THRESHOLD}+
              </Typography>
            </Box>
          </Grid>

          {/* % Time Above Threshold */}
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
                % Time Above Threshold
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.percentAboveThreshold >= 80
                      ? 'success.main'
                      : metrics.percentAboveThreshold >= 60
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.percentAboveThreshold.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.percentAboveThreshold}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
                color={
                  metrics.percentAboveThreshold >= 80
                    ? 'success'
                    : metrics.percentAboveThreshold >= 60
                    ? 'warning'
                    : 'error'
                }
              />
            </Box>
          </Grid>

          {/* Complaints per 1k Passengers */}
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
                Complaints per 1k Passengers
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.complaintsPer1k <= 5
                      ? 'success.main'
                      : metrics.complaintsPer1k <= 10
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.complaintsPer1k.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lower is better
              </Typography>
            </Box>
          </Grid>

          {/* Trend Chart */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Happy Score Trend
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => HAPPY_SCORE_THRESHOLD}
                    stroke="#ff9800"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    name="Threshold"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Gauge Chart */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Threshold Compliance
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ServiceQualityKPIs

