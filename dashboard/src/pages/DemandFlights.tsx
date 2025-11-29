import { Typography, Box, Grid } from '@mui/material'
import DemandForecastChart from '../components/DemandFlights/DemandForecastChart'
import FlightSchedule from '../components/DemandFlights/FlightSchedule'
import RiskForecast from '../components/DemandFlights/RiskForecast'

function DemandFlights() {
  return (
    <Box sx={{ minHeight: 0 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Demand & Flights
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ minHeight: 0 }}>
        {/* Demand Forecast */}
        <Grid item xs={12}>
          <DemandForecastChart />
        </Grid>

        {/* Flight Schedule */}
        <Grid item xs={12} md={7} sx={{ minHeight: 0 }}>
          <FlightSchedule />
        </Grid>

        {/* Risk Forecast */}
        <Grid item xs={12} md={5} sx={{ minHeight: 0 }}>
          <RiskForecast />
        </Grid>
      </Grid>
    </Box>
  )
}

export default DemandFlights

