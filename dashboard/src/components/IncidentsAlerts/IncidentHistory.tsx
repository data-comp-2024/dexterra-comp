/**
 * Incident History - Historical view with filters
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material'
import {
  Download,
  Visibility,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { EmergencyEvent } from '../../types'
import { format, differenceInMinutes } from 'date-fns'
// Note: DatePicker requires @mui/x-date-pickers package
// For now, using TextField with type="date" as fallback
// import { DatePicker } from '@mui/x-date-pickers/DatePicker'
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

function IncidentHistory() {
  const { emergencyEvents, washrooms, crew } = useData()

  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [washroomFilter, setWashroomFilter] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<EmergencyEvent | null>(null)

  const filteredIncidents = useMemo(() => {
    let filtered = emergencyEvents.filter((event) => {
      // Type filter
      if (typeFilter.length > 0 && !typeFilter.includes(event.type)) {
        return false
      }

      // Severity filter
      if (severityFilter.length > 0 && !severityFilter.includes(event.severity)) {
        return false
      }

      // Washroom filter
      if (washroomFilter.length > 0 && !washroomFilter.includes(event.washroomId)) {
        return false
      }

      // Date range filter
      if (startDate && event.detectedAt < startDate) {
        return false
      }
      if (endDate) {
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        if (event.detectedAt > endOfDay) {
          return false
        }
      }

      return true
    })

    // Sort by detection time (newest first)
    filtered.sort((a, b) => {
      const timeA = a.detectedAt instanceof Date ? a.detectedAt.getTime() : new Date(a.detectedAt).getTime()
      const timeB = b.detectedAt instanceof Date ? b.detectedAt.getTime() : new Date(b.detectedAt).getTime()
      return timeB - timeA
    })

    return filtered
  }, [emergencyEvents, typeFilter, severityFilter, washroomFilter, startDate, endDate])

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export incidents to CSV')
  }

  const getWashroomName = (washroomId: string) => {
    const washroom = washrooms.find((w) => w.id === washroomId)
    return washroom?.name || washroomId
  }

  const getCrewName = (crewId?: string) => {
    if (!crewId) return 'N/A'
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember?.name || crewId
  }

  const getResponseTime = (event: EmergencyEvent) => {
    if (!event.firstResponseTime || !event.detectedAt) return null
    const start = event.detectedAt instanceof Date ? event.detectedAt : new Date(event.detectedAt)
    const end = event.firstResponseTime instanceof Date ? event.firstResponseTime : new Date(event.firstResponseTime)
    return differenceInMinutes(end, start)
  }

  const getResolutionTime = (event: EmergencyEvent) => {
    if (!event.resolutionTime || !event.firstResponseTime) return null
    const start = event.firstResponseTime instanceof Date ? event.firstResponseTime : new Date(event.firstResponseTime)
    const end = event.resolutionTime instanceof Date ? event.resolutionTime : new Date(event.resolutionTime)
    return differenceInMinutes(end, start)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Incident History ({filteredIncidents.length})
            </Typography>
            <Button
              startIcon={<Download />}
              onClick={handleExport}
              variant="outlined"
              size="small"
            >
              Export CSV
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                multiple
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as string[])}
                label="Type"
              >
                <MenuItem value="overflowing_toilet">Overflowing Toilet</MenuItem>
                <MenuItem value="bodily_fluids">Bodily Fluids</MenuItem>
                <MenuItem value="poor_aim">Poor Aim</MenuItem>
                <MenuItem value="just_too_much_poop">Just Too Much Poop</MenuItem>
                <MenuItem value="slip_hazard">Slip Hazard</MenuItem>
                <MenuItem value="odor_threshold_exceeded">Odor Threshold</MenuItem>
                <MenuItem value="unhappy_washroom">Unhappy Washroom</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                multiple
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as string[])}
                label="Severity"
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Washroom</InputLabel>
              <Select
                multiple
                value={washroomFilter}
                onChange={(e) => setWashroomFilter(e.target.value as string[])}
                label="Washroom"
              >
                {washrooms.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <Button
              size="small"
              onClick={() => {
                setTypeFilter([])
                setSeverityFilter([])
                setWashroomFilter([])
                setStartDate(null)
                setEndDate(null)
              }}
            >
              Clear Filters
            </Button>
          </Box>

          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Detected</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Washroom</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Response Time</TableCell>
                  <TableCell>Resolution Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Crew</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No incidents found matching filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((event) => {
                    const responseTime = getResponseTime(event)
                    const resolutionTime = getResolutionTime(event)

                    return (
                      <TableRow key={event.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {event.detectedAt ? format(new Date(event.detectedAt), 'MMM d, yyyy') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.detectedAt ? format(new Date(event.detectedAt), 'HH:mm:ss') : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {event.type.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getWashroomName(event.washroomId)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={event.severity}
                            size="small"
                            color={getSeverityColor(event.severity) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {event.source.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {responseTime !== null ? (
                            <Typography
                              variant="body2"
                              color={responseTime > 10 ? 'error.main' : 'inherit'}
                            >
                              {responseTime}m
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {resolutionTime !== null ? (
                            <Typography variant="body2">
                              {resolutionTime}m
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {event.status === 'resolved' ? 'N/A' : 'Pending'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={event.status}
                            size="small"
                            color={event.status === 'resolved' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getCrewName(event.assignedCrewId)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedIncident(event)}
                            aria-label="View incident details"
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Incident Detail Modal */}
      <Dialog
        open={selectedIncident !== null}
        onClose={() => setSelectedIncident(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedIncident && (
          <>
            <DialogTitle>
              Incident Details - {selectedIncident.type.replace(/_/g, ' ').toUpperCase()}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Incident ID
                  </Typography>
                  <Typography variant="body1">{selectedIncident.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedIncident.status}
                      color={selectedIncident.status === 'resolved' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Washroom
                  </Typography>
                  <Typography variant="body1">
                    {washrooms.find((w) => w.id === selectedIncident.washroomId)?.name || selectedIncident.washroomId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Severity
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedIncident.severity}
                      color={
                        selectedIncident.severity === 'critical'
                          ? 'error'
                          : selectedIncident.severity === 'high'
                            ? 'warning'
                            : 'default'
                      }
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {selectedIncident.source.replace(/_/g, ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Detected At
                  </Typography>
                  <Typography variant="body1">
                    {format(selectedIncident.detectedAt, 'MMM d, yyyy HH:mm')}
                  </Typography>
                </Grid>
                {selectedIncident.firstResponseTime && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        First Response Time
                      </Typography>
                      <Typography variant="body1">
                        {format(selectedIncident.firstResponseTime, 'MMM d, yyyy HH:mm')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Response Time
                      </Typography>
                      <Typography variant="body1">
                        {getResponseTime(selectedIncident)} minutes
                      </Typography>
                    </Grid>
                  </>
                )}
                {selectedIncident.resolutionTime && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Resolution Time
                    </Typography>
                    <Typography variant="body1">
                      {format(selectedIncident.resolutionTime, 'MMM d, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
                {selectedIncident.assignedCrewId && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Assigned Crew
                    </Typography>
                    <Typography variant="body1">
                      {crew.find((c) => c.id === selectedIncident.assignedCrewId)?.name || selectedIncident.assignedCrewId}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedIncident(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

export default IncidentHistory

