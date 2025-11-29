/**
 * Risk Forecast - Heatmap showing risk levels by area and time window
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
} from '@mui/material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { RiskForecast as RiskForecastType } from '../../types'
import { format } from 'date-fns'

function RiskForecast() {
  const { riskForecast } = useData()

  const heatmapData = useMemo(() => {
    // Group by area and time window
    const areaMap = new Map<string, RiskForecastType[]>()

    riskForecast.forEach((forecast) => {
      if (!areaMap.has(forecast.area)) {
        areaMap.set(forecast.area, [])
      }
      areaMap.get(forecast.area)!.push(forecast)
    })

    // Get unique time windows
    const timeWindows = Array.from(
      new Set(
        riskForecast.map((f) =>
          `${format(f.timeWindow.start, 'HH:mm')}-${format(f.timeWindow.end, 'HH:mm')}`
        )
      )
    ).sort()

    // Get unique areas
    const areas = Array.from(areaMap.keys()).sort()

    return { areas, timeWindows, areaMap }
  }, [riskForecast])

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return '#f44336' // Red
      case 'medium':
        return '#ff9800' // Orange
      case 'low':
        return '#4caf50' // Green
      default:
        return '#e0e0e0' // Gray
    }
  }

  const getRiskIntensity = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 1.0
      case 'medium':
        return 0.6
      case 'low':
        return 0.3
      default:
        return 0.1
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Risk Forecast
        </Typography>

        {heatmapData.areas.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No risk forecast data available
          </Typography>
        ) : (
          <Box sx={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
            <Box sx={{ display: 'inline-block', minWidth: '100%' }}>
              {/* Header row */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                <Box sx={{ width: 150, flexShrink: 0 }} />
                {heatmapData.timeWindows.map((window) => (
                  <Box
                    key={window}
                    sx={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      px: 0.5,
                    }}
                  >
                    {window}
                  </Box>
                ))}
              </Box>

              {/* Data rows */}
              {heatmapData.areas.map((area) => {
                const forecasts = heatmapData.areaMap.get(area) || []
                const forecastMap = new Map(
                  forecasts.map((f) => [
                    `${format(f.timeWindow.start, 'HH:mm')}-${format(f.timeWindow.end, 'HH:mm')}`,
                    f,
                  ])
                )

                return (
                  <Box key={area} sx={{ display: 'flex', mb: 0.5 }}>
                    <Box
                      sx={{
                        width: 150,
                        flexShrink: 0,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        py: 1,
                        px: 1,
                      }}
                    >
                      {area}
                    </Box>
                    {heatmapData.timeWindows.map((window) => {
                      const forecast = forecastMap.get(window)
                      const riskLevel = forecast?.riskLevel || 'low'
                      const color = getRiskColor(riskLevel)
                      const intensity = getRiskIntensity(riskLevel)

                      return (
                        <Tooltip
                          key={window}
                          title={
                            forecast ? (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {area} - {window}
                                </Typography>
                                <Typography variant="caption">
                                  <br />
                                  Risk Level: {riskLevel.toUpperCase()}
                                </Typography>
                                {forecast.headwayBreachProbability !== undefined && (
                                  <Typography variant="caption">
                                    <br />
                                    Headway Breach Probability:{' '}
                                    {(forecast.headwayBreachProbability * 100).toFixed(0)}%
                                  </Typography>
                                )}
                                {forecast.happyScoreBelowThresholdProbability !== undefined && (
                                  <Typography variant="caption">
                                    <br />
                                    Happy Score &lt; 85 Probability:{' '}
                                    {(forecast.happyScoreBelowThresholdProbability * 100).toFixed(0)}%
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              'No data'
                            )
                          }
                        >
                          <Box
                            sx={{
                              flex: 1,
                              bgcolor: color,
                              opacity: intensity,
                              height: 40,
                              border: '1px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: Math.min(1.0, intensity + 0.2),
                              },
                            }}
                          />
                        </Tooltip>
                      )
                    })}
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: '#4caf50',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption">Low Risk</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: '#ff9800',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption">Medium Risk</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: '#f44336',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption">High Risk</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default RiskForecast

