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
import { useData } from '../hooks/useData'
import { Task } from '../types'
import { loadHistoricalTasks, getAvailableHistoricalDates } from '../services/dataService'
import { format, parseISO } from 'date-fns'

function Assignments() {
  // Note: Assignments page does NOT use auto-refresh to prevent random data changes
  // Data is loaded once on mount and only refreshes manually
  const { crew, washrooms } = useData()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
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
    // TODO: Implement actual assignment logic (update Redux store or API call)
    console.log('Assign task', task.id, 'to crew', crewId)
    // For now, just log - in Phase 13 we'll integrate with real data updates
  }

  const handleReassign = (task: Task, crewId: string) => {
    // TODO: Implement actual reassignment logic
    console.log('Reassign task', task.id, 'to crew', crewId)
  }

  const handleUnassign = (task: Task) => {
    // TODO: Implement actual unassignment logic
    console.log('Unassign task', task.id)
  }

  const handleCancel = (task: Task, reason: string) => {
    // TODO: Implement actual cancellation logic
    console.log('Cancel task', task.id, 'reason:', reason)
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
              onTaskSelect={handleTaskSelect}
              onAssign={(task) => openAssignDialog(task, 'assign')}
              onReassign={(task) => openAssignDialog(task, 'reassign')}
              onUnassign={handleUnassign}
              onCancel={handleCancel}
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
    </Box>
  )
}

export default Assignments

