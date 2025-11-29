/**
 * Optimization Controls - Trigger optimization and set parameters
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material'
import { PlayArrow, Save, Settings } from '@mui/icons-material'
import { useState } from 'react'

export interface OptimizationParameters {
  timeWindowHours: number
  minimizeWalkingDistance: number // 0-100
  minimizeEmergencyResponse: number // 0-100
  maximizeHeadwaySLA: number // 0-100
  preset?: string
}

interface OptimizationControlsProps {
  onRunOptimization: (params: OptimizationParameters) => Promise<void>
  isRunning: boolean
}

const PRESETS = {
  peak: {
    name: 'Peak Mode',
    minimizeWalkingDistance: 30,
    minimizeEmergencyResponse: 50,
    maximizeHeadwaySLA: 70,
  },
  overnight: {
    name: 'Overnight Mode',
    minimizeWalkingDistance: 70,
    minimizeEmergencyResponse: 30,
    maximizeHeadwaySLA: 50,
  },
  balanced: {
    name: 'Balanced',
    minimizeWalkingDistance: 50,
    minimizeEmergencyResponse: 50,
    maximizeHeadwaySLA: 50,
  },
}

function OptimizationControls({ onRunOptimization, isRunning }: OptimizationControlsProps) {
  const [timeWindowHours, setTimeWindowHours] = useState(2)
  const [minimizeWalkingDistance, setMinimizeWalkingDistance] = useState(50)
  const [minimizeEmergencyResponse, setMinimizeEmergencyResponse] = useState(50)
  const [maximizeHeadwaySLA, setMaximizeHeadwaySLA] = useState(50)
  const [preset, setPreset] = useState<string>('balanced')
  const [error, setError] = useState<string | null>(null)

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset)
    if (newPreset !== 'custom' && PRESETS[newPreset as keyof typeof PRESETS]) {
      const presetValues = PRESETS[newPreset as keyof typeof PRESETS]
      setMinimizeWalkingDistance(presetValues.minimizeWalkingDistance)
      setMinimizeEmergencyResponse(presetValues.minimizeEmergencyResponse)
      setMaximizeHeadwaySLA(presetValues.maximizeHeadwaySLA)
    }
  }

  const handleRun = async () => {
    setError(null)
    try {
      const params: OptimizationParameters = {
        timeWindowHours,
        minimizeWalkingDistance,
        minimizeEmergencyResponse,
        maximizeHeadwaySLA,
        preset: preset !== 'custom' ? preset : undefined,
      }
      await onRunOptimization(params)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run optimization')
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Settings />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Optimization Controls
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Time Window */}
          <Box>
            <Tooltip title="Select how many hours into the future to optimize assignments">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Time Window
              </Typography>
            </Tooltip>
            <TextField
              type="number"
              value={timeWindowHours}
              onChange={(e) => setTimeWindowHours(Number(e.target.value))}
              inputProps={{ min: 1, max: 12 }}
              size="small"
              sx={{ width: 150 }}
              helperText="Hours ahead to optimize"
              aria-label="Time window in hours"
            />
          </Box>

          {/* Preset Selection */}
          <Tooltip title="Choose a preset optimization strategy or customize weights manually">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Optimization Preset</InputLabel>
              <Select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                label="Optimization Preset"
                aria-label="Select optimization preset"
              >
              <MenuItem value="balanced">{PRESETS.balanced.name}</MenuItem>
              <MenuItem value="peak">{PRESETS.peak.name}</MenuItem>
              <MenuItem value="overnight">{PRESETS.overnight.name}</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          {/* Parameter Sliders */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Optimization Weights
            </Typography>

            <Tooltip title="Weight for minimizing crew walking distance between tasks">
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Minimize Walking Distance</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {minimizeWalkingDistance}
                  </Typography>
                </Box>
                <Slider
                  value={minimizeWalkingDistance}
                  onChange={(_, value) => setMinimizeWalkingDistance(value as number)}
                  min={0}
                  max={100}
                  disabled={preset !== 'custom'}
                  aria-label="Minimize walking distance weight"
                />
              </Box>
            </Tooltip>

            <Tooltip title="Weight for minimizing emergency response time">
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Minimize Emergency Response Time</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {minimizeEmergencyResponse}
                  </Typography>
                </Box>
                <Slider
                  value={minimizeEmergencyResponse}
                  onChange={(_, value) => setMinimizeEmergencyResponse(value as number)}
                  min={0}
                  max={100}
                  disabled={preset !== 'custom'}
                  aria-label="Minimize emergency response time weight"
                />
              </Box>
            </Tooltip>

            <Tooltip title="Weight for maximizing adherence to headway SLA requirements">
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Maximize Headway SLA Adherence</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {maximizeHeadwaySLA}
                  </Typography>
                </Box>
                <Slider
                  value={maximizeHeadwaySLA}
                  onChange={(_, value) => setMaximizeHeadwaySLA(value as number)}
                  min={0}
                  max={100}
                  disabled={preset !== 'custom'}
                  aria-label="Maximize headway SLA adherence weight"
                />
              </Box>
            </Tooltip>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Run optimization with current parameters">
              <span>
                <Button
                  variant="contained"
                  startIcon={isRunning ? <CircularProgress size={16} /> : <PlayArrow />}
                  onClick={handleRun}
                  disabled={isRunning}
                  sx={{ flex: 1 }}
                  aria-label="Run optimization"
                >
                  {isRunning ? 'Running Optimization...' : 'Run Optimization'}
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Save />}
              disabled={preset === 'custom' || isRunning}
              onClick={() => {
                // TODO: Save preset functionality
                console.log('Save preset')
              }}
            >
              Save Preset
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default OptimizationControls

