/**
 * Incoming Demand Panel - Stream of new tasks and incidents
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
} from '@mui/material'
import {
  MoreVert,
  Assignment,
  Warning,
  CheckCircle,
  Snooze,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../hooks/useData'
import { Task, EmergencyEvent, TaskPriority } from '../../types'
import { updateTask, updateEmergencyEvent, addActivityLogEntry } from '../../store/slices/dataSlice'
import { format } from 'date-fns'

interface DemandItem {
  id: string
  type: 'task' | 'emergency'
  priority: TaskPriority | 'critical'
  washroomId: string
  washroomName: string
  timestamp: Date
  data: Task | EmergencyEvent
}

function IncomingDemandPanel() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { tasks, emergencyEvents, washrooms } = useData()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'location'>('time')

  const demandItems = useMemo(() => {
    const items: DemandItem[] = []

    // Add unassigned and assigned tasks
    tasks
      .filter((t) => t.state === 'unassigned' || t.state === 'assigned')
      .forEach((task) => {
        const washroom = washrooms.find((w) => w.id === task.washroomId)
        items.push({
          id: task.id,
          type: 'task',
          priority: task.priority,
          washroomId: task.washroomId,
          washroomName: washroom?.name || task.washroomId,
          timestamp: task.createdTime,
          data: task,
        })
      })

    // Add active emergencies
    emergencyEvents
      .filter((e) => e.status === 'active')
      .forEach((event) => {
        const washroom = washrooms.find((w) => w.id === event.washroomId)
        items.push({
          id: event.id,
          type: 'emergency',
          priority: 'critical',
          washroomId: event.washroomId,
          washroomName: washroom?.name || event.washroomId,
          timestamp: event.detectedAt,
          data: event,
        })
      })

    // Sort items
    items.sort((a, b) => {
      if (sortBy === 'time') {
        return b.timestamp.getTime() - a.timestamp.getTime()
      } else if (sortBy === 'priority') {
        const priorityOrder: { [key: string]: number } = {
          critical: 0,
          emergency: 1,
          high: 2,
          normal: 3,
        }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      } else {
        return a.washroomName.localeCompare(b.washroomName)
      }
    })

    return items
  }, [tasks, emergencyEvents, washrooms, sortBy])

  const handleMenuOpen = (itemId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [itemId]: event.currentTarget })
  }

  const handleMenuClose = (itemId: string) => {
    setAnchorEl({ ...anchorEl, [itemId]: null })
  }

  const handleAssign = (item: DemandItem) => {
    // TODO: Implement assignment logic
    console.log('Assign', item)
    handleMenuClose(item.id)
  }

  const handleResolve = (item: DemandItem) => {
    if (item.type === 'emergency') {
      const event = item.data as EmergencyEvent
      dispatch(updateEmergencyEvent({ ...event, status: 'resolved', resolutionTime: new Date() }))
      dispatch(addActivityLogEntry({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        userId: 'current-user',
        userName: 'Current User',
        actionType: 'emergency_resolved',
        affectedEntityType: 'washroom',
        affectedEntityId: item.washroomId,
        details: { message: `Resolved emergency at ${item.washroomName}` }
      }))
    } else {
      const task = item.data as Task
      dispatch(updateTask({ ...task, state: 'completed', completedTime: new Date() }))
      dispatch(addActivityLogEntry({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        userId: 'current-user',
        userName: 'Current User',
        actionType: 'task_completed',
        affectedEntityType: 'task',
        affectedEntityId: task.id,
        details: { message: `Completed task at ${item.washroomName}` }
      }))
    }
    handleMenuClose(item.id)
  }

  const handleSnooze = (item: DemandItem) => {
    // TODO: Implement snooze logic
    console.log('Snooze', item)
    handleMenuClose(item.id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'emergency':
        return 'error'
      case 'high':
        return 'warning'
      default:
        return 'default'
    }
  }

  const handleItemClick = (item: DemandItem) => {
    if (item.type === 'emergency') {
      navigate(`/incidents-alerts?search=${item.id}`)
    } else if (item.type === 'task') {
      navigate(`/assignments?search=${item.id}`)
    }
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Events
          </Typography>
          <Box>
            <Button
              size="small"
              variant={sortBy === 'time' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('time')}
              sx={{ mr: 1 }}
            >
              Time
            </Button>
            <Button
              size="small"
              variant={sortBy === 'priority' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('priority')}
              sx={{ mr: 1 }}
            >
              Priority
            </Button>
            <Button
              size="small"
              variant={sortBy === 'location' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('location')}
            >
              Location
            </Button>
          </Box>
        </Box>

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {demandItems.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No incoming demand"
                secondary="All tasks are assigned and no active emergencies"
              />
            </ListItem>
          ) : (
            demandItems.map((item) => (
              <ListItem
                key={item.id}
                button
                onClick={() => handleItemClick(item)}
                sx={{
                  borderLeft: `4px solid ${item.priority === 'critical' || item.priority === 'emergency'
                    ? '#D32F2F'
                    : item.priority === 'high'
                      ? '#ED6C02'
                      : '#7B2CBF'
                    }`,
                  mb: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ mr: 2 }}>
                  {item.type === 'emergency' ? (
                    <Warning color="error" />
                  ) : (
                    <Assignment color="primary" />
                  )}
                </Box>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {item.washroomName}
                      </Typography>
                      <Chip
                        label={item.priority}
                        size="small"
                        color={getPriorityColor(item.priority) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.type === 'emergency'
                          ? `Emergency: ${(item.data as EmergencyEvent).type.replace('_', ' ')}`
                          : `Task: ${(item.data as Task).type.replace('_', ' ')}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(item.timestamp, 'MMM d, HH:mm')}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMenuOpen(item.id, e)
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl[item.id]}
                    open={Boolean(anchorEl[item.id])}
                    onClose={() => handleMenuClose(item.id)}
                  >
                    <MenuItem onClick={() => handleAssign(item)}>
                      <Assignment sx={{ mr: 1 }} fontSize="small" />
                      Assign to crew
                    </MenuItem>
                    <MenuItem onClick={() => handleResolve(item)}>
                      <CheckCircle sx={{ mr: 1 }} fontSize="small" />
                      Resolve
                    </MenuItem>
                    {item.type === 'task' && (
                      <MenuItem onClick={() => handleSnooze(item)}>
                        <Snooze sx={{ mr: 1 }} fontSize="small" />
                        Snooze
                      </MenuItem>
                    )}
                  </Menu>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </CardContent>
    </Card>
  )
}

export default IncomingDemandPanel

