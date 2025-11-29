import { Typography, Box, Grid } from '@mui/material'
import RosterView from '../components/CrewShifts/RosterView'
import BreakManagement from '../components/CrewShifts/BreakManagement'
import WorkloadFairness from '../components/CrewShifts/WorkloadFairness'
import AvailabilityToggles from '../components/CrewShifts/AvailabilityToggles'

function CrewShifts() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Crew & Shifts
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column - Roster */}
        <Grid item xs={12} md={8}>
          <RosterView />
        </Grid>

        {/* Right Column - Break Management & Availability */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <BreakManagement />
            <AvailabilityToggles />
          </Box>
        </Grid>

        {/* Full Width - Workload & Fairness */}
        <Grid item xs={12}>
          <WorkloadFairness />
        </Grid>
      </Grid>
    </Box>
  )
}

export default CrewShifts

