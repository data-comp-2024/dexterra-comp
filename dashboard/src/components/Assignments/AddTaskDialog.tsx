/**
 * Add Task Dialog - Create a new task manually
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Grid,
} from '@mui/material'
import { Task, TaskPriority, TaskType } from '../../types'
import { useState, useEffect } from 'react'
import { CURRENT_DATE } from '../../constants'

interface AddTaskDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (task: Omit<Task, 'id'>) => void
  washrooms: Array<{ id: string; name: string }>
  availableTaskTypes: string[] // Task titles from CSV
}

const priorityOptions: TaskPriority[] = ['normal', 'high', 'emergency']

function AddTaskDialog({
  open,
  onClose,
  onAdd,
  washrooms,
  availableTaskTypes,
}: AddTaskDialogProps) {
  const [taskType, setTaskType] = useState<string>('')
  const [washroomId, setWashroomId] = useState<string>('')
  const [priority, setPriority] = useState<TaskPriority>('normal')

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      if (availableTaskTypes.length > 0) {
        setTaskType(availableTaskTypes[0])
      }
      if (washrooms.length > 0) {
        setWashroomId(washrooms[0].id)
      }
      setPriority('normal')
    }
  }, [open, availableTaskTypes, washrooms])

  const handleAdd = () => {
    if (!taskType || !washroomId) return

    // Map task type title to TaskType enum
    let mappedType: TaskType = 'routine_cleaning'
    if (taskType.toLowerCase().includes('emergency')) {
      mappedType = 'emergency_cleaning'
    } else if (taskType.toLowerCase().includes('inspection')) {
      mappedType = 'inspection'
    } else if (
      taskType.toLowerCase().includes('refill') ||
      taskType.toLowerCase().includes('air freshener')
    ) {
      mappedType = 'consumable_refill'
    }

    const newTask: Omit<Task, 'id'> = {
      type: mappedType,
      washroomId,
      priority,
      state: 'unassigned',
      createdTime: CURRENT_DATE,
      // No SLA deadline for manually added normal tasks
      ...(priority === 'emergency' && {
        slaDeadline: new Date(CURRENT_DATE.getTime() + 10 * 60 * 1000), // 10 min SLA for emergencies
      }),
    }

    onAdd(newTask)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Task</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Task Type</InputLabel>
                <Select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  label="Task Type"
                >
                  {availableTaskTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Washroom</InputLabel>
                <Select
                  value={washroomId}
                  onChange={(e) => setWashroomId(e.target.value)}
                  label="Washroom"
                >
                  {washrooms.map((washroom) => (
                    <MenuItem key={washroom.id} value={washroom.id}>
                      {washroom.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  label="Priority"
                >
                  {priorityOptions.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!taskType || !washroomId}
        >
          Add Task
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddTaskDialog

