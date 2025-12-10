import { useState, useEffect } from 'react'
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
import { useData } from '../hooks/useData'
import { Task } from '../types'
import { loadHistoricalTasks, getAvailableHistoricalDates, loadTasks } from '../services/dataService'
import { format, parseISO } from 'date-fns'

function Assignments() {
  // Note: Assignments page does NOT use auto-refresh to prevent random data changes
  // Data is loaded once on mount and only refreshes manually
  const { crew, washrooms } = useData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskTitleMap, setCurrentTaskTitleMap] = useState<Map<string, string>>(new Map())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [cancelTask, setCancelTask] = useState<Task | null>(null)
  const [assignMode, setAssignMode] = useState<'assign' | 'reassign'>('assign')
  
  // Historical tasks view state
  const [viewMode, setViewMode] = useState<'current' | 'historical'>('current')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [historicalTasks, setHistoricalTasks] = useState<Task[]>([])
  const [crewNameMap, setCrewNameMap] = useState<Map<string, string>>(new Map())
  const [taskTitleMap, setTaskTitleMap] = useState<Map<string, string>>(new Map())
  const [taskDateStringMap, setTaskDateStringMap] = useState<Map<string, string>>(new Map())
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  // Load current tasks on mount
  useEffect(() => {
    const loadCurrentTasks = async () => {
      try {
        const washroomIds = washrooms.map((w) => w.id)
        const crewIds = crew.map((c) => c.id)
        const { tasks: loadedTasks, taskTitleMap } = await loadTasks(washroomIds, crewIds)
        setTasks(loadedTasks)
        setCurrentTaskTitleMap(taskTitleMap)
      } catch (error) {
        console.error('Failed to load current tasks:', error)
      }
    }
    
    if (washrooms.length > 0 && crew.length > 0) {
      loadCurrentTasks()
    }
  }, [washrooms.length, crew.length])

  // Load available dates on mount
  useEffect(() => {
    getAvailableHistoricalDates().then((dates) => {
      setAvailableDates(dates)
      if (dates.length > 0) {
        setSelectedDate(dates[0]) // Select most recent date by default
      }
    })
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
    </Box>
  )
}

export default Assignments

