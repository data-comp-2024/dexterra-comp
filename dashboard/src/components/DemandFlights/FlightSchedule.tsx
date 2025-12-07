/**
 * Flight Schedule - Timeline/list view of flights
 */

import {
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
} from '@mui/material'
import { FlightTakeoff, FlightLand } from '@mui/icons-material'
import { useMemo } from 'react'
import { Flight } from '../../types'
import { format } from 'date-fns'

interface FlightScheduleProps {
  flights: Flight[]
}

function FlightSchedule({ flights }: FlightScheduleProps) {
  const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => {
      const timeA = a.actualArrivalTime?.getTime() || a.actualDepartureTime?.getTime() || 0
      const timeB = b.actualArrivalTime?.getTime() || b.actualDepartureTime?.getTime() || 0
      return timeA - timeB
    })
  }, [flights])

  // Helper function to determine flight type and gates
  const getFlightInfo = (flight: Flight) => {
    const origin = flight.origin || ''
    const destination = flight.destination || ''
    const isDeparture = origin.toLowerCase() === 'security'
    const isArrival = destination.toLowerCase() === 'security'
    
    let flightType: 'Departure' | 'Arrival' | 'Unknown' = 'Unknown'
    let arrivalGate = '-'
    let departureGate = '-'
    
    if (isDeparture) {
      flightType = 'Departure'
      departureGate = destination !== 'Security' ? destination : '-'
    } else if (isArrival) {
      flightType = 'Arrival'
      arrivalGate = origin !== 'Security' ? origin : '-'
    }
    
    return { flightType, arrivalGate, departureGate }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Flight Schedule
        </Typography>

        <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Flight</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Arrival Gate</TableCell>
                <TableCell>Departure Gate</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Passengers</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No flights found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedFlights.map((flight) => {
                  const { flightType, arrivalGate, departureGate } = getFlightInfo(flight)
                  const displayTime = flight.actualArrivalTime || flight.actualDepartureTime
                  
                  return (
                    <TableRow key={flight.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {flight.airline} {flight.flightNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {flightType === 'Departure' ? (
                          <Chip
                            icon={<FlightTakeoff />}
                            label="Departure"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : flightType === 'Arrival' ? (
                          <Chip
                            icon={<FlightLand />}
                            label="Arrival"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="Unknown" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {arrivalGate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {departureGate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {displayTime ? (
                          <Typography variant="body2">
                            {format(displayTime, 'HH:mm')}
                          </Typography>
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
                        <Chip label="Arrived" size="small" color="success" />
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
  )
}

export default FlightSchedule

