import { Typography, Box } from '@mui/material'
import ActivityLogList from '../components/ActivityLog/ActivityLogList'

function ActivityLog() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Activity Log
      </Typography>
      <ActivityLogList />
    </Box>
  )
}

export default ActivityLog

