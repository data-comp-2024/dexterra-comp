/**
 * Flight Schedule - Timeline/list view of flights with change indicators
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
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  Schedule,
  Cancel,
  SwapHoriz,
  Info,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { Flight, FlightStatus } from '../../types'
import { format } from 'date-fns'

function FlightSchedule() {
  const { flights } = useData()
  const [filterStatus, setFilterStatus] = useState<FlightStatus | 'all'>('all')

  const filteredFlights = useMemo(() => {
    let filtered = flights
    if (filterStatus !== 'all') {
      filtered = filtered.filter((f) => f.status === filterStatus)
    }
    return filtered.slice(0, 50) // Limit to 50 for performance
  }, [flights, filterStatus])

  const getStatusColor = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
        return 'default'
      case 'delayed':
        return 'warning'
      case 'cancelled':
        return 'error'
      case 'boarding':
        return 'info'
      case 'departed':
        return 'success'
      case 'arrived':
        return 'success'
      default:
        return 'default'
    }
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'delay':
        return <Schedule color="warning" />
      case 'cancellation':
        return <Cancel color="error" />
      case 'gate_change':
        return <SwapHoriz color="warning" />
      default:
        return null
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Flight Schedule
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['all', 'scheduled', 'delayed', 'cancelled', 'boarding'] as const).map((status) => (
              <Chip
                key={status}
                label={status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                onClick={() => setFilterStatus(status)}
                color={filterStatus === status ? 'primary' : 'default'}
                variant={filterStatus === status ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>

        <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Flight</TableCell>
                <TableCell>Gate</TableCell>
                <TableCell>Arrival</TableCell>
                <TableCell>Departure</TableCell>
                <TableCell>Passengers</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell>Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No flights found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlights.map((flight) => (
                  <TableRow key={flight.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {flight.airline} {flight.flightNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {flight.aircraftType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{flight.gate}</Typography>
                    </TableCell>
                    <TableCell>
                      {flight.scheduledArrivalTime ? (
                        <Box>
                          <Typography variant="body2">
                            {format(flight.scheduledArrivalTime, 'HH:mm')}
                          </Typography>
                          {flight.actualArrivalTime &&
                            flight.actualArrivalTime.getTime() !==
                              flight.scheduledArrivalTime.getTime() && (
                              <Typography variant="caption" color="warning.main">
                                Actual: {format(flight.actualArrivalTime, 'HH:mm')}
                              </Typography>
                            )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {flight.scheduledDepartureTime ? (
                        <Box>
                          <Typography variant="body2">
                            {format(flight.scheduledDepartureTime, 'HH:mm')}
                          </Typography>
                          {flight.actualDepartureTime &&
                            flight.actualDepartureTime.getTime() !==
                              flight.scheduledDepartureTime.getTime() && (
                              <Typography variant="caption" color="warning.main">
                                Actual: {format(flight.actualDepartureTime, 'HH:mm')}
                              </Typography>
                            )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{flight.passengers}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={flight.status}
                        size="small"
                        color={getStatusColor(flight.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      {flight.changes && flight.changes.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {flight.changes.map((change, idx) => (
                            <Tooltip
                              key={idx}
                              title={
                                <Box>
                                  <Typography variant="caption">
                                    {change.type.replace('_', ' ').toUpperCase()}
                                  </Typography>
                                  {change.originalValue && (
                                    <Typography variant="caption">
                                      <br />
                                      From: {change.originalValue.toString()}
                                    </Typography>
                                  )}
                                  {change.newValue && (
                                    <Typography variant="caption">
                                      <br />
                                      To: {change.newValue.toString()}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            >
                              <IconButton size="small">{getChangeIcon(change.type)}</IconButton>
                            </Tooltip>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {flight.impactOnDemand ? (
                        <Tooltip title={flight.impactOnDemand}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Info fontSize="small" color="action" />
                            <Typography variant="caption" sx={{ maxWidth: 150 }} noWrap>
                              {flight.impactOnDemand}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default FlightSchedule

