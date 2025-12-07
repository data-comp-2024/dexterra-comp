/**
 * Washroom Edit Dialog - Edit coordinates and facility counts
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { BathroomCatalogItem } from '../../services/dataService'
import { useState, useEffect } from 'react'

interface WashroomEditDialogProps {
  bathroom: BathroomCatalogItem
  open: boolean
  onSave: (bathroom: BathroomCatalogItem) => void
  onCancel: () => void
  isNew?: boolean
}

function WashroomEditDialog({ bathroom, open, onSave, onCancel, isNew = false }: WashroomEditDialogProps) {
  const [editedBathroom, setEditedBathroom] = useState<BathroomCatalogItem>(bathroom)

  useEffect(() => {
    setEditedBathroom(bathroom)
  }, [bathroom])


  const handleFieldChange = (field: keyof BathroomCatalogItem, value: any) => {
    setEditedBathroom((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedFieldChange = (parent: 'coordinates' | 'facility_counts', field: string, value: any) => {
    setEditedBathroom((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    if (isNew && !editedBathroom.id.trim()) {
      alert('Please enter a bathroom ID')
      return
    }
    onSave(editedBathroom)
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{isNew ? 'Add New Bathroom' : `Edit Bathroom: ${bathroom.id}`}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Basic Info */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                label="Bathroom ID"
                value={editedBathroom.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                fullWidth
                size="small"
                required
                disabled={!isNew}
                helperText={isNew ? 'Unique identifier for this bathroom' : 'ID cannot be changed'}
              />
            </Grid>
            <Grid item xs={6}>
              {isNew ? (
                <TextField
                  label="Terminal"
                  value={editedBathroom.terminal}
                  onChange={(e) => handleFieldChange('terminal', e.target.value)}
                  fullWidth
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Terminal
                  </Typography>
                  <Typography variant="body1">{bathroom.terminal}</Typography>
                </>
              )}
            </Grid>
            <Grid item xs={6}>
              {isNew ? (
                <TextField
                  label="Level"
                  value={editedBathroom.level}
                  onChange={(e) => handleFieldChange('level', e.target.value)}
                  fullWidth
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Level
                  </Typography>
                  <Typography variant="body1">{bathroom.level}</Typography>
                </>
              )}
            </Grid>
            <Grid item xs={6}>
              {isNew ? (
                <TextField
                  label="Zone"
                  value={editedBathroom.zone}
                  onChange={(e) => handleFieldChange('zone', e.target.value)}
                  fullWidth
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Zone
                  </Typography>
                  <Typography variant="body1">{bathroom.zone}</Typography>
                </>
              )}
            </Grid>
            <Grid item xs={6}>
              {isNew ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editedBathroom.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="Men">Men</MenuItem>
                    <MenuItem value="Women">Women</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">{bathroom.gender}</Typography>
                </>
              )}
            </Grid>
            <Grid item xs={12}>
              {isNew ? (
                <TextField
                  label="Nearest Gate"
                  value={editedBathroom.nearest_gate}
                  onChange={(e) => handleFieldChange('nearest_gate', e.target.value)}
                  fullWidth
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Nearest Gate
                  </Typography>
                  <Typography variant="body1">{bathroom.nearest_gate}</Typography>
                </>
              )}
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Coordinates
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <TextField
                label="X"
                type="number"
                value={editedBathroom.coordinates.x}
                onChange={(e) => handleNestedFieldChange('coordinates', 'x', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Y"
                type="number"
                value={editedBathroom.coordinates.y}
                onChange={(e) => handleNestedFieldChange('coordinates', 'y', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Z"
                type="number"
                value={editedBathroom.coordinates.z}
                onChange={(e) => handleNestedFieldChange('coordinates', 'z', parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Facility Counts
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Stalls"
                type="number"
                value={editedBathroom.facility_counts.stalls}
                onChange={(e) => handleNestedFieldChange('facility_counts', 'stalls', parseInt(e.target.value, 10) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Urinals"
                type="number"
                value={editedBathroom.facility_counts.urinals}
                onChange={(e) => handleNestedFieldChange('facility_counts', 'urinals', parseInt(e.target.value, 10) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {isNew ? 'Add Bathroom' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default WashroomEditDialog

