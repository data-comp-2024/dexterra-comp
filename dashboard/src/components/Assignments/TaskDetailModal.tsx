/**
 * Task Detail Modal - Full task information and editing
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Task, Crew, Washroom, TaskPriority, TaskState } from '../../types'
import { format } from 'date-fns'

interface TaskDetailModalProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onSave?: (task: Task) => void
  crew: Crew[]
  washrooms: Washroom[]
}

function TaskDetailModal({
  task,
  open,
  onClose,
  onSave,
  crew,
  washrooms,
}: TaskDetailModalProps) {
  if (!task) return null

  const washroom = washrooms.find((w) => w.id === task.washroomId)
  const assignedCrew = task.assignedCrewId
    ? crew.find((c) => c.id === task.assignedCrewId)
    : null

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Task Details</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={task.state.replace('_', ' ')}
              color={getStateColor(task.state) as any}
              size="small"
            />
            <Chip
              label={task.priority}
              color={getPriorityColor(task.priority) as any}
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Task ID
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
              {task.id}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1">
              {task.type.replace('_', ' ')}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Priority
            </Typography>
            <Typography variant="body1">
              <Chip
                label={task.priority}
                size="small"
                color={getPriorityColor(task.priority) as any}
              />
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Washroom
            </Typography>
            <Typography variant="body1">
              {washroom?.name || task.washroomId}
            </Typography>
            {washroom && (
              <Typography variant="caption" color="text.secondary">
                {washroom.terminal} • {washroom.type}
              </Typography>
            )}
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Assigned Crew
            </Typography>
            <Typography variant="body1">
              {assignedCrew?.name || 'Unassigned'}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Estimated Duration
            </Typography>
            <Typography variant="body1">
              {task.estimatedDurationMinutes
                ? `${task.estimatedDurationMinutes} minutes`
                : 'Not set'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {format(task.createdTime, 'MMM d, yyyy HH:mm:ss')}
            </Typography>
          </Grid>

          {task.startedTime && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Started
              </Typography>
              <Typography variant="body1">
                {format(task.startedTime, 'MMM d, yyyy HH:mm:ss')}
              </Typography>
            </Grid>
          )}

          {task.completedTime && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="body1">
                {format(task.completedTime, 'MMM d, yyyy HH:mm:ss')}
              </Typography>
            </Grid>
          )}

          {task.slaDeadline && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                SLA Deadline
              </Typography>
              <Typography
                variant="body1"
                color={
                  task.state === 'overdue' || new Date() > task.slaDeadline
                    ? 'error.main'
                    : 'inherit'
                }
              >
                {format(task.slaDeadline, 'MMM d, yyyy HH:mm:ss')}
              </Typography>
            </Grid>
          )}

          {task.cancelledTime && (
            <>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Cancelled
                </Typography>
                <Typography variant="body1">
                  {format(task.cancelledTime, 'MMM d, yyyy HH:mm:ss')}
                </Typography>
              </Grid>
              {task.cancellationReason && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Cancellation Reason
                  </Typography>
                  <Typography variant="body1">
                    {task.cancellationReason}
                  </Typography>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {onSave && (
          <Button variant="contained" onClick={() => onSave(task)}>
            Save Changes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default TaskDetailModal

