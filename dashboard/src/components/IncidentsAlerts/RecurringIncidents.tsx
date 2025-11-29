/**
 * Recurring Incident Detection - Highlight washrooms with repeated incidents
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material'
import { Warning, TrendingUp } from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { EmergencyEvent } from '../../types'
import { differenceInHours } from 'date-fns'

interface RecurringIncidentInfo {
  washroomId: string
  washroomName: string
  incidentCount: number
  lastIncident: Date
  incidents: EmergencyEvent[]
}

function RecurringIncidents() {
  const { emergencyEvents, washrooms } = useData()
  const now = new Date()
  const hoursWindow = 48 // Last 48 hours

  const recurringIncidents = useMemo(() => {
    const washroomMap = new Map<string, EmergencyEvent[]>()

    // Group incidents by washroom within the time window
    emergencyEvents.forEach((event) => {
      const hoursAgo = differenceInHours(now, event.detectedAt)
      if (hoursAgo <= hoursWindow) {
        if (!washroomMap.has(event.washroomId)) {
          washroomMap.set(event.washroomId, [])
        }
        washroomMap.get(event.washroomId)!.push(event)
      }
    })

    // Find washrooms with multiple incidents
    const recurring: RecurringIncidentInfo[] = []
    washroomMap.forEach((incidents, washroomId) => {
      if (incidents.length >= 3) {
        // Threshold: 3+ incidents in 48 hours
        const washroom = washrooms.find((w) => w.id === washroomId)
        recurring.push({
          washroomId,
          washroomName: washroom?.name || washroomId,
          incidentCount: incidents.length,
          lastIncident: incidents.sort(
            (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
          )[0].detectedAt,
          incidents,
        })
      }
    })

    // Sort by incident count (highest first)
    recurring.sort((a, b) => b.incidentCount - a.incidentCount)

    return recurring
  }, [emergencyEvents, washrooms, now])

  const getSeverityLevel = (count: number) => {
    if (count >= 7) return { level: 'critical', color: 'error' as const }
    if (count >= 5) return { level: 'high', color: 'error' as const }
    return { level: 'medium', color: 'warning' as const }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Recurring Incidents
        </Typography>

        {recurringIncidents.length === 0 ? (
          <Alert severity="success">
            No recurring incidents detected in the last 48 hours
          </Alert>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {recurringIncidents.length} washroom{recurringIncidents.length > 1 ? 's' : ''} with
              repeated incidents detected
            </Alert>
            <List>
              {recurringIncidents.map((info) => {
                const severity = getSeverityLevel(info.incidentCount)
                const incidentTypes = new Set(
                  info.incidents.map((i) => i.type.replace('_', ' '))
                )

                return (
                  <ListItem
                    key={info.washroomId}
                    sx={{
                      borderLeft: `4px solid ${
                        severity.color === 'error' ? '#D32F2F' : '#ED6C02'
                      }`,
                      mb: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ mr: 2 }}>
                      <TrendingUp color={severity.color} />
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {info.washroomName}
                          </Typography>
                          <Chip
                            label={`${info.incidentCount} incidents`}
                            size="small"
                            color={severity.color}
                            icon={<Warning />}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Last incident: {info.lastIncident.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Types: {Array.from(incidentTypes).join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default RecurringIncidents

