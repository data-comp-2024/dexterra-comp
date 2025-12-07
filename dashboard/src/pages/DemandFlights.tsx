import { Typography, Box, Grid, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { format, parseISO, startOfDay, addDays, subDays } from 'date-fns'
import DemandForecastChart from '../components/DemandFlights/DemandForecastChart'
import FlightSchedule from '../components/DemandFlights/FlightSchedule'
import { useData } from '../hooks/useData'

function DemandFlights() {
  const { flights } = useData()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Get unique dates from flights and determine "today" (last date in dataset)
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>()
    flights.forEach((flight) => {
      const time = flight.actualArrivalTime || flight.actualDepartureTime
      if (time) {
        const dateStr = format(startOfDay(time), 'yyyy-MM-dd')
        dateSet.add(dateStr)
      }
    })
    return Array.from(dateSet).sort()
  }, [flights])

  // Initialize selectedDate to the last date (today)
  const todayDate = useMemo(() => {
    if (availableDates.length === 0) return null
    return parseISO(availableDates[availableDates.length - 1])
  }, [availableDates])

  // Use todayDate if selectedDate is null
  const currentDate = selectedDate || todayDate

  // Filter flights for selected date
  const filteredFlights = useMemo(() => {
    if (!currentDate) return flights
    const dateStr = format(startOfDay(currentDate), 'yyyy-MM-dd')
    return flights.filter((flight) => {
      const time = flight.actualArrivalTime || flight.actualDepartureTime
      if (!time) return false
      const flightDateStr = format(startOfDay(time), 'yyyy-MM-dd')
      return flightDateStr === dateStr
    })
  }, [flights, currentDate])

  const handlePreviousDay = () => {
    if (!currentDate) return
    const prevDate = subDays(currentDate, 1)
    const prevDateStr = format(startOfDay(prevDate), 'yyyy-MM-dd')
    if (availableDates.includes(prevDateStr)) {
      setSelectedDate(prevDate)
    }
  }

  const handleNextDay = () => {
    if (!currentDate) return
    const nextDate = addDays(currentDate, 1)
    const nextDateStr = format(startOfDay(nextDate), 'yyyy-MM-dd')
    if (availableDates.includes(nextDateStr)) {
      setSelectedDate(nextDate)
    }
  }

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(parseISO(dateStr))
  }

  const currentDateIndex = currentDate ? availableDates.indexOf(format(startOfDay(currentDate), 'yyyy-MM-dd')) : -1
  const isToday = currentDateIndex === availableDates.length - 1
  const canGoPrevious = currentDateIndex > 0
  const canGoNext = currentDateIndex >= 0 && currentDateIndex < availableDates.length - 1

  return (
    <Box sx={{ minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Demand & Flights
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePreviousDay} disabled={!canGoPrevious} size="small">
            <ChevronLeft />
          </IconButton>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Date</InputLabel>
            <Select
              value={currentDate ? format(startOfDay(currentDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => handleDateChange(e.target.value)}
              label="Date"
            >
              {availableDates.map((dateStr) => {
                const date = parseISO(dateStr)
                const isLastDate = dateStr === availableDates[availableDates.length - 1]
                const label = isLastDate
                  ? `${format(date, 'MMM d, yyyy')} (Today)`
                  : format(date, 'MMM d, yyyy')
                return (
                  <MenuItem key={dateStr} value={dateStr}>
                    {label}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
          <IconButton onClick={handleNextDay} disabled={!canGoNext} size="small">
            <ChevronRight />
          </IconButton>
          {isToday && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Today
            </Typography>
          )}
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ minHeight: 0 }}>
        {/* Demand Forecast */}
        <Grid item xs={12}>
          <DemandForecastChart />
        </Grid>

        {/* Flight Schedule */}
        <Grid item xs={12} sx={{ minHeight: 0 }}>
          <FlightSchedule flights={filteredFlights} />
        </Grid>
      </Grid>
    </Box>
  )
}

export default DemandFlights

