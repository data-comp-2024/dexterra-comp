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
} from '@mui/material'
import {
  MoreVert,
  CheckCircle,
  Schedule,
  PersonOff,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Crew, CrewStatus } from '../../types'
import { format, isAfter, isBefore } from 'date-fns'

function RosterView() {
  const { crew } = useData()
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({})
  const now = new Date()

  // Separate crew by status
  const crewByStatus = useMemo(() => {
    const active: Crew[] = []
    const upcoming: Crew[] = []
    const offShift: Crew[] = []

    crew.forEach((member) => {
      if (member.status === 'off_shift') {
        offShift.push(member)
      } else if (
        isBefore(now, member.shift.startTime) &&
        isAfter(member.shift.endTime, member.shift.startTime)
      ) {
        upcoming.push(member)
      } else {
        active.push(member)
      }
    })

    return { active, upcoming, offShift }
  }, [crew, now])

  const handleMenuOpen = (crewId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ ...anchorEl, [crewId]: event.currentTarget })
  }

  const handleMenuClose = (crewId: string) => {
    setAnchorEl({ ...anchorEl, [crewId]: null })
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
                    {member.currentTaskId ? (
                      <Typography variant="body2" color="primary">
                        {member.currentTaskId}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None
                      </Typography>
                    )}
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
                      <MenuItem onClick={() => handleMenuClose(member.id)}>
                        <Schedule sx={{ mr: 1 }} fontSize="small" />
                        View Schedule
                      </MenuItem>
                      <MenuItem onClick={() => handleMenuClose(member.id)}>
                        <PersonOff sx={{ mr: 1 }} fontSize="small" />
                        Mark Unavailable
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

        {renderCrewTable(crewByStatus.active, 'Active Crew')}
        {renderCrewTable(crewByStatus.upcoming, 'Upcoming Shifts')}
        {renderCrewTable(crewByStatus.offShift, 'Off Shift')}

        {crew.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No crew members found
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default RosterView

