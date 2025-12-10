/**
 * Cancel Task Dialog - Cancel a task with a reason
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
} from '@mui/material'
import { Task } from '../../types'
import { useState } from 'react'

interface CancelTaskDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onCancel: (task: Task, reason: string) => void
}

const cancellationReasons = [
  'No longer needed',
  'Duplicate task',
  'Washroom closed',
  'Equipment unavailable',
  'Crew unavailable',
  'Resolved by other means',
  'Scheduled maintenance',
  'Other',
]

function CancelTaskDialog({
  task,
  open,
  onClose,
  onCancel,
}: CancelTaskDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')

  const handleCancel = () => {
    if (task && selectedReason) {
      onCancel(task, selectedReason)
      setSelectedReason('')
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    onClose()
  }

  if (!task) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel Task</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Task: {task.id} • {task.type.replace('_', ' ')}
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Reason for Cancellation</InputLabel>
            <Select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              label="Reason for Cancellation"
            >
              {cancellationReasons.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleCancel}
          disabled={!selectedReason}
        >
          Cancel Task
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CancelTaskDialog

