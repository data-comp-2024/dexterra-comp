/**
 * Assign Task Dialog - Assign or reassign a task to a crew member
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
  Alert,
} from '@mui/material'
import { Task, Crew } from '../../types'
import { useState, useMemo } from 'react'

interface AssignTaskDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onAssign: (task: Task, crewId: string) => void
  crew: Crew[]
  mode?: 'assign' | 'reassign'
}

function AssignTaskDialog({
  task,
  open,
  onClose,
  onAssign,
  crew,
  mode = 'assign',
}: AssignTaskDialogProps) {
  const [selectedCrewId, setSelectedCrewId] = useState<string>('')
  const [warnings, setWarnings] = useState<string[]>([])

  // Filter available crew (on shift and available/busy)
  const availableCrew = useMemo(() => {
    return crew.filter(
      (c) =>
        c.status === 'on_shift' ||
        c.status === 'available' ||
        c.status === 'busy'
    )
  }, [crew])

  const handleCrewChange = (crewId: string) => {
    setSelectedCrewId(crewId)
    const warningsList: string[] = []

    // Check for potential conflicts
    const selectedCrew = crew.find((c) => c.id === crewId)
    if (selectedCrew) {
      // Check if crew is already busy
      if (selectedCrew.status === 'busy') {
        warningsList.push('Crew member is currently busy')
      }

      // Check if crew is on break
      if (selectedCrew.status === 'on_break') {
        warningsList.push('Crew member is on break')
      }
    }

    setWarnings(warningsList)
  }

  const handleAssign = () => {
    if (task && selectedCrewId) {
      onAssign(task, selectedCrewId)
      setSelectedCrewId('')
      setWarnings([])
      onClose()
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'reassign' ? 'Reassign Task' : 'Assign Task'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Task: {task.id} • {task.type.replace('_', ' ')}
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Crew Member</InputLabel>
            <Select
              value={selectedCrewId}
              onChange={(e) => handleCrewChange(e.target.value)}
              label="Crew Member"
            >
              {availableCrew.map((crewMember) => (
                <MenuItem key={crewMember.id} value={crewMember.id}>
                  <Box>
                    <Typography variant="body1">{crewMember.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {crewMember.role} • {crewMember.status.replace('_', ' ')}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {warnings.map((warning, index) => (
                <Typography key={index} variant="body2">
                  {warning}
                </Typography>
              ))}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedCrewId}
        >
          {mode === 'reassign' ? 'Reassign' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AssignTaskDialog

