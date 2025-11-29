import { Typography, Box, Card, CardContent } from '@mui/material'

function Assignments() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Assignments
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Assignments tab. Implementation coming in Phase 4.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Assignments

