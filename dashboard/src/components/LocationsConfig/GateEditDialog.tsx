/**
 * Gate Edit Dialog - Edit gate information and coordinates
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
} from '@mui/material'
import { GateItem } from '../../services/dataService'
import { useState, useEffect } from 'react'

interface GateEditDialogProps {
  gate: GateItem
  open: boolean
  onSave: (gate: GateItem) => void
  onCancel: () => void
  isNew?: boolean
}

function GateEditDialog({ gate, open, onSave, onCancel, isNew = false }: GateEditDialogProps) {
  const [editedGate, setEditedGate] = useState<GateItem>(gate)

  useEffect(() => {
    setEditedGate(gate)
  }, [gate])

  const handleFieldChange = (field: keyof GateItem, value: any) => {
    setEditedGate((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedFieldChange = (parent: 'coordinates', field: string, value: any) => {
    setEditedGate((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    if (isNew && !editedGate.id.trim()) {
      alert('Please enter a gate ID')
      return
    }
    onSave(editedGate)
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{isNew ? 'Add New Gate' : `Edit Gate: ${gate.id}`}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Basic Info */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                label="Gate ID"
                value={editedGate.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                fullWidth
                size="small"
                required
                disabled={!isNew}
                helperText={isNew ? 'Unique identifier for this gate' : 'ID cannot be changed'}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Terminal"
                value={editedGate.terminal}
                onChange={(e) => handleFieldChange('terminal', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Level"
                value={editedGate.level}
                onChange={(e) => handleFieldChange('level', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Zone"
                value={editedGate.zone}
                onChange={(e) => handleFieldChange('zone', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Coordinates
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="X"
                type="number"
                value={editedGate.coordinates.x}
                onChange={(e) => handleNestedFieldChange('coordinates', 'x', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Y"
                type="number"
                value={editedGate.coordinates.y}
                onChange={(e) => handleNestedFieldChange('coordinates', 'y', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Z"
                type="number"
                value={editedGate.coordinates.z}
                onChange={(e) => handleNestedFieldChange('coordinates', 'z', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {isNew ? 'Add Gate' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default GateEditDialog

