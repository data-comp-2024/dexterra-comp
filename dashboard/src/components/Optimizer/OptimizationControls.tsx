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
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
} from '@mui/material'
import { PlayArrow, Settings, People } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useData } from '../../hooks/useData'
import { CURRENT_DATE } from '../../constants'

export interface OptimizationParameters {
  cleaningFrequencyHours: number // How often to clean (e.g., every 2 hours)
}

interface OptimizationControlsProps {
  onRunOptimization: (params: OptimizationParameters) => Promise<void>
  isRunning: boolean
  autoRun?: boolean // If true, auto-run when frequency changes
}

function OptimizationControls({ onRunOptimization, isRunning, autoRun = false }: OptimizationControlsProps) {
  const { crew } = useData()
  const [cleaningFrequencyHours, setCleaningFrequencyHours] = useState(2)
  const [error, setError] = useState<string | null>(null)
  const [hasRunOnce, setHasRunOnce] = useState(false)

  // Calculate active crew for Dec 31, 2024 (shifts that overlap with the day)
  const dayStart = new Date(CURRENT_DATE)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(CURRENT_DATE)
  dayEnd.setHours(23, 59, 59, 999)
  
  const activeCrewCount = crew.filter((c) => {
    const shiftStart = c.shift.startTime
    const shiftEnd = c.shift.endTime
    
    // Check if shift overlaps with Dec 31, 2024
    const shiftStartDate = new Date(shiftStart)
    shiftStartDate.setHours(0, 0, 0, 0)
    const shiftEndDate = new Date(shiftEnd)
    shiftEndDate.setHours(23, 59, 59, 999)
    
    const overlaps = shiftStartDate <= dayEnd && shiftEndDate >= dayStart
    return overlaps && c.status !== 'off_shift'
  }).length

  const handleRun = async () => {
    setError(null)
    try {
      const params: OptimizationParameters = {
        cleaningFrequencyHours,
      }
      await onRunOptimization(params)
      setHasRunOnce(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run optimization')
    }
  }

  // Auto-run when cleaning frequency changes (if autoRun is enabled and we've run at least once)
  useEffect(() => {
    if (autoRun && hasRunOnce && !isRunning && cleaningFrequencyHours > 0) {
      const timeoutId = setTimeout(async () => {
        setError(null)
        try {
          const params: OptimizationParameters = {
            cleaningFrequencyHours,
          }
          await onRunOptimization(params)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to run optimization')
        }
      }, 800) // Debounce 800ms
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaningFrequencyHours])

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
          {/* Active Crew Info */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <People color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Active Crew Members
              </Typography>
            </Box>
            <Chip
              label={`${activeCrewCount} crew members active on Dec 31, 2024`}
              color="primary"
              size="small"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Optimization will use all active crew members based on their shifts
            </Typography>
          </Box>

          {/* Cleaning Frequency */}
          <Box>
            <Tooltip title="How often bathrooms should be cleaned (e.g., every 2 hours)">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Cleaning Frequency (hours)
              </Typography>
            </Tooltip>
            <TextField
              type="number"
              value={cleaningFrequencyHours}
              onChange={(e) => setCleaningFrequencyHours(Number(e.target.value))}
              inputProps={{ min: 0.5, max: 6, step: 0.5 }}
              size="small"
              sx={{ width: 150 }}
              helperText="Hours between cleanings"
              aria-label="Cleaning frequency in hours"
            />
          </Box>

          {/* Action Button */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Run optimization for Dec 31, 2024 using active crew members">
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
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default OptimizationControls

