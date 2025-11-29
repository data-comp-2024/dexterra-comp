import { Typography, Box, Card, CardContent } from '@mui/material'

function IncidentsAlerts() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Incidents & Alerts
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Incidents & Alerts tab. Implementation coming in Phase 6.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default IncidentsAlerts

