/**
 * Historical Task List - Display historical tasks from CSV
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
  CircularProgress,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
} from '@mui/material'
import { Sort } from '@mui/icons-material'
import { useState, useMemo, useCallback } from 'react'
import { useData } from '../../hooks/useData'
import { Task, TaskPriority, TaskState } from '../../types'
import { format } from 'date-fns'

interface HistoricalTaskListProps {
  tasks: Task[]
  crewNameMap: Map<string, string>
  taskTitleMap: Map<string, string>
  taskDateStringMap: Map<string, string>
  selectedDate: string | null
}

type SortField = 'id' | 'type' | 'washroom' | 'priority' | 'state' | 'crew' | 'created'
type SortDirection = 'asc' | 'desc'

function HistoricalTaskList({ tasks, crewNameMap, taskTitleMap, taskDateStringMap, selectedDate }: HistoricalTaskListProps) {
  const { washrooms } = useData()

  // Filters
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [washroomFilter, setWashroomFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([])
  const [stateFilter, setStateFilter] = useState<TaskState[]>([])
  const [crewFilter, setCrewFilter] = useState<string[]>([])

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Helper functions
  const getCrewName = useCallback(
    (crewId?: string) => {
      if (!crewId) return 'Unassigned'
      return crewNameMap.get(crewId) || crewId
    },
    [crewNameMap]
  )

  const getWashroomName = useCallback(
    (washroomId: string) => {
      const washroom = washrooms.find((w) => w.id === washroomId)
      return washroom?.name || washroomId
    },
    [washrooms]
  )

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
      // Type filter
      if (typeFilter.length > 0) {
        const title = taskTitleMap.get(task.id) || ''
        if (!typeFilter.includes(title)) {
          return false
        }
      }

      // Washroom filter
      if (washroomFilter.length > 0) {
        if (!washroomFilter.includes(task.washroomId)) {
          return false
        }
      }

      // Priority filter
      if (priorityFilter.length > 0) {
        if (!priorityFilter.includes(task.priority)) {
          return false
        }
      }

      // State filter
      if (stateFilter.length > 0) {
        if (!stateFilter.includes(task.state)) {
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
        case 'id':
          comparison = parseInt(a.id) - parseInt(b.id)
          break
        case 'type':
          const aType = taskTitleMap.get(a.id) || ''
          const bType = taskTitleMap.get(b.id) || ''
          comparison = aType.localeCompare(bType)
          break
        case 'washroom':
          const aWashroom = getWashroomName(a.washroomId)
          const bWashroom = getWashroomName(b.washroomId)
          comparison = aWashroom.localeCompare(bWashroom)
          break
        case 'priority':
          const priorityOrder: { [key: string]: number } = {
            emergency: 0,
            high: 1,
            normal: 2,
          }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'state':
          comparison = a.state.localeCompare(b.state)
          break
        case 'crew':
          const aCrew = getCrewName(a.assignedCrewId)
          const bCrew = getCrewName(b.assignedCrewId)
          comparison = aCrew.localeCompare(bCrew)
          break
        case 'created':
          comparison = a.createdTime.getTime() - b.createdTime.getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [
    tasks,
    typeFilter,
    washroomFilter,
    priorityFilter,
    stateFilter,
    crewFilter,
    sortField,
    sortDirection,
    taskTitleMap,
    washrooms,
    crewNameMap,
    getCrewName,
    getWashroomName,
  ])

  const getStateColor = () => {
    return 'success' // All historical tasks are completed
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Historical Tasks
            {selectedDate && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({format(new Date(selectedDate), 'MMM d, yyyy')})
              </Typography>
            )}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({filteredAndSortedTasks.length} tasks)
            </Typography>
          </Typography>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
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
            <InputLabel>State</InputLabel>
            <Select
              multiple
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as TaskState[])}
              label="State"
            >
              <MenuItem value="completed">Completed</MenuItem>
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
              {uniqueCrew.map((crewId) => (
                <MenuItem key={crewId} value={crewId}>
                  {getCrewName(crewId)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            size="small"
            startIcon={<Sort />}
            onClick={() => {
              const fields: SortField[] = ['id', 'type', 'washroom', 'priority', 'state', 'crew', 'created']
              const currentIndex = fields.indexOf(sortField)
              const nextField = fields[(currentIndex + 1) % fields.length]
              setSortField(nextField)
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            }}
          >
            Sort: {sortField} ({sortDirection})
          </Button>

          {(typeFilter.length > 0 ||
            washroomFilter.length > 0 ||
            priorityFilter.length > 0 ||
            stateFilter.length > 0 ||
            crewFilter.length > 0) && (
            <Button
              size="small"
              onClick={() => {
                setTypeFilter([])
                setWashroomFilter([])
                setPriorityFilter([])
                setStateFilter([])
                setCrewFilter([])
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
                <TableCell>Created Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {selectedDate
                        ? `No tasks found for ${format(new Date(selectedDate), 'MMM d, yyyy')}${typeFilter.length > 0 || washroomFilter.length > 0 || priorityFilter.length > 0 || stateFilter.length > 0 || crewFilter.length > 0 ? ' matching filters' : ''}`
                        : 'Select a date to view historical tasks'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const washroom = washrooms.find((w) => w.id === task.washroomId)

                  return (
                    <TableRow key={task.id} hover>
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
                        <Chip label={task.priority} size="small" color="default" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.state.replace('_', ' ')}
                          size="small"
                          color={getStateColor() as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getCrewName(task.assignedCrewId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {taskDateStringMap.get(task.id) || format(task.createdTime, 'MMM d, HH:mm:ss')}
                        </Typography>
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

export default HistoricalTaskList

