/**
 * Availability Toggles - Mark crew unavailable/available
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material'
import { PersonOff, Person } from '@mui/icons-material'
import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { Crew } from '../../types'

function AvailabilityToggles() {
  const { crew } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null)
  const [unavailableReason, setUnavailableReason] = useState('')

  const unavailableReasons = [
    'Sick',
    'Pulled to another duty',
    'Equipment issue',
    'Personal emergency',
    'Other',
  ]

  const handleToggleAvailability = (member: Crew) => {
    if (member.status === 'unavailable') {
      // Mark as available
      // TODO: Implement actual status update
      console.log('Mark available:', member.id)
    } else {
      // Mark as unavailable - open dialog for reason
      setSelectedCrew(member)
      setDialogOpen(true)
    }
  }

  const handleConfirmUnavailable = () => {
    if (selectedCrew && unavailableReason) {
      // TODO: Implement actual status update
      console.log('Mark unavailable:', selectedCrew.id, 'reason:', unavailableReason)
      setDialogOpen(false)
      setSelectedCrew(null)
      setUnavailableReason('')
    }
  }

  const onShiftCrew = crew.filter(
    (c) => c.status === 'on_shift' || c.status === 'available' || c.status === 'busy'
  )

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Availability Management
          </Typography>

          {onShiftCrew.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No crew members on shift
            </Typography>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {onShiftCrew.map((member) => (
                <ListItem
                  key={member.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    {member.status === 'unavailable' ? (
                      <PersonOff color="error" />
                    ) : (
                      <Person color="success" />
                    )}
                  </Box>
                  <ListItemText
                    primary={member.name}
                    secondary={
                      member.status === 'unavailable'
                        ? `Unavailable: ${unavailableReason || 'No reason specified'}`
                        : `${member.role} • ${member.status.replace('_', ' ')}`
                    }
                  />
                  <Switch
                    checked={member.status !== 'unavailable'}
                    onChange={() => handleToggleAvailability(member)}
                    color="success"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Unavailable Reason Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Crew Member Unavailable</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedCrew?.name} will be marked as unavailable and tasks will be
              reassigned.
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reason</InputLabel>
              <Select
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                label="Reason"
              >
                {unavailableReasons.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {unavailableReason === 'Other' && (
              <TextField
                fullWidth
                label="Specify reason"
                multiline
                rows={3}
                value={unavailableReason}
                onChange={(e) => {
                  // Keep "Other" as base, append custom text
                  setUnavailableReason(`Other: ${e.target.value}`)
                }}
                placeholder="Enter reason..."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmUnavailable}
            disabled={!unavailableReason}
          >
            Mark Unavailable
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AvailabilityToggles

