/**
 * Real-time Alerts List - All active incidents
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
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
} from '@mui/material'
import {
  MoreVert,
  Warning,
  Assignment,
  CheckCircle,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useData } from '../../hooks/useData'
import { EmergencyEvent } from '../../types'
import { updateEmergencyEvent, updateHappyScore, addActivityLogEntry } from '../../store/slices/dataSlice'
import { format, differenceInMinutes } from 'date-fns'
import { HAPPY_SCORE_THRESHOLD, CURRENT_DATE } from '../../constants'
import { calculateAverageHappyScore, isWashroomUnhappy } from '../../services/dataTransform'

interface AlertItem {
  id: string
  type: 'emergency' | 'unhappy' | 'sensor_anomaly'
  washroomId: string
  washroomName: string
  detectedAt: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  assignedCrewId?: string
  data: EmergencyEvent | { washroomId: string; happyScore: number }
}

function RealTimeAlerts() {
  const dispatch = useDispatch()
  const { emergencyEvents, washrooms, happyScores, crew } = useData()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [severityFilter, setSeverityFilter] = useState<string[]>([])

  const alerts = useMemo(() => {
    const alertItems: AlertItem[] = []

    // Add active emergency events
    emergencyEvents
      .filter((e) => e.status === 'active')
      .forEach((event) => {
        const washroom = washrooms.find((w) => w.id === event.washroomId)
        alertItems.push({
          id: event.id,
          type: 'emergency',
          washroomId: event.washroomId,
          washroomName: washroom?.name || event.washroomId,
          detectedAt: event.detectedAt,
          severity: event.severity,
          assignedCrewId: event.assignedCrewId,
          data: event,
        })
      })

    // Add unhappy washrooms (happy score < 85)
    washrooms.forEach((washroom) => {
      if (isWashroomUnhappy(washroom.id, happyScores)) {
        const avgScore = calculateAverageHappyScore(washroom.id, happyScores)
        if (avgScore !== null && avgScore < HAPPY_SCORE_THRESHOLD) {
          alertItems.push({
            id: `unhappy-${washroom.id}`,
            type: 'unhappy',
            washroomId: washroom.id,
            washroomName: washroom.name,
            detectedAt: CURRENT_DATE, // Use current time as detection
            severity: avgScore < 70 ? 'high' : avgScore < 80 ? 'medium' : 'low',
            data: { washroomId: washroom.id, happyScore: avgScore },
          })
        }
      }
    })

    // Filter alerts
    let filtered = alertItems
    if (typeFilter.length > 0) {
      filtered = filtered.filter((a) => typeFilter.includes(a.type))
    }
    if (severityFilter.length > 0) {
      filtered = filtered.filter((a) => severityFilter.includes(a.severity))
    }

    // Sort by severity and detection time
    filtered.sort((a, b) => {
      const severityOrder: { [key: string]: number } = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return b.detectedAt.getTime() - a.detectedAt.getTime()
    })

    return filtered
  }, [emergencyEvents, washrooms, happyScores, typeFilter, severityFilter])

  const handleMenuOpen = (alertId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [alertId]: event.currentTarget })
  }

  const handleMenuClose = (alertId: string) => {
    setAnchorEl({ ...anchorEl, [alertId]: null })
  }

  const handleAssign = (alert: AlertItem) => {
    // TODO: Implement assignment logic
    console.log('Assign alert', alert.id)
    handleMenuClose(alert.id)
  }

  const handleResolve = (alert: AlertItem) => {
    if (alert.type === 'emergency') {
      const event = alert.data as EmergencyEvent
      const updates: Partial<EmergencyEvent> = {
        status: 'resolved',
        resolutionTime: new Date(CURRENT_DATE.getTime() + 5 * 60 * 1000)
      }
      if (!event.firstResponseTime) {
        updates.firstResponseTime = new Date(CURRENT_DATE.getTime() + 1 * 60 * 1000)
      }
      dispatch(updateEmergencyEvent({ ...event, ...updates }))
      dispatch(addActivityLogEntry({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        userId: 'current-user',
        userName: 'Current User',
        actionType: 'emergency_resolved',
        affectedEntityType: 'washroom',
        affectedEntityId: alert.washroomId,
        details: { message: `Resolved emergency at ${alert.washroomName}` }
      }))
    } else {
      // Create a resolved emergency event for non-emergency alerts (e.g. unhappy washroom)
      // so it appears in incident history
      const newEvent: EmergencyEvent = {
        id: `resolved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alert.type === 'unhappy' ? 'unhappy_washroom' : 'other',
        washroomId: alert.washroomId,
        detectedAt: alert.detectedAt,
        source: 'sensor',
        severity: alert.severity,
        status: 'resolved',
        firstResponseTime: new Date(CURRENT_DATE.getTime() + 1 * 60 * 1000),
        resolutionTime: new Date(CURRENT_DATE.getTime() + 5 * 60 * 1000),
        assignedCrewId: alert.assignedCrewId
      }
      dispatch(updateEmergencyEvent(newEvent))

      // If it was an unhappy alert, reset the happy score so the alert disappears
      if (alert.type === 'unhappy') {
        dispatch(updateHappyScore({
          washroomId: alert.washroomId,
          score: 100,
          timestamp: new Date(CURRENT_DATE.getTime() + 2000),
          source: 'aggregated'
        }))
      }

      dispatch(addActivityLogEntry({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        userId: 'current-user',
        userName: 'Current User',
        actionType: 'emergency_resolved',
        affectedEntityType: 'washroom',
        affectedEntityId: alert.washroomId,
        details: { message: `Resolved alert (${alert.type}) at ${alert.washroomName}` }
      }))
    }
    handleMenuClose(alert.id)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getSlaProgress = (alert: AlertItem) => {
    if (alert.type !== 'emergency') return null

    const event = alert.data as EmergencyEvent
    const now = CURRENT_DATE
    const minutesSinceDetection = differenceInMinutes(now, alert.detectedAt)

    // SLA: 10 minutes for emergencies
    const slaMinutes = 10
    const progress = Math.min((minutesSinceDetection / slaMinutes) * 100, 100)

    return {
      minutesSinceDetection,
      slaMinutes,
      progress,
      isOverdue: minutesSinceDetection > slaMinutes,
    }
  }

  const getCrewName = (crewId?: string) => {
    if (!crewId) return 'Unassigned'
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember?.name || crewId
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Real-time Alerts ({alerts.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                multiple
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as string[])}
                label="Type"
              >
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="unhappy">Unhappy</MenuItem>
                <MenuItem value="sensor_anomaly">Sensor Anomaly</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                multiple
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as string[])}
                label="Severity"
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <List sx={{ maxHeight: 600, overflow: 'auto' }}>
          {alerts.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No active alerts"
                secondary="All systems operating normally"
              />
            </ListItem>
          ) : (
            alerts.map((alert) => {
              const slaProgress = getSlaProgress(alert)

              return (
                <ListItem
                  key={alert.id}
                  sx={{
                    borderLeft: `4px solid ${alert.severity === 'critical' || alert.severity === 'high'
                      ? '#D32F2F'
                      : alert.severity === 'medium'
                        ? '#ED6C02'
                        : '#FFC107'
                      }`,
                    mb: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    {alert.type === 'emergency' ? (
                      <Warning color="error" />
                    ) : (
                      <Warning color="warning" />
                    )}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {alert.washroomName}
                        </Typography>
                        <Chip
                          label={alert.type.replace('_', ' ')}
                          size="small"
                          color={alert.type === 'emergency' ? 'error' : 'warning'}
                        />
                        <Chip
                          label={alert.severity}
                          size="small"
                          color={getSeverityColor(alert.severity) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {alert.type === 'emergency' && (
                          <Typography variant="body2" color="text.secondary">
                            Emergency: {(alert.data as EmergencyEvent).type.replace('_', ' ')}
                          </Typography>
                        )}
                        {alert.type === 'unhappy' && (
                          <Typography variant="body2" color="text.secondary">
                            Happy Score: {((alert.data as any).happyScore || 0).toFixed(1)} / {HAPPY_SCORE_THRESHOLD}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Detected: {format(alert.detectedAt, 'MMM d, HH:mm')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Assigned: {getCrewName(alert.assignedCrewId)}
                          </Typography>
                        </Box>
                        {slaProgress && (
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Response Time
                              </Typography>
                              <Typography
                                variant="caption"
                                color={slaProgress.isOverdue ? 'error.main' : 'inherit'}
                                sx={{ fontWeight: 500 }}
                              >
                                {slaProgress.minutesSinceDetection}m / {slaProgress.slaMinutes}m
                                {slaProgress.isOverdue && ' (OVERDUE)'}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={slaProgress.progress}
                              color={slaProgress.isOverdue ? 'error' : 'warning'}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(alert.id, e)}
                  >
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl[alert.id]}
                    open={Boolean(anchorEl[alert.id])}
                    onClose={() => handleMenuClose(alert.id)}
                  >
                    <MenuItem onClick={() => handleAssign(alert)}>
                      <Assignment sx={{ mr: 1 }} fontSize="small" />
                      Assign to crew
                    </MenuItem>
                    <MenuItem onClick={() => handleResolve(alert)}>
                      <CheckCircle sx={{ mr: 1 }} fontSize="small" />
                      Resolve
                    </MenuItem>
                  </Menu>
                </ListItem>
              )
            })
          )}
        </List>
      </CardContent>
    </Card>
  )
}

export default RealTimeAlerts

