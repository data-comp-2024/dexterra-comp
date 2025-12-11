/**
 * Task Assignments View - Shows detailed task definitions and crew assignments
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import { ExpandMore, Assignment, Person, Search, FilterList } from '@mui/icons-material'
import { Crew, Washroom } from '../../types'
import { CrewScheduleEvent, CrewAssignment } from '../../services/optimizerService'
import { format } from 'date-fns'
import { useState, useMemo } from 'react'

interface TaskAssignmentsViewProps {
  assignments: CrewAssignment[]
  crewSchedules: Record<string, CrewScheduleEvent[]>
  crew: Crew[]
  washrooms: Washroom[]
}

function TaskAssignmentsView({
  assignments,
  crewSchedules,
  crew,
  washrooms,
}: TaskAssignmentsViewProps) {
  const [searchText, setSearchText] = useState('')
  const [crewFilter, setCrewFilter] = useState<string>('all')
  const [washroomFilter, setWashroomFilter] = useState<string>('all')

  const getCrewName = (crewId: string) => {
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember?.name || crewId
  }

  const getWashroomName = (washroomId: string) => {
    const washroom = washrooms.find((w) => w.id === washroomId)
    return washroom?.name || washroomId
  }

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const matchesTaskId = assignment.taskId.toLowerCase().includes(searchLower)
        const matchesCrew = getCrewName(assignment.crewId).toLowerCase().includes(searchLower)
        const matchesWashroom = getWashroomName(assignment.washroomId).toLowerCase().includes(searchLower)
        if (!matchesTaskId && !matchesCrew && !matchesWashroom) {
          return false
        }
      }

      // Crew filter
      if (crewFilter !== 'all' && assignment.crewId !== crewFilter) {
        return false
      }

      // Washroom filter
      if (washroomFilter !== 'all' && assignment.washroomId !== washroomFilter) {
        return false
      }

      return true
    })
  }, [assignments, searchText, crewFilter, washroomFilter])

  // Group assignments by crew
  const assignmentsByCrew = new Map<string, CrewAssignment[]>()
  filteredAssignments.forEach((assignment) => {
    if (!assignmentsByCrew.has(assignment.crewId)) {
      assignmentsByCrew.set(assignment.crewId, [])
    }
    assignmentsByCrew.get(assignment.crewId)!.push(assignment)
  })

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Task Definitions & Crew Assignments
        </Typography>

        <Grid container spacing={3}>
          {/* Task Assignments Table */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                All Task Assignments
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Crew</InputLabel>
                  <Select
                    value={crewFilter}
                    label="Crew"
                    onChange={(e) => setCrewFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Crew</MenuItem>
                    {crew.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Washroom</InputLabel>
                  <Select
                    value={washroomFilter}
                    label="Washroom"
                    onChange={(e) => setWashroomFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Washrooms</MenuItem>
                    {washrooms.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Task ID</TableCell>
                    <TableCell>Washroom</TableCell>
                    <TableCell>Assigned Crew</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Travel Time</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {assignments.length === 0
                            ? 'No assignments yet. Run optimization first.'
                            : 'No assignments match the filters.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments
                      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                      .map((assignment) => (
                        <TableRow key={`${assignment.taskId}-${assignment.crewId}`} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {assignment.taskId}
                            </Typography>
                          </TableCell>
                          <TableCell>{getWashroomName(assignment.washroomId)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person fontSize="small" color="primary" />
                              <Typography variant="body2">{getCrewName(assignment.crewId)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(assignment.startTime, 'HH:mm:ss')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(assignment.startTime, 'MMM dd')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(assignment.endTime, 'HH:mm:ss')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(assignment.endTime, 'MMM dd')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${assignment.travelTimeMinutes} min`} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${assignment.cleaningDurationMinutes} min`} size="small" color="primary" />
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Crew Schedules */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Crew Schedules
            </Typography>
            {Object.keys(crewSchedules).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No crew schedules available.
              </Typography>
            ) : (
              Object.entries(crewSchedules).map(([crewId, schedule]) => {
                const crewMember = crew.find((c) => c.id === crewId)
                const crewName = getCrewName(crewId)
                if (schedule.length === 0) return null

                return (
                  <Accordion key={crewId} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Person color="primary" />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {crewName}
                          </Typography>
                          {crewMember && (
                            <Typography variant="caption" color="text.secondary">
                              Shift: {format(crewMember.shift.startTime, 'HH:mm')} - {format(crewMember.shift.endTime, 'HH:mm')}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`${schedule.length} events`}
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                Start Time
                                {crewMember && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Shift: {format(crewMember.shift.startTime, 'HH:mm')} - {format(crewMember.shift.endTime, 'HH:mm')}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>End Time</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Task</TableCell>
                              <TableCell>Washroom</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                              {schedule
                              .sort((a, b) => a.start.getTime() - b.start.getTime())
                              .map((event, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {format(event.start, 'HH:mm:ss')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {format(event.start, 'MMM dd')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {format(event.end, 'HH:mm:ss')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {format(event.end, 'MMM dd')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={event.status}
                                      size="small"
                                      color={
                                        event.status === 'cleaning'
                                          ? 'primary'
                                          : event.status === 'traveling'
                                          ? 'warning'
                                          : 'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {event.taskId ? (
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {event.taskId}
                                      </Typography>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {event.washroomId ? (
                                      <Typography variant="body2">{getWashroomName(event.washroomId)}</Typography>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )
              })
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default TaskAssignmentsView

