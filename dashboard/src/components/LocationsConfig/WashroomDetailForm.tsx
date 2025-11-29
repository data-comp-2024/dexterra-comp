/**
 * Washroom Detail Form - Edit form for washroom configuration
 */

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Button,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { Washroom, WashroomType, WashroomStatus } from '../../types'

interface WashroomDetailFormProps {
  washroom?: Washroom
  onSave: (washroom: Washroom) => void
  onCancel: () => void
}

function WashroomDetailForm({ washroom, onSave, onCancel }: WashroomDetailFormProps) {
  const [formData, setFormData] = useState<Partial<Washroom>>({
    id: '',
    name: '',
    terminal: 'T1',
    concourse: '',
    type: 'standard',
    status: 'active',
    coordinates: { x: 0, y: 0, z: 0 },
    sla: {
      maxHeadwayMinutes: 45,
      emergencyResponseTargetMinutes: 10,
    },
    happyScoreThreshold: 85,
  })

  useEffect(() => {
    if (washroom) {
      setFormData(washroom)
    }
  }, [washroom])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCoordinateChange = (axis: 'x' | 'y' | 'z', value: number) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: {
        ...prev.coordinates!,
        [axis]: value,
      },
    }))
  }

  const handleSLAChange = (field: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      sla: {
        ...prev.sla!,
        [field]: value,
      },
    }))
  }

  const handleSubmit = () => {
    // Validation
    if (!formData.id || !formData.name || !formData.terminal) {
      alert('Please fill in all required fields')
      return
    }

    const washroomData: Washroom = {
      id: formData.id!,
      name: formData.name!,
      terminal: formData.terminal!,
      concourse: formData.concourse,
      gateProximity: formData.gateProximity,
      type: formData.type!,
      status: formData.status!,
      coordinates: formData.coordinates!,
      sla: formData.sla,
      happyScoreThreshold: formData.happyScoreThreshold,
      poopProfile: formData.poopProfile,
    }

    onSave(washroomData)
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ID"
            value={formData.id}
            onChange={(e) => handleChange('id', e.target.value)}
            required
            disabled={!!washroom} // Can't change ID when editing
            helperText={washroom ? 'ID cannot be changed' : 'Unique identifier'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth required>
            <InputLabel>Terminal</InputLabel>
            <Select
              value={formData.terminal}
              onChange={(e) => handleChange('terminal', e.target.value)}
              label="Terminal"
            >
              <MenuItem value="T1">T1</MenuItem>
              <MenuItem value="T3">T3</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Concourse/Zone"
            value={formData.concourse || ''}
            onChange={(e) => handleChange('concourse', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Gate Proximity"
            value={formData.gateProximity || ''}
            onChange={(e) => handleChange('gateProximity', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Type"
            >
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="family">Family</MenuItem>
              <MenuItem value="accessible">Accessible</MenuItem>
              <MenuItem value="staff-only">Staff Only</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Coordinates */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
            Coordinates
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="X"
            type="number"
            value={formData.coordinates?.x || 0}
            onChange={(e) => handleCoordinateChange('x', Number(e.target.value))}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Y"
            type="number"
            value={formData.coordinates?.y || 0}
            onChange={(e) => handleCoordinateChange('y', Number(e.target.value))}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Z (Floor)"
            type="number"
            value={formData.coordinates?.z || 0}
            onChange={(e) => handleCoordinateChange('z', Number(e.target.value))}
          />
        </Grid>

        {/* SLA Configuration */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
            SLA Configuration
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Max Headway (minutes)"
            type="number"
            value={formData.sla?.maxHeadwayMinutes || 45}
            onChange={(e) => handleSLAChange('maxHeadwayMinutes', Number(e.target.value))}
            inputProps={{ min: 1 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Emergency Response Target (minutes)"
            type="number"
            value={formData.sla?.emergencyResponseTargetMinutes || 10}
            onChange={(e) => handleSLAChange('emergencyResponseTargetMinutes', Number(e.target.value))}
            inputProps={{ min: 1 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Happy Score Threshold"
            type="number"
            value={formData.happyScoreThreshold || 85}
            onChange={(e) => handleChange('happyScoreThreshold', Number(e.target.value))}
            inputProps={{ min: 0, max: 100 }}
            helperText="Alert threshold (0-100)"
          />
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              Save
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default WashroomDetailForm

