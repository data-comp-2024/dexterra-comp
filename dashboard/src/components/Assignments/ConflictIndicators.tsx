/**
 * Conflict/Overload Indicators - Highlight crew with issues
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
import { Warning, Error } from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Task, Crew } from '../../types'

interface ConflictInfo {
  crewId: string
  crewName: string
  issues: string[]
  severity: 'warning' | 'error'
}

function ConflictIndicators() {
  const { tasks, crew } = useData()

  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, ConflictInfo>()

    crew.forEach((crewMember) => {
      const crewTasks = tasks.filter(
        (t) =>
          t.assignedCrewId === crewMember.id &&
          (t.state === 'assigned' || t.state === 'in_progress')
      )

      if (crewTasks.length === 0) return

      const issues: string[] = []
      let severity: 'warning' | 'error' = 'warning'

      // Check for overlapping tasks
      const sortedTasks = crewTasks.sort(
        (a, b) =>
          (a.startedTime?.getTime() || a.createdTime.getTime()) -
          (b.startedTime?.getTime() || b.createdTime.getTime())
      )

      for (let i = 0; i < sortedTasks.length - 1; i++) {
        const currentTask = sortedTasks[i]
        const nextTask = sortedTasks[i + 1]

        const currentEnd = currentTask.completedTime
          ? currentTask.completedTime.getTime()
          : currentTask.startedTime
          ? currentTask.startedTime.getTime() +
            (currentTask.estimatedDurationMinutes || 30) * 60 * 1000
          : currentTask.createdTime.getTime() +
            (currentTask.estimatedDurationMinutes || 30) * 60 * 1000

        const nextStart = nextTask.startedTime
          ? nextTask.startedTime.getTime()
          : nextTask.createdTime.getTime()

        if (currentEnd > nextStart) {
          issues.push(
            `Tasks ${currentTask.id} and ${nextTask.id} overlap`
          )
          severity = 'error'
        }
      }

      // Check for excessive queued tasks
      const queuedTasks = crewTasks.filter((t) => t.state === 'assigned').length
      if (queuedTasks > 5) {
        issues.push(`${queuedTasks} tasks queued (recommended: ≤5)`)
        if (queuedTasks > 10) {
          severity = 'error'
        }
      }

      // Check for overdue tasks
      const overdueTasks = crewTasks.filter((t) => t.state === 'overdue').length
      if (overdueTasks > 0) {
        issues.push(`${overdueTasks} overdue task(s)`)
        severity = 'error'
      }

      if (issues.length > 0) {
        conflictMap.set(crewMember.id, {
          crewId: crewMember.id,
          crewName: crewMember.name,
          issues,
          severity,
        })
      }
    })

    return Array.from(conflictMap.values())
  }, [tasks, crew])

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Conflict Indicators
          </Typography>
          <Alert severity="success">No conflicts detected</Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Conflict Indicators ({conflicts.length})
        </Typography>
        <List>
          {conflicts.map((conflict) => (
            <ListItem
              key={conflict.crewId}
              sx={{
                borderLeft: `4px solid ${
                  conflict.severity === 'error' ? '#D32F2F' : '#ED6C02'
                }`,
                mb: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Box sx={{ mr: 2 }}>
                {conflict.severity === 'error' ? (
                  <Error color="error" />
                ) : (
                  <Warning color="warning" />
                )}
              </Box>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {conflict.crewName}
                    </Typography>
                    <Chip
                      label={conflict.severity}
                      size="small"
                      color={conflict.severity === 'error' ? 'error' : 'warning'}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    {conflict.issues.map((issue, index) => (
                      <Typography key={index} variant="body2" color="text.secondary">
                        • {issue}
                      </Typography>
                    ))}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

export default ConflictIndicators

