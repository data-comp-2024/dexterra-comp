/**
 * Airport Map - Simplified visual map with washroom status
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import {
  calculateHeadway,
  calculateAverageHappyScore,
  isWashroomUnhappy,
} from '../../services/dataTransform'
import { HAPPY_SCORE_THRESHOLD } from '../../constants'
import { format } from 'date-fns'

interface WashroomStatus {
  washroomId: string
  status: 'clean' | 'due_soon' | 'overdue' | 'emergency' | 'closed'
  headway?: ReturnType<typeof calculateHeadway>
  happyScore?: number
  activeTasks: number
}

function AirportMap() {
  const { washrooms, tasks, emergencyEvents, happyScores } = useData()
  const [selectedWashroom, setSelectedWashroom] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'priority' | 'all'>('priority')
  const [terminalFilter, setTerminalFilter] = useState<string>('all')

  const washroomStatuses = useMemo(() => {
    let statuses = washrooms.map((washroom): WashroomStatus => {
      const headway = calculateHeadway(washroom.id, tasks)
      const happyScore = calculateAverageHappyScore(washroom.id, happyScores)
      const activeEmergency = emergencyEvents.find(
        (e) => e.washroomId === washroom.id && e.status === 'active'
      )
      const activeTasksCount = tasks.filter(
        (t) =>
          t.washroomId === washroom.id &&
          (t.state === 'assigned' || t.state === 'in_progress')
      ).length

      let status: WashroomStatus['status'] = 'clean'

      if (washroom.status === 'closed' || washroom.status === 'inactive') {
        status = 'closed'
      } else if (activeEmergency) {
        status = 'emergency'
      } else if (headway && !headway.isWithinSLA) {
        status = 'overdue'
      } else if (
        headway &&
        headway.headwayMinutes > headway.slaMinutes * 0.8
      ) {
        status = 'due_soon'
      } else if (happyScore !== null && happyScore < HAPPY_SCORE_THRESHOLD) {
        status = 'overdue'
      }

      return {
        washroomId: washroom.id,
        status,
        headway: headway || undefined,
        happyScore: happyScore || undefined,
        activeTasks: activeTasksCount,
      }
    })

    // Filter by terminal if selected
    if (terminalFilter !== 'all') {
      statuses = statuses.filter((status) => {
        const washroom = washrooms.find((w) => w.id === status.washroomId)
        return washroom?.terminal === terminalFilter
      })
    }

    // Filter by priority mode: show only washrooms that need attention
    if (filterMode === 'priority') {
      statuses = statuses.filter((status) => {
        return (
          status.status === 'emergency' ||
          status.status === 'overdue' ||
          status.status === 'due_soon' ||
          status.activeTasks > 0
        )
      })
      // If we have less than 10 priority washrooms, add some clean ones to fill the map
      if (statuses.length < 10) {
        const cleanStatuses = washrooms
          .map((washroom): WashroomStatus => {
            const headway = calculateHeadway(washroom.id, tasks)
            const happyScore = calculateAverageHappyScore(washroom.id, happyScores)
            const activeEmergency = emergencyEvents.find(
              (e) => e.washroomId === washroom.id && e.status === 'active'
            )
            const activeTasksCount = tasks.filter(
              (t) =>
                t.washroomId === washroom.id &&
                (t.state === 'assigned' || t.state === 'in_progress')
            ).length

            let status: WashroomStatus['status'] = 'clean'

            if (washroom.status === 'closed' || washroom.status === 'inactive') {
              status = 'closed'
            } else if (activeEmergency) {
              status = 'emergency'
            } else if (headway && !headway.isWithinSLA) {
              status = 'overdue'
            } else if (
              headway &&
              headway.headwayMinutes > headway.slaMinutes * 0.8
            ) {
              status = 'due_soon'
            } else if (happyScore !== null && happyScore < HAPPY_SCORE_THRESHOLD) {
              status = 'overdue'
            }

            return {
              washroomId: washroom.id,
              status,
              headway: headway || undefined,
              happyScore: happyScore || undefined,
              activeTasks: activeTasksCount,
            }
          })
          .filter((s) => s.status === 'clean' && s.activeTasks === 0)
          .slice(0, 10 - statuses.length)

        statuses = [...statuses, ...cleanStatuses]
      }
    }

    // Limit to maximum 30 washrooms to avoid overcrowding
    return statuses.slice(0, 30)
  }, [washrooms, tasks, emergencyEvents, happyScores, filterMode, terminalFilter])

  const getStatusColor = (status: WashroomStatus['status']) => {
    switch (status) {
      case 'clean':
        return '#06A77D' // Green
      case 'due_soon':
        return '#FFC107' // Yellow
      case 'overdue':
        return '#ED6C02' // Orange
      case 'emergency':
        return '#D32F2F' // Red
      case 'closed':
        return '#9E9E9E' // Gray
      default:
        return '#7B2CBF' // Purple
    }
  }

  const selectedWashroomData = selectedWashroom
    ? washrooms.find((w) => w.id === selectedWashroom)
    : null

  const selectedStatus = selectedWashroom
    ? washroomStatuses.find((s) => s.washroomId === selectedWashroom)
    : null

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Airport Map
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Terminal</InputLabel>
                <Select
                  value={terminalFilter}
                  onChange={(e) => setTerminalFilter(e.target.value)}
                  label="Terminal"
                >
                  <MenuItem value="all">All</MenuItem>
                  {Array.from(new Set(washrooms.map((w) => w.terminal))).map((term) => (
                    <MenuItem key={term} value={term}>
                      {term}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ToggleButtonGroup
                value={filterMode}
                exclusive
                onChange={(_, value) => value && setFilterMode(value)}
                size="small"
              >
                <ToggleButton value="priority">Priority Only</ToggleButton>
                <ToggleButton value="all">All</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Box
            sx={{
              position: 'relative',
              minHeight: 400,
              bgcolor: 'background.default',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
              p: 2,
            }}
          >
            {/* Simplified map visualization */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                justifyContent: 'center',
              }}
            >
              {washroomStatuses.map((status) => {
                const washroom = washrooms.find((w) => w.id === status.washroomId)
                if (!washroom) return null

                return (
                  <Tooltip
                    key={status.washroomId}
                    title={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {washroom.name}
                        </Typography>
                        <Typography variant="caption">
                          Status: {status.status.replace('_', ' ')}
                        </Typography>
                        {status.happyScore !== undefined && (
                          <Typography variant="caption" display="block">
                            Happy Score: {status.happyScore.toFixed(1)}
                          </Typography>
                        )}
                        {status.activeTasks > 0 && (
                          <Typography variant="caption" display="block">
                            Active Tasks: {status.activeTasks}
                          </Typography>
                        )}
                      </Box>
                    }
                    arrow
                  >
                    <Box
                      onClick={() => setSelectedWashroom(status.washroomId)}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        bgcolor: getStatusColor(status.status),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                        border: '2px solid white',
                        boxShadow: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          textAlign: 'center',
                        }}
                      >
                        {washroom.terminal}
                        <br />
                        {washroom.id.substring(0, 6)}
                      </Typography>
                    </Box>
                  </Tooltip>
                )
              })}
            </Box>

            {/* Legend */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#06A77D',
                  }}
                />
                <Typography variant="caption">Clean</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#FFC107',
                  }}
                />
                <Typography variant="caption">Due Soon</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#ED6C02',
                  }}
                />
                <Typography variant="caption">Overdue</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#D32F2F',
                  }}
                />
                <Typography variant="caption">Emergency</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#9E9E9E',
                  }}
                />
                <Typography variant="caption">Closed</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Washroom Detail Dialog */}
      <Dialog
        open={Boolean(selectedWashroom)}
        onClose={() => setSelectedWashroom(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedWashroomData && selectedStatus && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedWashroomData.name}</Typography>
                <Chip
                  label={selectedStatus.status.replace('_', ' ')}
                  color={
                    selectedStatus.status === 'clean'
                      ? 'success'
                      : selectedStatus.status === 'emergency'
                      ? 'error'
                      : selectedStatus.status === 'overdue'
                      ? 'warning'
                      : 'default'
                  }
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Terminal
                  </Typography>
                  <Typography variant="body1">{selectedWashroomData.terminal}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">{selectedWashroomData.type}</Typography>
                </Grid>
                {selectedStatus.happyScore !== undefined && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Happy Score
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        selectedStatus.happyScore >= HAPPY_SCORE_THRESHOLD
                          ? 'success.main'
                          : 'error.main'
                      }
                    >
                      {selectedStatus.happyScore.toFixed(1)} / {HAPPY_SCORE_THRESHOLD}
                    </Typography>
                  </Grid>
                )}
                {selectedStatus.headway && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Headway
                      </Typography>
                      <Typography
                        variant="body1"
                        color={
                          selectedStatus.headway.isWithinSLA ? 'success.main' : 'error.main'
                        }
                      >
                        {selectedStatus.headway.headwayMinutes.toFixed(1)}m /{' '}
                        {selectedStatus.headway.slaMinutes}m
                      </Typography>
                    </Grid>
                    {selectedStatus.headway.lastCompletedTime && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Last Cleaned
                        </Typography>
                        <Typography variant="body1">
                          {format(selectedStatus.headway.lastCompletedTime, 'MMM d, HH:mm')}
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Active Tasks
                  </Typography>
                  <Typography variant="body1">{selectedStatus.activeTasks}</Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedWashroom(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

export default AirportMap

