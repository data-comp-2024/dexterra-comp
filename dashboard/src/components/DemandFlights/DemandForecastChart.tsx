/**
 * Demand Forecast - Time-series chart showing predicted cleaning demand
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { format } from 'date-fns'

function DemandForecastChart() {
  const { demandForecast, washrooms } = useData()
  const [groupBy, setGroupBy] = useState<'terminal' | 'washroomType'>('terminal')

  const chartData = useMemo(() => {
    // Group forecasts by time and selected grouping
    const timeMap = new Map<string, { [key: string]: number }>()

    demandForecast.forEach((forecast) => {
      const timeKey = format(forecast.timestamp, 'HH:mm')
      const groupKey =
        groupBy === 'terminal'
          ? forecast.terminal || 'Unknown'
          : forecast.washroomType || 'Unknown'

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {})
      }

      const timeData = timeMap.get(timeKey)!
      timeData[groupKey] = (timeData[groupKey] || 0) + forecast.predictedDemand
    })

    // Convert to array format for Recharts
    const data = Array.from(timeMap.entries())
      .map(([time, groups]) => ({
        time,
        ...groups,
      }))
      .sort((a, b) => a.time.localeCompare(b.time))

    return data
  }, [demandForecast, groupBy])

  const seriesKeys = useMemo(() => {
    const keys = new Set<string>()
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'time') {
          keys.add(key)
        }
      })
    })
    return Array.from(keys)
  }, [chartData])

  const colors = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4']

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Demand Forecast (Next 12 Hours)
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Group By</InputLabel>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} label="Group By">
              <MenuItem value="terminal">Terminal</MenuItem>
              <MenuItem value="washroomType">Washroom Type</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: 'Predicted Demand', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {seriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {seriesKeys.map((key, index) => (
            <Chip
              key={key}
              label={key}
              size="small"
              sx={{
                bgcolor: colors[index % colors.length],
                color: 'white',
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default DemandForecastChart

