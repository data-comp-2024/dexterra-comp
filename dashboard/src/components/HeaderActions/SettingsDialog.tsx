/**
 * Settings Dialog Component
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Divider,
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'
import { setTheme } from '../../store/slices/uiSlice'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const dispatch = useDispatch()
  const theme = useSelector((state: RootState) => state.ui.theme)
  const connectionStatus = useSelector((state: RootState) => state.ui.connectionStatus)

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    dispatch(setTheme(newTheme))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Appearance Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Appearance
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
                label="Theme"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Preferences Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Preferences
            </Typography>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Auto-refresh when WebSocket disconnected"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Show notifications for emergencies"
            />
            <FormControlLabel
              control={<Switch />}
              label="Sound alerts for critical incidents"
            />
          </Box>

          <Divider />

          {/* System Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              System Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connection Status: <strong>{connectionStatus}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Version: 1.0.0
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog

