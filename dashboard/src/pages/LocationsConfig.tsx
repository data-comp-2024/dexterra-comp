import { Typography, Box, Card, CardContent } from '@mui/material'

function LocationsConfig() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Locations & Config
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Locations & Config tab. Implementation coming in Phase 10.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LocationsConfig

