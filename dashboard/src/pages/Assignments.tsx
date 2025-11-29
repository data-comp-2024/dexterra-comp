import { useState } from 'react'
import { Typography, Box, Grid } from '@mui/material'
import TaskList from '../components/Assignments/TaskList'
import ConflictIndicators from '../components/Assignments/ConflictIndicators'
import TaskDetailModal from '../components/Assignments/TaskDetailModal'
import AssignTaskDialog from '../components/Assignments/AssignTaskDialog'
import { useData } from '../hooks/useData'
import { Task } from '../types'

function Assignments() {
  // Note: Assignments page does NOT use auto-refresh to prevent random data changes
  // Data is loaded once on mount and only refreshes manually
  const { crew, washrooms } = useData()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [assignMode, setAssignMode] = useState<'assign' | 'reassign'>('assign')

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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Assignments
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Main Task List */}
        <Grid item xs={12} md={8}>
          <TaskList
            onTaskSelect={handleTaskSelect}
            onAssign={(task) => openAssignDialog(task, 'assign')}
            onReassign={(task) => openAssignDialog(task, 'reassign')}
            onUnassign={handleUnassign}
            onCancel={handleCancel}
          />
        </Grid>

        {/* Conflict Indicators Sidebar */}
        <Grid item xs={12} md={4}>
          <ConflictIndicators />
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

