import { Box, Grid } from '@mui/material'
import RealTimeAlerts from '../components/IncidentsAlerts/RealTimeAlerts'
import IncidentHistory from '../components/IncidentsAlerts/IncidentHistory'
import RecurringIncidents from '../components/IncidentsAlerts/RecurringIncidents'
import EscalationRules from '../components/IncidentsAlerts/EscalationRules'

function IncidentsAlerts() {
  return (
    <Box>
      {/* <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Incidents & Alerts
      </Typography> */}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column - Real-time Alerts & Incident History */}
        <Grid item xs={12} md={8}>
          <RealTimeAlerts />
          <Box sx={{ mt: 3 }}>
            <IncidentHistory />
          </Box>
        </Grid>

        {/* Right Column - Recurring & Escalation */}
        <Grid item xs={12} md={4}>
          <RecurringIncidents />
          <Box sx={{ mt: 3 }}>
            <EscalationRules />
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default IncidentsAlerts

