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
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts'
import { useMemo, useState, useEffect } from 'react'
import { useData } from '../../hooks/useData'
import { TimeRange } from './TimeRangeSelector'
import { HAPPY_SCORE_THRESHOLD } from '../../constants'
import { calculateAverageHappyScore } from '../../services/dataTransform'
import { format } from 'date-fns'
import { HappyScore } from '../../types'

interface ServiceQualityKPIsProps {
  timeRange: TimeRange
}

function ServiceQualityKPIs({ timeRange }: ServiceQualityKPIsProps) {
  const { happyScores, washrooms } = useData()
  const [hourlyData, setHourlyData] = useState<HappyScore[]>([])

  // Load hourly distribution data separately
  useEffect(() => {
    const loadHourlyData = async () => {
      try {
        const possiblePaths = [
          '/bathroom_hourly_distribution.csv',
          'data/bathroom_hourly_distribution.csv',
          '/data/bathroom_hourly_distribution.csv',
          './data/bathroom_hourly_distribution.csv',
        ]

        let text: string | null = null
        for (const csvPath of possiblePaths) {
          try {
            const response = await fetch(csvPath)
            if (response.ok) {
              text = await response.text()
              break
            }
          } catch (error) {
            continue
          }
        }

        if (!text) {
          console.warn('Hourly distribution CSV not found')
          return
        }

        // Parse CSV using Papa Parse (we'll need to import it or use a simple parser)
        const Papa = (await import('papaparse')).default
        Papa.parse(text, {
          header: true,
          delimiter: ',',
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            if (!results.data || results.data.length === 0) return

            const hourlyScores: HappyScore[] = []
            const baseDate = new Date('2024-01-01')

            results.data.forEach((row: any) => {
              try {
                const bathroomId = String(row.Bathroom || '').trim()
                if (!bathroomId) return

                const timeStr = String(row.Time || '').trim()
                if (!timeStr) return

                const [hours] = timeStr.split(':').map(Number)
                if (isNaN(hours) || hours < 0 || hours > 23) return

                const timestamp = new Date(baseDate)
                timestamp.setHours(hours, 0, 0, 0)

                const happyIndex = parseFloat(String(row['Happy Index'] || '0'))
                if (isNaN(happyIndex) || happyIndex < 0 || happyIndex > 100) return

                hourlyScores.push({
                  washroomId: bathroomId,
                  score: Math.round(happyIndex),
                  timestamp,
                  source: 'aggregated',
                  windowMinutes: 60,
                })
              } catch (error) {
                // Skip malformed rows
              }
            })

            setHourlyData(hourlyScores)
          },
        })
      } catch (error) {
        console.warn('Failed to load hourly distribution data:', error)
      }
    }

    loadHourlyData()
  }, [])

  const hourlyDistribution = useMemo(() => {
    if (hourlyData.length === 0) return []

    // Group by hour of day (0-23) and calculate average
    const hourMap = new Map<number, { sum: number; count: number }>()

    hourlyData.forEach((hs) => {
      const hour = hs.timestamp.getHours()
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { sum: 0, count: 0 })
      }
      const entry = hourMap.get(hour)!
      entry.sum += hs.score
      entry.count += 1
    })

    // Create array for all 24 hours
    const distribution = Array.from({ length: 24 }, (_, hour) => {
      const entry = hourMap.get(hour)
      const avgScore = entry ? entry.sum / entry.count : 0
      return {
        hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        score: Math.round(avgScore * 10) / 10,
      }
    })

    return distribution
  }, [hourlyData])

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

    // Detect if we have monthly data (check windowMinutes or date spacing)
    const isMonthlyData = scoresInRange.some(
      (hs) => hs.windowMinutes && hs.windowMinutes > 24 * 60
    ) || scoresInRange.length > 0 && scoresInRange.length < 100 // Likely aggregated data

    // Create trend data - group by month for monthly data, by hour for hourly data
    const trendMap = new Map<string, { time: string; timestamp: Date; score: number; count: number }>()
    
    scoresInRange.forEach((hs) => {
      let timeKey: string
      let timeLabel: string
      let timestamp: Date

      if (isMonthlyData) {
        // Group by month (YYYY-MM)
        timeKey = format(hs.timestamp, 'yyyy-MM')
        timeLabel = format(hs.timestamp, 'MMM yyyy') // e.g., "Jan 2024"
        timestamp = new Date(hs.timestamp.getFullYear(), hs.timestamp.getMonth(), 1)
      } else {
        // Group by hour (YYYY-MM-DDTHH)
        timeKey = hs.timestamp.toISOString().slice(0, 13)
        timeLabel = format(hs.timestamp, 'MMM d, HH:mm') // e.g., "Jan 1, 14:30"
        timestamp = new Date(timeKey + ':00:00Z')
      }

      if (!trendMap.has(timeKey)) {
        trendMap.set(timeKey, {
          time: timeLabel,
          timestamp,
          score: 0,
          count: 0,
        })
      }
      const entry = trendMap.get(timeKey)!
      entry.score += hs.score
      entry.count += 1
    })

    const trendData = Array.from(trendMap.values())
      .map((entry) => ({
        time: entry.time,
        timestamp: entry.timestamp.getTime(), // For sorting
        score: Math.round((entry.score / entry.count) * 10) / 10,
      }))
      .sort((a, b) => a.timestamp - b.timestamp) // Sort by actual timestamp
      .map(({ timestamp, ...rest }) => rest) // Remove timestamp from final data

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      percentAboveThreshold: Math.round(percentAboveThreshold * 10) / 10,
      trendData,
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
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

          {/* Trend Chart */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Happy Score Trend
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    angle={metrics.trendData.length > 6 ? -45 : 0}
                    textAnchor={metrics.trendData.length > 6 ? 'end' : 'middle'}
                    height={metrics.trendData.length > 6 ? 60 : 30}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value: number) => [`${value.toFixed(1)}`, 'Happy Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Happy Score"
                  />
                  <ReferenceLine
                    y={HAPPY_SCORE_THRESHOLD}
                    stroke="#ff9800"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    label={{ value: 'Threshold', position: 'right' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Average Hourly Distribution Chart */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Average Hourly Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hourLabel" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={1}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(label) => `Hour: ${label}`}
                    formatter={(value: number) => [`${value.toFixed(1)}`, 'Avg Happy Score']}
                  />
                  <Bar dataKey="score" fill="#1976d2" name="Average Happy Score">
                    {hourlyDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= HAPPY_SCORE_THRESHOLD ? '#4caf50' : '#ff9800'}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine
                    y={HAPPY_SCORE_THRESHOLD}
                    stroke="#ff9800"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    label={{ value: 'Threshold', position: 'right' }}
                  />
                </BarChart>
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

