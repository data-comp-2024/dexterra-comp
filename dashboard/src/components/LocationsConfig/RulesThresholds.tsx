/**
 * Rules & Thresholds - SLA and happy score threshold configuration
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
} from '@mui/material'
import { useState } from 'react'
import { HAPPY_SCORE_THRESHOLD } from '../../constants'

interface ThresholdConfig {
  alertThreshold: number
  taskGenerationThreshold: number
  defaultMaxHeadway: number
  defaultEmergencyResponse: number
}

function RulesThresholds() {
  const [globalConfig, setGlobalConfig] = useState<ThresholdConfig>({
    alertThreshold: HAPPY_SCORE_THRESHOLD,
    taskGenerationThreshold: 80,
    defaultMaxHeadway: 45,
    defaultEmergencyResponse: 10,
  })

  const handleGlobalChange = (field: keyof ThresholdConfig, value: number) => {
    setGlobalConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
    // TODO: Save to Redux store/API
    console.log('Update global config', field, value)
  }

  const handleSave = () => {
    // TODO: Save all configurations
    console.log('Save thresholds', globalConfig)
    alert('Thresholds saved successfully')
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Rules & Thresholds
        </Typography>

        <Grid container spacing={3}>
          {/* Happy Score Thresholds */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Happy Score Thresholds
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Alert Threshold"
              type="number"
              value={globalConfig.alertThreshold}
              onChange={(e) => handleGlobalChange('alertThreshold', Number(e.target.value))}
              inputProps={{ min: 0, max: 100 }}
              helperText="Score below which alerts are generated (default: 85)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Task Generation Threshold"
              type="number"
              value={globalConfig.taskGenerationThreshold}
              onChange={(e) => handleGlobalChange('taskGenerationThreshold', Number(e.target.value))}
              inputProps={{ min: 0, max: 100 }}
              helperText="Score below which cleaning tasks are automatically created"
            />
          </Grid>

          <Divider sx={{ my: 2, width: '100%' }} />

          {/* SLA Defaults */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Default SLA Values
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These values are used as defaults for new washrooms. Individual washrooms can override these.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Max Headway (minutes)"
              type="number"
              value={globalConfig.defaultMaxHeadway}
              onChange={(e) => handleGlobalChange('defaultMaxHeadway', Number(e.target.value))}
              inputProps={{ min: 1 }}
              helperText="Maximum time between cleanings"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Emergency Response Target (minutes)"
              type="number"
              value={globalConfig.defaultEmergencyResponse}
              onChange={(e) => handleGlobalChange('defaultEmergencyResponse', Number(e.target.value))}
              inputProps={{ min: 1 }}
              helperText="Target response time for emergencies"
            />
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" onClick={() => {
                setGlobalConfig({
                  alertThreshold: HAPPY_SCORE_THRESHOLD,
                  taskGenerationThreshold: 80,
                  defaultMaxHeadway: 45,
                  defaultEmergencyResponse: 10,
                })
              }}>
                Reset to Defaults
              </Button>
              <Button variant="contained" onClick={handleSave}>
                Save Thresholds
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default RulesThresholds

