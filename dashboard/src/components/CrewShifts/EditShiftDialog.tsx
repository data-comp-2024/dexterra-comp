/**
 * Edit Shift Dialog - Edit crew member shift times and availability
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
import { Crew, CrewStatus } from '../../types'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface EditShiftDialogProps {
  crew: Crew | null
  open: boolean
  onClose: () => void
  onSave: (crewId: string, startTime: Date, endTime: Date, status: CrewStatus) => void
}

const statusOptions: { value: CrewStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'on_break', label: 'On Break' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'on_shift', label: 'On Shift' },
  { value: 'off_shift', label: 'Off Shift' },
]

function EditShiftDialog({ crew, open, onClose, onSave }: EditShiftDialogProps) {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [status, setStatus] = useState<CrewStatus>('available')

  useEffect(() => {
    if (crew) {
      // Format times as HH:mm for time input
      const start = format(crew.shift.startTime, 'HH:mm')
      const end = format(crew.shift.endTime, 'HH:mm')
      setStartTime(start)
      setEndTime(end)
      setStatus(crew.status)
    }
  }, [crew])

  const handleSave = () => {
    if (!crew) return

    // Parse time strings and create Date objects for Dec 31, 2024
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const baseDate = new Date('2024-12-31')
    const newStartTime = new Date(baseDate)
    newStartTime.setHours(startHours, startMinutes, 0, 0)

    const newEndTime = new Date(baseDate)
    newEndTime.setHours(endHours, endMinutes, 0, 0)

    // If end time is before start time, assume it's next day
    if (newEndTime <= newStartTime) {
      newEndTime.setDate(newEndTime.getDate() + 1)
    }

    onSave(crew.id, newStartTime, newEndTime, status)
    onClose()
  }

  if (!crew) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Shift - {crew.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update shift times and availability status for {crew.name}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Shift Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 minutes
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Shift End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 minutes
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CrewStatus)}
                  label="Status"
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
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
        <Button variant="contained" onClick={handleSave}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditShiftDialog

