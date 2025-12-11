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
  InputAdornment,
} from '@mui/material'
import { Search, Clear } from '@mui/icons-material'
import {
  MoreVert,
  FilterList,
  Sort,
  Assignment,
  Warning,
  Add,
  Delete,
} from '@mui/icons-material'
import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../../hooks/useData'
import { Task, TaskState, TaskPriority, Crew } from '../../types'
import { format, formatDistanceToNow } from 'date-fns'
import { TASK_TIME_HORIZON_HOURS, CURRENT_DATE } from '../../constants'

interface TaskListProps {
  tasks?: Task[] // Optional: if provided, use these instead of useData tasks
  taskTitleMap?: Map<string, string> // Map of task ID to title from CSV
  onTaskSelect?: (task: Task) => void
  onAssign?: (task: Task) => void
  onReassign?: (task: Task) => void
  onUnassign?: (task: Task) => void
  onCancel?: (task: Task, reason: string) => void
  onDelete?: (task: Task) => void
  onAdd?: () => void
}

type SortField = 'sla' | 'created' | 'priority' | 'washroom'
type SortDirection = 'asc' | 'desc'

function TaskList({
  tasks: tasksProp,
  taskTitleMap: taskTitleMapProp,
  onTaskSelect,
  onAssign,
  onReassign,
  onUnassign,
  onCancel,
  onDelete,
  onAdd,
}: TaskListProps) {
  const location = useLocation()
  const { tasks: tasksFromData, crew, washrooms } = useData()
  const tasks = tasksProp || tasksFromData
  const taskTitleMap = taskTitleMapProp || new Map<string, string>()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [stateFilter, setStateFilter] = useState<TaskState[]>([])
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([])
  const [terminalFilter, setTerminalFilter] = useState<string[]>([])
  const [washroomFilter, setWashroomFilter] = useState<string[]>([])
  const [crewFilter, setCrewFilter] = useState<string[]>([])
  const [taskIdFilter, setTaskIdFilter] = useState<string>('')

  // Parse search query
  const searchParams = new URLSearchParams(location.search)
  const searchId = searchParams.get('search')

  // Auto-filter by search ID if present
  useEffect(() => {
    if (searchId) {
      setTaskIdFilter(searchId)
    }
  }, [searchId])

  // Sorting
  const [sortField, setSortField] = useState<SortField>('sla')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Calculate time horizon
  const timeHorizonEnd = useMemo(() => {
    const now = new Date()
    now.setHours(now.getHours() + TASK_TIME_HORIZON_HOURS)
    return now
  }, [])

  // Get unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>()
    tasks.forEach((task) => {
      const title = taskTitleMap.get(task.id)
      if (title) types.add(title)
    })
    return Array.from(types).sort()
  }, [tasks, taskTitleMap])

  const uniqueWashrooms = useMemo(() => {
    const washroomIds = new Set<string>()
    tasks.forEach((task) => washroomIds.add(task.washroomId))
    return Array.from(washroomIds).sort()
  }, [tasks])

  const uniqueTerminals = useMemo(() => {
    const terminals = new Set<string>()
    tasks.forEach((task) => {
      const washroom = washrooms.find((w) => w.id === task.washroomId)
      if (washroom?.terminal) terminals.add(washroom.terminal)
    })
    return Array.from(terminals).sort()
  }, [tasks, washrooms])

  const uniqueCrew = useMemo(() => {
    const crewIds = new Set<string>()
    tasks.forEach((task) => {
      if (task.assignedCrewId) crewIds.add(task.assignedCrewId)
    })
    return Array.from(crewIds).sort()
  }, [tasks])

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Time horizon filter
      if (task.createdTime > timeHorizonEnd) return false

      // Type filter (by title from CSV)
      if (typeFilter.length > 0) {
        const title = taskTitleMap.get(task.id) || ''
        if (!typeFilter.includes(title)) {
          return false
        }
      }

      // Task ID filter (search)
      if (taskIdFilter) {
        if (!task.id.toLowerCase().includes(taskIdFilter.toLowerCase())) {
          return false
        }
      }

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

      // Washroom filter
      if (washroomFilter.length > 0) {
        if (!washroomFilter.includes(task.washroomId)) {
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
    typeFilter,
    taskIdFilter,
    stateFilter,
    priorityFilter,
    terminalFilter,
    washroomFilter,
    crewFilter,
    sortField,
    sortDirection,
    timeHorizonEnd,
    washrooms,
    taskTitleMap,
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
            {onAdd && (
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={onAdd}
              >
                Add Task
              </Button>
            )}
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

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search Task ID"
            value={taskIdFilter}
            onChange={(e) => setTaskIdFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: taskIdFilter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setTaskIdFilter('')}
                    edge="end"
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              multiple
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as string[])}
              label="Type"
            >
              {uniqueTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
              <MenuItem value="cancelled">Cancelled</MenuItem>
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

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Terminal</InputLabel>
            <Select
              multiple
              value={terminalFilter}
              onChange={(e) => setTerminalFilter(e.target.value as string[])}
              label="Terminal"
            >
              {uniqueTerminals.map((terminal) => (
                <MenuItem key={terminal} value={terminal}>
                  {terminal}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Washroom</InputLabel>
            <Select
              multiple
              value={washroomFilter}
              onChange={(e) => setWashroomFilter(e.target.value as string[])}
              label="Washroom"
            >
              {uniqueWashrooms.map((washroomId) => (
                <MenuItem key={washroomId} value={washroomId}>
                  {getWashroomName(washroomId)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Crew</InputLabel>
            <Select
              multiple
              value={crewFilter}
              onChange={(e) => setCrewFilter(e.target.value as string[])}
              label="Crew"
            >
              {uniqueCrew.map((crewId) => {
                const crewMember = crew.find((c) => c.id === crewId)
                return (
                  <MenuItem key={crewId} value={crewId}>
                    {crewMember?.name || crewId}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {(typeFilter.length > 0 ||
            stateFilter.length > 0 ||
            priorityFilter.length > 0 ||
            terminalFilter.length > 0 ||
            washroomFilter.length > 0 ||
            crewFilter.length > 0 ||
            taskIdFilter) && (
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={() => {
                  setTypeFilter([])
                  setStateFilter([])
                  setPriorityFilter([])
                  setTerminalFilter([])
                  setWashroomFilter([])
                  setCrewFilter([])
                  setTaskIdFilter('')
                }}
              >
                Clear Filters
              </Button>
            )}
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
                      {typeFilter.length > 0 ||
                        stateFilter.length > 0 ||
                        priorityFilter.length > 0 ||
                        terminalFilter.length > 0 ||
                        washroomFilter.length > 0 ||
                        crewFilter.length > 0 ||
                        taskIdFilter
                        ? 'No tasks found matching filters'
                        : 'No tasks available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const slaCountdown = getSlaCountdown(task)
                  const washroom = washrooms.find((w) => w.id === task.washroomId)
                  const isHighlighted = task.id === searchId

                  return (
                    <TableRow
                      key={task.id}
                      hover
                      ref={(el) => {
                        if (isHighlighted && el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isHighlighted ? 'action.selected' : undefined,
                        border: isHighlighted ? '2px solid #1976d2' : undefined,
                      }}
                      onClick={() => onTaskSelect?.(task)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {task.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {taskTitleMap.get(task.id) || task.type.replace('_', ' ')}
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
                              // Open cancel dialog - handled by parent component
                              onCancel(task, '')
                              handleMenuClose(task.id)
                            }}>
                              <Warning sx={{ mr: 1 }} fontSize="small" />
                              Cancel
                            </MenuItem>
                          )}
                          {onDelete && (
                            <MenuItem
                              onClick={() => {
                                onDelete(task)
                                handleMenuClose(task.id)
                              }}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete sx={{ mr: 1 }} fontSize="small" />
                              Delete
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

