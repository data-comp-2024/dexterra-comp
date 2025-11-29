import { Typography, Box, Card, CardContent } from '@mui/material'

function PerformanceSLAs() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Performance & SLAs
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Performance & SLAs tab. Implementation coming in Phase 7.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PerformanceSLAs

