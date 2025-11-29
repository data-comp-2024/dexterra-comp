import { Typography, Box, Card, CardContent } from '@mui/material'

function HelpPlaybook() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Help & Playbook
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This is the Help & Playbook tab. Implementation coming in Phase 12.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default HelpPlaybook

