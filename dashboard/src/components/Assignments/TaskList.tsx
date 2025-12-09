/**
 * Task List / Board - Tabular view of all tasks
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Button,
  Tooltip,
} from '@mui/material'
import {
  MoreVert,
  FilterList,
  Sort,
  Assignment,
  Warning,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Task, TaskState, TaskPriority, Crew } from '../../types'
import { format, formatDistanceToNow } from 'date-fns'
import { TASK_TIME_HORIZON_HOURS, CURRENT_DATE } from '../../constants'

interface TaskListProps {
  onTaskSelect?: (task: Task) => void
  onAssign?: (task: Task) => void
  onReassign?: (task: Task) => void
  onUnassign?: (task: Task) => void
  onCancel?: (task: Task, reason: string) => void
}

type SortField = 'sla' | 'created' | 'priority' | 'washroom'
type SortDirection = 'asc' | 'desc'

function TaskList({
  onTaskSelect,
  onAssign,
  onReassign,
  onUnassign,
  onCancel,
}: TaskListProps) {
  const { tasks, crew, washrooms } = useData()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Filters
  const [stateFilter, setStateFilter] = useState<TaskState[]>([])
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([])
  const [terminalFilter, setTerminalFilter] = useState<string[]>([])
  const [crewFilter, setCrewFilter] = useState<string[]>([])
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('sla')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Calculate time horizon
  const timeHorizonEnd = useMemo(() => {
    const now = new Date()
    now.setHours(now.getHours() + TASK_TIME_HORIZON_HOURS)
    return now
  }, [])

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Time horizon filter
      if (task.createdTime > timeHorizonEnd) return false

      // State filter
      if (stateFilter.length > 0 && !stateFilter.includes(task.state)) {
        return false
      }

      // Priority filter
      if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
        return false
      }

      // Terminal filter
      if (terminalFilter.length > 0) {
        const washroom = washrooms.find((w) => w.id === task.washroomId)
        if (!washroom || !terminalFilter.includes(washroom.terminal)) {
          return false
        }
      }

      // Crew filter
      if (crewFilter.length > 0) {
        if (!task.assignedCrewId || !crewFilter.includes(task.assignedCrewId)) {
          return false
        }
      }

      return true
    })

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'sla':
          const aSla = a.slaDeadline?.getTime() || Infinity
          const bSla = b.slaDeadline?.getTime() || Infinity
          comparison = aSla - bSla
          break
        case 'created':
          comparison = a.createdTime.getTime() - b.createdTime.getTime()
          break
        case 'priority':
          const priorityOrder: { [key: string]: number } = {
            emergency: 0,
            high: 1,
            normal: 2,
          }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'washroom':
          const aWashroom = washrooms.find((w) => w.id === a.washroomId)?.name || ''
          const bWashroom = washrooms.find((w) => w.id === b.washroomId)?.name || ''
          comparison = aWashroom.localeCompare(bWashroom)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [
    tasks,
    stateFilter,
    priorityFilter,
    terminalFilter,
    crewFilter,
    sortField,
    sortDirection,
    timeHorizonEnd,
    washrooms,
  ])

  const handleMenuOpen = (task: Task, event: React.MouseEvent<HTMLElement>) => {
    setSelectedTask(task)
    setAnchorEl({ ...anchorEl, [task.id]: event.currentTarget })
  }

  const handleMenuClose = (taskId: string) => {
    setAnchorEl({ ...anchorEl, [taskId]: null })
  }

  const getStateColor = (state: TaskState) => {
    switch (state) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'info'
      case 'overdue':
        return 'error'
      case 'assigned':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'emergency':
        return 'error'
      case 'high':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getSlaCountdown = (task: Task) => {
    if (!task.slaDeadline) return null
    const now = CURRENT_DATE
    const remaining = task.slaDeadline.getTime() - now.getTime()
    const minutes = Math.floor(remaining / (1000 * 60))
    
    if (minutes < 0) {
      return { text: `Overdue by ${Math.abs(minutes)}m`, color: 'error' as const }
    } else if (minutes < 30) {
      return { text: `${minutes}m remaining`, color: 'warning' as const }
    } else {
      return { text: formatDistanceToNow(task.slaDeadline, { addSuffix: true }), color: 'default' as const }
    }
  }

  const getCrewName = (crewId?: string) => {
    if (!crewId) return 'Unassigned'
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember?.name || crewId
  }

  const getWashroomName = (washroomId: string) => {
    const washroom = washrooms.find((w) => w.id === washroomId)
    return washroom?.name || washroomId
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Task List ({filteredAndSortedTasks.length} tasks)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>State</InputLabel>
              <Select
                multiple
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as TaskState[])}
                label="State"
              >
                <MenuItem value="unassigned">Unassigned</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                multiple
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority[])}
                label="Priority"
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={<Sort />}
              onClick={() => {
                const fields: SortField[] = ['sla', 'created', 'priority', 'washroom']
                const currentIndex = fields.indexOf(sortField)
                const nextField = fields[(currentIndex + 1) % fields.length]
                setSortField(nextField)
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
              }}
            >
              Sort: {sortField} ({sortDirection})
            </Button>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Task ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Washroom</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Assigned Crew</TableCell>
                <TableCell>SLA Deadline</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No tasks found matching filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const slaCountdown = getSlaCountdown(task)
                  const washroom = washrooms.find((w) => w.id === task.washroomId)

                  return (
                    <TableRow
                      key={task.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => onTaskSelect?.(task)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {task.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {task.type.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{getWashroomName(task.washroomId)}</Typography>
                          {washroom && (
                            <Typography variant="caption" color="text.secondary">
                              {washroom.terminal}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.state.replace('_', ' ')}
                          size="small"
                          color={getStateColor(task.state) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getCrewName(task.assignedCrewId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {task.slaDeadline ? (
                          <Box>
                            <Typography variant="body2">
                              {format(task.slaDeadline, 'MMM d, HH:mm')}
                            </Typography>
                            {slaCountdown && (
                              <Chip
                                label={slaCountdown.text}
                                size="small"
                                color={slaCountdown.color}
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No SLA
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(task.createdTime, 'MMM d, HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuOpen(task, e)
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl[task.id]}
                          open={Boolean(anchorEl[task.id])}
                          onClose={() => handleMenuClose(task.id)}
                        >
                          {task.state === 'unassigned' && onAssign && (
                            <MenuItem onClick={() => {
                              onAssign(task)
                              handleMenuClose(task.id)
                            }}>
                              <Assignment sx={{ mr: 1 }} fontSize="small" />
                              Assign
                            </MenuItem>
                          )}
                          {task.assignedCrewId && onReassign && (
                            <MenuItem onClick={() => {
                              onReassign(task)
                              handleMenuClose(task.id)
                            }}>
                              <Assignment sx={{ mr: 1 }} fontSize="small" />
                              Reassign
                            </MenuItem>
                          )}
                          {task.assignedCrewId && onUnassign && (
                            <MenuItem onClick={() => {
                              onUnassign(task)
                              handleMenuClose(task.id)
                            }}>
                              Unassign
                            </MenuItem>
                          )}
                          {task.state !== 'completed' && task.state !== 'cancelled' && onCancel && (
                            <MenuItem onClick={() => {
                              // TODO: Open cancel dialog with reason
                              handleMenuClose(task.id)
                            }}>
                              <Warning sx={{ mr: 1 }} fontSize="small" />
                              Cancel
                            </MenuItem>
                          )}
                        </Menu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default TaskList

