import { Typography, Box, Card, CardContent } from '@mui/material'

function DemandFlights() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Demand & Flights
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Demand & Flights tab. Implementation coming in Phase 8.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DemandFlights

