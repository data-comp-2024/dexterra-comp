import { useState, useEffect, useMemo } from 'react'
import {
  Typography,
  Box,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import TaskList from '../components/Assignments/TaskList'
import HistoricalTaskList from '../components/Assignments/HistoricalTaskList'
import ConflictIndicators from '../components/Assignments/ConflictIndicators'
import TaskDetailModal from '../components/Assignments/TaskDetailModal'
import AssignTaskDialog from '../components/Assignments/AssignTaskDialog'
import CancelTaskDialog from '../components/Assignments/CancelTaskDialog'
import AddTaskDialog from '../components/Assignments/AddTaskDialog'
import { useData } from '../hooks/useData'
import { Task } from '../types'
import { loadHistoricalTasks, getAvailableHistoricalDates, loadTasks } from '../services/dataService'
import { format, parseISO } from 'date-fns'
import Papa from 'papaparse'

function Assignments() {
  // Note: Assignments page does NOT use auto-refresh to prevent random data changes
  // Data is loaded once on mount and only refreshes manually
  const { crew, washrooms } = useData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskTitleMap, setCurrentTaskTitleMap] = useState<Map<string, string>>(new Map())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [cancelTask, setCancelTask] = useState<Task | null>(null)
  const [assignMode, setAssignMode] = useState<'assign' | 'reassign'>('assign')
  const [nextTaskId, setNextTaskId] = useState<number>(1)
  
  // Historical tasks view state
  const [viewMode, setViewMode] = useState<'current' | 'historical'>('current')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [historicalTasks, setHistoricalTasks] = useState<Task[]>([])
  const [crewNameMap, setCrewNameMap] = useState<Map<string, string>>(new Map())
  const [taskTitleMap, setTaskTitleMap] = useState<Map<string, string>>(new Map())
  const [taskDateStringMap, setTaskDateStringMap] = useState<Map<string, string>>(new Map())
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [allTaskTypes, setAllTaskTypes] = useState<string[]>([])

  // Load current tasks on mount
  useEffect(() => {
    const loadCurrentTasks = async () => {
      try {
        const washroomIds = washrooms.map((w) => w.id)
        const crewIds = crew.map((c) => c.id)
        const { tasks: loadedTasks, taskTitleMap } = await loadTasks(washroomIds, crewIds)
        setTasks(loadedTasks)
        setCurrentTaskTitleMap(taskTitleMap)
        
        // Find the highest task ID to generate new ones
        const maxId = loadedTasks.reduce((max, task) => {
          const numId = parseInt(task.id.replace(/\D/g, ''), 10)
          return isNaN(numId) ? max : Math.max(max, numId)
        }, 0)
        setNextTaskId(maxId + 1)
      } catch (error) {
        console.error('Failed to load current tasks:', error)
      }
    }
    
    if (washrooms.length > 0 && crew.length > 0) {
      loadCurrentTasks()
    }
  }, [washrooms.length, crew.length])

  // Load available dates and task types on mount
  useEffect(() => {
    getAvailableHistoricalDates().then((dates) => {
      setAvailableDates(dates)
      if (dates.length > 0) {
        setSelectedDate(dates[0]) // Select most recent date by default
      }
    })

    // Load all unique task types from CSV
    const loadTaskTypes = async () => {
      try {
        const possiblePaths = [
          '/Tasks 2024lighthouse_tasks_combined.csv',
          'data/Tasks 2024lighthouse_tasks_combined.csv',
          '/data/Tasks 2024lighthouse_tasks_combined.csv',
          './data/Tasks 2024lighthouse_tasks_combined.csv',
          '../data/Tasks 2024lighthouse_tasks_combined.csv',
        ]

        let text: string | null = null
        for (const csvPath of possiblePaths) {
          try {
            const response = await fetch(csvPath)
            if (response.ok) {
              text = await response.text()
              break
            }
          } catch (error) {
            continue
          }
        }

        if (text) {
          Papa.parse(text, {
            header: true,
            delimiter: ',',
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              const types = new Set<string>()
              if (results.data && results.data.length > 0) {
                results.data.forEach((row: any) => {
                  const title = String(row['Title'] || '').trim().replace(/^["']|["']$/g, '')
                  if (title && title !== 'Title') {
                    types.add(title)
                  }
                })
              }
              setAllTaskTypes(Array.from(types).sort())
            },
            error: () => {
              // Fallback on error
              setAllTaskTypes(['Washroom Checklist', 'Air Freshener Checklist', 'C&W Check-in Counter Checklist', 'Lounge Checklist'])
            },
          })
        }
      } catch (error) {
        console.warn('Failed to load task types:', error)
      }
    }

    loadTaskTypes()
  }, [])

  // Load historical tasks when date changes
  useEffect(() => {
    if (viewMode === 'historical' && selectedDate) {
      setLoadingHistorical(true)
      loadHistoricalTasks(selectedDate)
        .then(({ tasks, crewNameMap, taskTitleMap, taskDateStringMap }) => {
          setHistoricalTasks(tasks)
          setCrewNameMap(crewNameMap)
          setTaskTitleMap(taskTitleMap)
          setTaskDateStringMap(taskDateStringMap)
          setLoadingHistorical(false)
        })
        .catch((error) => {
          console.error('Failed to load historical tasks:', error)
          setLoadingHistorical(false)
        })
    }
  }, [viewMode, selectedDate])

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleAssign = (task: Task, crewId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              assignedCrewId: crewId,
              state: 'assigned' as const,
            }
          : t
      )
    )
    // Update selected task if it's the same one
    if (selectedTask?.id === task.id) {
      const updatedTask = tasks.find((t) => t.id === task.id)
      if (updatedTask) {
        setSelectedTask({
          ...updatedTask,
          assignedCrewId: crewId,
          state: 'assigned' as const,
        })
      }
    }
  }

  const handleReassign = (task: Task, crewId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              assignedCrewId: crewId,
              state: t.state === 'in_progress' ? ('in_progress' as const) : ('assigned' as const),
            }
          : t
      )
    )
    // Update selected task if it's the same one
    if (selectedTask?.id === task.id) {
      const updatedTask = tasks.find((t) => t.id === task.id)
      if (updatedTask) {
        setSelectedTask({
          ...updatedTask,
          assignedCrewId: crewId,
        })
      }
    }
  }

  const handleUnassign = (task: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              assignedCrewId: undefined,
              state: 'unassigned' as const,
            }
          : t
      )
    )
    // Update selected task if it's the same one
    if (selectedTask?.id === task.id) {
      const updatedTask = tasks.find((t) => t.id === task.id)
      if (updatedTask) {
        setSelectedTask({
          ...updatedTask,
          assignedCrewId: undefined,
          state: 'unassigned' as const,
        })
      }
    }
  }

  const handleCancelClick = (task: Task) => {
    setCancelTask(task)
    setCancelDialogOpen(true)
  }

  const handleCancel = (task: Task, reason: string) => {
    if (!reason) return // Don't cancel if no reason provided
    
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              state: 'cancelled' as const,
              cancelledTime: new Date(),
              cancellationReason: reason,
            }
          : t
      )
    )
    // Update selected task if it's the same one
    if (selectedTask?.id === task.id) {
      const updatedTask = tasks.find((t) => t.id === task.id)
      if (updatedTask) {
        setSelectedTask({
          ...updatedTask,
          state: 'cancelled' as const,
          cancelledTime: new Date(),
          cancellationReason: reason,
        })
      }
    }
  }

  const openAssignDialog = (task: Task, mode: 'assign' | 'reassign' = 'assign') => {
    setAssignTask(task)
    setAssignMode(mode)
    setAssignDialogOpen(true)
  }

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    // Generate a new task ID
    const newTaskId = `task-manual-${nextTaskId}`
    const newTask: Task = {
      ...taskData,
      id: newTaskId,
    }
    
    setTasks((prevTasks) => [...prevTasks, newTask])
    
    // Store the title in the title map
    const taskTypeTitle = taskData.type.replace('_', ' ')
    // Try to find matching title from available types
    const availableTypes = Array.from(currentTaskTitleMap.values())
    const matchingTitle = availableTypes.find((t) => 
      t.toLowerCase().includes(taskTypeTitle.toLowerCase()) ||
      taskTypeTitle.toLowerCase().includes(t.toLowerCase())
    ) || taskTypeTitle
    
    setCurrentTaskTitleMap((prev) => {
      const newMap = new Map(prev)
      newMap.set(newTaskId, matchingTitle)
      return newMap
    })
    
    setNextTaskId((prev) => prev + 1)
  }

  const handleDeleteTask = (task: Task) => {
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id))
    
    // Clear selected task if it was deleted
    if (selectedTask?.id === task.id) {
      setSelectedTask(null)
    }
    
    // Remove from title map
    setCurrentTaskTitleMap((prev) => {
      const newMap = new Map(prev)
      newMap.delete(task.id)
      return newMap
    })
  }

  // Get available task types for the add dialog
  // Use all task types from CSV
  const availableTaskTypes = useMemo(() => {
    if (allTaskTypes.length > 0) {
      return allTaskTypes
    }
    // Fallback to common task types if no CSV data loaded yet
    return ['Washroom Checklist', 'Air Freshener Checklist', 'C&W Check-in Counter Checklist', 'Lounge Checklist']
  }, [allTaskTypes])

  return (
    <Box>
      {/* View Mode Toggle */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              setViewMode(newMode)
            }
          }}
          aria-label="view mode"
        >
          <ToggleButton value="current" aria-label="current tasks">
            Current Tasks
          </ToggleButton>
          <ToggleButton value="historical" aria-label="historical tasks">
            Historical Tasks
          </ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'historical' && (
          <TextField
            select
            label="Select Date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            {availableDates.map((date) => {
              // Format date string directly - parse as local date to avoid timezone issues
              // date format: "2024-12-20"
              try {
                // Use parseISO and then format, but treat as local date
                const [year, month, day] = date.split('-')
                // Create date in local timezone (not UTC)
                const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                return (
                  <MenuItem key={date} value={date}>
                    {format(localDate, 'EEE, MMM d, yyyy')}
                  </MenuItem>
                )
              } catch {
                // Fallback: just show the date string
                return (
                  <MenuItem key={date} value={date}>
                    {date}
                  </MenuItem>
                )
              }
            })}
          </TextField>
        )}
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Main Task List */}
        <Grid item xs={12} md={8}>
          {viewMode === 'current' ? (
            <TaskList
              tasks={tasks}
              taskTitleMap={currentTaskTitleMap}
              onTaskSelect={handleTaskSelect}
              onAssign={(task) => openAssignDialog(task, 'assign')}
              onReassign={(task) => openAssignDialog(task, 'reassign')}
              onUnassign={handleUnassign}
              onCancel={handleCancelClick}
              onDelete={handleDeleteTask}
              onAdd={() => setAddDialogOpen(true)}
            />
          ) : (
            <>
              {loadingHistorical ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <HistoricalTaskList
                  tasks={historicalTasks}
                  crewNameMap={crewNameMap}
                  taskTitleMap={taskTitleMap}
                  taskDateStringMap={taskDateStringMap}
                  selectedDate={selectedDate}
                />
              )}
            </>
          )}
        </Grid>

        {/* Conflict Indicators Sidebar */}
        <Grid item xs={12} md={4}>
          {viewMode === 'current' && <ConflictIndicators />}
        </Grid>
      </Grid>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        crew={crew}
        washrooms={washrooms}
      />

      {/* Assign/Reassign Dialog */}
      <AssignTaskDialog
        task={assignTask}
        open={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false)
          setAssignTask(null)
        }}
        onAssign={(task, crewId) => {
          if (assignMode === 'reassign') {
            handleReassign(task, crewId)
          } else {
            handleAssign(task, crewId)
          }
        }}
        crew={crew}
        mode={assignMode}
      />

      {/* Cancel Task Dialog */}
      <CancelTaskDialog
        task={cancelTask}
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false)
          setCancelTask(null)
        }}
        onCancel={handleCancel}
      />

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddTask}
        washrooms={washrooms.map((w) => ({ id: w.id, name: w.name }))}
        availableTaskTypes={availableTaskTypes}
      />
    </Box>
  )
}

export default Assignments

