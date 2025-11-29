import { Box, Grid, CircularProgress, Alert } from '@mui/material'
import { useData } from '../hooks/useData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useWebSocket } from '../hooks/useWebSocket'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import MiniKPIPanel from '../components/LiveOps/MiniKPIPanel'
import IncomingDemandPanel from '../components/LiveOps/IncomingDemandPanel'
import CrewStrip from '../components/LiveOps/CrewStrip'
import AirportMap from '../components/LiveOps/AirportMap'
import { REFRESH_INTERVAL_LIVE_OPS } from '../constants'

function LiveOps() {
  const { loading, error, refresh } = useData()
  const connectionStatus = useSelector((state: RootState) => state.ui.connectionStatus)
  const isWebSocketConnected = connectionStatus === 'connected'

  // Use WebSocket for real-time updates if available, otherwise fallback to polling
  useWebSocket({
    enabled: true,
    onTaskUpdate: (task) => {
      // Handle real-time task updates
      console.log('Task update received:', task)
      // Refresh data to get latest state
      refresh()
    },
    onCrewUpdate: (crew) => {
      // Handle real-time crew updates
      console.log('Crew update received:', crew)
      refresh()
    },
    onEmergencyUpdate: (event) => {
      // Handle real-time emergency updates
      console.log('Emergency update received:', event)
      refresh()
    },
    onHappyScoreUpdate: (score) => {
      // Handle real-time happy score updates
      console.log('Happy score update received:', score)
      refresh()
    },
  })

  // Fallback to polling if WebSocket is not connected
  useAutoRefresh({
    intervalMs: REFRESH_INTERVAL_LIVE_OPS,
    onRefresh: refresh,
    enabled: !isWebSocketConnected, // Only poll if WebSocket is not connected
  })

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading data: {error.message}
      </Alert>
    )
  }

  return (
    <Box>
      {/* Mini KPI Panel */}
      <MiniKPIPanel />

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column */}
        <Grid item xs={12} md={4}>
          <IncomingDemandPanel />
        </Grid>

        {/* Middle Column */}
        <Grid item xs={12} md={4}>
          <AirportMap />
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          <CrewStrip />
        </Grid>
      </Grid>
    </Box>
  )
}

export default LiveOps

