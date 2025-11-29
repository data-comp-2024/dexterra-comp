/**
 * Crew Strip / Roster Overview - List of all on-shift crew
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
} from '@mui/material'
import {
  Person,
  Schedule,
  AccessTime,
} from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Crew, CrewStatus } from '../../types'
import { format, formatDistanceToNow } from 'date-fns'

function CrewStrip() {
  const { crew, tasks, washrooms } = useData()

  const onShiftCrew = useMemo(() => {
    return crew.filter(
      (c) => c.status === 'on_shift' || c.status === 'available' || c.status === 'busy'
    )
  }, [crew])

  const getCrewTaskInfo = (crewMember: Crew) => {
    const currentTask = crewMember.currentTaskId
      ? tasks.find((t) => t.id === crewMember.currentTaskId)
      : null

    const nextTask = crewMember.nextTaskId
      ? tasks.find((t) => t.id === crewMember.nextTaskId)
      : null

    const currentTaskWashroom = currentTask
      ? washrooms.find((w) => w.id === currentTask.washroomId)
      : null

    const nextTaskWashroom = nextTask
      ? washrooms.find((w) => w.id === nextTask.washroomId)
      : null

    // Calculate ETA for current task
    let etaToCompletion: string | null = null
    if (currentTask && currentTask.startedTime && currentTask.estimatedDurationMinutes) {
      const completionTime = new Date(
        currentTask.startedTime.getTime() +
          currentTask.estimatedDurationMinutes * 60 * 1000
      )
      const now = new Date()
      if (completionTime > now) {
        const minutesRemaining = Math.ceil(
          (completionTime.getTime() - now.getTime()) / (1000 * 60)
        )
        etaToCompletion = `${minutesRemaining}m`
      } else {
        etaToCompletion = 'Due'
      }
    }

    return {
      currentTask,
      nextTask,
      currentTaskWashroom,
      nextTaskWashroom,
      etaToCompletion,
    }
  }

  const getStatusColor = (status: CrewStatus) => {
    switch (status) {
      case 'available':
        return 'success'
      case 'busy':
        return 'warning'
      case 'on_break':
        return 'info'
      case 'unavailable':
        return 'error'
      default:
        return 'default'
    }
  }

  const getTimeSinceLastBreak = (crewMember: Crew) => {
    if (crewMember.lastBreakEnd) {
      return formatDistanceToNow(crewMember.lastBreakEnd, { addSuffix: false })
    }
    return 'N/A'
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Crew Roster ({onShiftCrew.length} on shift)
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 8,
            },
          }}
        >
          {onShiftCrew.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No crew members on shift
            </Typography>
          ) : (
            onShiftCrew.map((crewMember) => {
              const taskInfo = getCrewTaskInfo(crewMember)
              const initials = crewMember.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()

              return (
                <Card
                  key={crewMember.id}
                  sx={{
                    minWidth: 280,
                    maxWidth: 280,
                    border: `2px solid ${
                      crewMember.status === 'available'
                        ? '#06A77D'
                        : crewMember.status === 'busy'
                        ? '#ED6C02'
                        : '#7B2CBF'
                    }`,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40,
                          mr: 1.5,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {crewMember.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {crewMember.role}
                        </Typography>
                      </Box>
                      <Chip
                        label={crewMember.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(crewMember.status) as any}
                      />
                    </Box>

                    {taskInfo.currentTask ? (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Current Task
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {taskInfo.currentTaskWashroom?.name || taskInfo.currentTask.washroomId}
                          </Typography>
                          {taskInfo.etaToCompletion && (
                            <Chip
                              label={taskInfo.etaToCompletion}
                              size="small"
                              icon={<AccessTime />}
                            />
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          No current task
                        </Typography>
                      </Box>
                    )}

                    {taskInfo.nextTask && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Next Task
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule fontSize="small" />
                          <Typography variant="body2">
                            {taskInfo.nextTaskWashroom?.name || taskInfo.nextTask.washroomId}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Time since last break
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {getTimeSinceLastBreak(crewMember)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          Shift
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {format(crewMember.shift.startTime, 'HH:mm')} - {format(crewMember.shift.endTime, 'HH:mm')}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default CrewStrip

