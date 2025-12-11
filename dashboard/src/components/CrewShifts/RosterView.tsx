/**
 * Roster View - List of crew members with shift information
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  MoreVert,
  CheckCircle,
  Schedule,
  PersonOff,
  Edit,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useCrew } from '../../context/CrewContext'
import { useOptimization } from '../../context/OptimizationContext'
import { Crew, CrewStatus } from '../../types'
import { format, isBefore, isAfter } from 'date-fns'
import { CURRENT_DATE } from '../../constants'
import EditShiftDialog from './EditShiftDialog'

function RosterView() {
  const { crew, updateCrewStatus, updateCrewDetails } = useCrew()
  const { optimizationResult } = useOptimization()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState('')
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null)
  const now = CURRENT_DATE

  const unavailableReasons = [
    'Sick',
    'Pulled to another duty',
    'Equipment issue',
    'Personal emergency',
    'Other',
  ]

  // Separate crew by status
  // Since optimization covers the entire day, combine active and upcoming shifts
  const crewByStatus = useMemo(() => {
    const active: Crew[] = []
    const offShift: Crew[] = []

    crew.forEach((member) => {
      if (member.status === 'off_shift') {
        offShift.push(member)
      } else {
        // Include both currently active crew and upcoming shifts
        // since optimization covers the entire day
        active.push(member)
      }
    })

    return { active, offShift }
  }, [crew, now])

  const handleMenuOpen = (crewId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [crewId]: event.currentTarget })
  }

  const handleMenuClose = (crewId: string) => {
    setAnchorEl({ ...anchorEl, [crewId]: null })
  }

  const handleToggleStatus = (member: Crew) => {
    if (member.status === 'unavailable') {
      updateCrewStatus(member.id, 'available')
    } else {
      setSelectedCrew(member)
      setUnavailableDialogOpen(true)
    }
    handleMenuClose(member.id)
  }

  const handleConfirmUnavailable = () => {
    if (selectedCrew && unavailableReason) {
      updateCrewStatus(selectedCrew.id, 'unavailable', unavailableReason)
      setUnavailableDialogOpen(false)
      setSelectedCrew(null)
      setUnavailableReason('')
    }
  }

  const handleEditShift = (member: Crew) => {
    setSelectedCrew(member)
    setEditDialogOpen(true)
    handleMenuClose(member.id)
  }

  const handleSaveShift = (crewId: string, startTime: Date, endTime: Date, status: CrewStatus) => {
    updateCrewDetails(crewId, {
      shift: { startTime, endTime },
      status,
    })
  }

  const getStatusColor = (status: CrewStatus) => {
    switch (status) {
      case 'available':
        return 'success'
      case 'busy':
        return 'warning'
      case 'on_break':
        return 'info'
      case 'unavailable':
        return 'error'
      case 'on_shift':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const renderCrewTable = (crewList: Crew[], title: string) => {
    if (crewList.length === 0) return null

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title} ({crewList.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Crew Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Current Task</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crewList.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40,
                        }}
                      >
                        {getInitials(member.name)}
                      </Avatar>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {member.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{member.role}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.status.replace('_', ' ')}
                      size="small"
                      color={getStatusColor(member.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {format(member.shift.startTime, 'HH:mm')} -{' '}
                        {format(member.shift.endTime, 'HH:mm')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isBefore(now, member.shift.startTime)
                          ? `Starts ${format(member.shift.startTime, 'MMM d')}`
                          : isAfter(now, member.shift.endTime)
                            ? `Ended ${format(member.shift.endTime, 'MMM d')}`
                            : 'Active'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Check optimization results first, then fallback to current task
                      const crewSchedule = optimizationResult?.crewSchedules[member.id] || []
                      const currentScheduleEvent = crewSchedule.find(
                        (event) => now >= event.start && now < event.end && event.taskId
                      )
                      
                      if (currentScheduleEvent?.taskId) {
                        return (
                          <Typography variant="body2" color="primary">
                            {currentScheduleEvent.taskId}
                          </Typography>
                        )
                      }
                      
                      if (member.currentTaskId) {
                        return (
                          <Typography variant="body2" color="primary">
                            {member.currentTaskId}
                          </Typography>
                        )
                      }
                      
                      // Show next scheduled task if available
                      const nextTask = crewSchedule.find((event) => event.start > now && event.taskId)
                      if (nextTask) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Next: {format(nextTask.start, 'HH:mm')}
                          </Typography>
                        )
                      }
                      
                      return (
                        <Typography variant="body2" color="text.secondary">
                          None
                        </Typography>
                      )
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(member.id, e)}
                    >
                      <MoreVert />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl[member.id]}
                      open={Boolean(anchorEl[member.id])}
                      onClose={() => handleMenuClose(member.id)}
                    >
                      <MenuItem onClick={() => handleEditShift(member)}>
                        <Edit sx={{ mr: 1 }} fontSize="small" />
                        Edit Shift & Status
                      </MenuItem>
                      <MenuItem onClick={() => handleToggleStatus(member)}>
                        {member.status === 'unavailable' ? (
                          <>
                            <CheckCircle sx={{ mr: 1 }} fontSize="small" />
                            Mark Available
                          </>
                        ) : (
                          <>
                            <PersonOff sx={{ mr: 1 }} fontSize="small" />
                            Mark Unavailable
                          </>
                        )}
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Crew Roster - {format(now, 'MMMM d, yyyy')}
        </Typography>

        {renderCrewTable(crewByStatus.active, 'Active Crew (All Shifts Today)')}
        {renderCrewTable(crewByStatus.offShift, 'Off Shift')}

        {crew.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No crew members found
          </Typography>
        )}

        {/* Edit Shift Dialog */}
        <EditShiftDialog
          crew={selectedCrew}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false)
            setSelectedCrew(null)
          }}
          onSave={handleSaveShift}
        />

        {/* Unavailable Reason Dialog */}
        <Dialog open={unavailableDialogOpen} onClose={() => setUnavailableDialogOpen(false)} maxWidth="sm" fullWidth>
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
                  value={unavailableReason.startsWith('Other:') ? 'Other' : unavailableReason}
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
              {(unavailableReason === 'Other' || unavailableReason.startsWith('Other:')) && (
                <TextField
                  fullWidth
                  label="Specify reason"
                  multiline
                  rows={3}
                  value={unavailableReason.startsWith('Other:') ? unavailableReason.substring(7) : ''}
                  onChange={(e) => {
                    setUnavailableReason(`Other: ${e.target.value}`)
                  }}
                  placeholder="Enter reason..."
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnavailableDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleConfirmUnavailable}
              disabled={!unavailableReason}
            >
              Mark Unavailable
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default RosterView

