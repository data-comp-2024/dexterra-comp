import { Typography, Box, Card, CardContent } from '@mui/material'

function LiveOps() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Live Ops
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Live Ops tab. Implementation coming in Phase 3.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LiveOps

