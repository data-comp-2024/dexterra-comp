/**
 * Janitor Closet Edit Dialog - Edit janitor closet information and coordinates
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
import { JanitorClosetItem } from '../../services/dataService'
import { useState, useEffect } from 'react'

interface JanitorClosetEditDialogProps {
  closet: JanitorClosetItem
  open: boolean
  onSave: (closet: JanitorClosetItem) => void
  onCancel: () => void
  isNew?: boolean
}

function JanitorClosetEditDialog({ closet, open, onSave, onCancel, isNew = false }: JanitorClosetEditDialogProps) {
  const [editedCloset, setEditedCloset] = useState<JanitorClosetItem>(closet)

  useEffect(() => {
    setEditedCloset(closet)
  }, [closet])

  const handleFieldChange = (field: keyof JanitorClosetItem, value: any) => {
    setEditedCloset((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedFieldChange = (parent: 'coordinates', field: string, value: any) => {
    setEditedCloset((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    if (isNew && !editedCloset.id.trim()) {
      alert('Please enter a janitor closet ID')
      return
    }
    onSave(editedCloset)
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{isNew ? 'Add New Janitor Closet' : `Edit Janitor Closet: ${closet.id}`}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Basic Info */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                label="Janitor Closet ID"
                value={editedCloset.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                fullWidth
                size="small"
                required
                disabled={!isNew}
                helperText={isNew ? 'Unique identifier for this janitor closet' : 'ID cannot be changed'}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Terminal"
                value={editedCloset.terminal}
                onChange={(e) => handleFieldChange('terminal', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Level"
                value={editedCloset.level}
                onChange={(e) => handleFieldChange('level', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Zone"
                value={editedCloset.zone}
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
                value={editedCloset.coordinates.x}
                onChange={(e) => handleNestedFieldChange('coordinates', 'x', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Y"
                type="number"
                value={editedCloset.coordinates.y}
                onChange={(e) => handleNestedFieldChange('coordinates', 'y', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Z"
                type="number"
                value={editedCloset.coordinates.z}
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
          {isNew ? 'Add Closet' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default JanitorClosetEditDialog

