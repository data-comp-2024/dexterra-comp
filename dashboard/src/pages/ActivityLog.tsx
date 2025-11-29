import { Typography, Box, Card, CardContent } from '@mui/material'

function ActivityLog() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Activity Log
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Activity Log tab. Implementation coming in Phase 11.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ActivityLog

