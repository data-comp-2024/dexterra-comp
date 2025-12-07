/**
 * Washroom Catalog - Table of all washrooms with search/filter
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material'
import {
  Edit,
  Delete,
  Add,
  Search,
} from '@mui/icons-material'
import { useState, useMemo, useEffect } from 'react'
import { BathroomCatalogItem, loadBathroomCatalog } from '../../services/dataService'
import WashroomEditDialog from './WashroomEditDialog'

function WashroomCatalog() {
  const [bathrooms, setBathrooms] = useState<BathroomCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [terminalFilter, setTerminalFilter] = useState<string>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [editingBathroom, setEditingBathroom] = useState<BathroomCatalogItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deletingBathroom, setDeletingBathroom] = useState<BathroomCatalogItem | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const data = await loadBathroomCatalog()
      setBathrooms(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredBathrooms = useMemo(() => {
    return bathrooms.filter((bathroom) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !bathroom.id.toLowerCase().includes(searchLower) &&
          !bathroom.terminal.toLowerCase().includes(searchLower) &&
          !bathroom.zone.toLowerCase().includes(searchLower) &&
          !bathroom.nearest_gate.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Terminal filter
      if (terminalFilter !== 'all' && bathroom.terminal !== terminalFilter) {
        return false
      }

      // Zone filter
      if (zoneFilter !== 'all' && bathroom.zone !== zoneFilter) {
        return false
      }

      // Gender filter
      if (genderFilter !== 'all' && bathroom.gender !== genderFilter) {
        return false
      }

      return true
    })
  }, [bathrooms, searchTerm, terminalFilter, zoneFilter, genderFilter])

  const terminals = Array.from(new Set(bathrooms.map((b) => b.terminal))).sort()
  const zones = Array.from(new Set(bathrooms.map((b) => b.zone))).sort()
  const genders: ('Men' | 'Women')[] = ['Men', 'Women']

  const handleEdit = (bathroom: BathroomCatalogItem) => {
    setEditingBathroom(bathroom)
    setShowEditDialog(true)
  }

  const handleSave = (updatedBathroom: BathroomCatalogItem) => {
    // Update the bathroom in the list
    setBathrooms((prev) =>
      prev.map((b) => (b.id === updatedBathroom.id ? updatedBathroom : b))
    )
    setEditingBathroom(null)
    setShowEditDialog(false)
    // TODO: Save to backend/API
    console.log('Save bathroom', updatedBathroom)
  }

  const handleCancel = () => {
    setEditingBathroom(null)
    setShowEditDialog(false)
  }

  const handleAdd = () => {
    setShowAddDialog(true)
  }

  const handleAddSave = (newBathroom: BathroomCatalogItem) => {
    // Check if ID already exists
    if (bathrooms.some((b) => b.id === newBathroom.id)) {
      alert(`Bathroom with ID "${newBathroom.id}" already exists. Please use a different ID.`)
      return
    }
    setBathrooms((prev) => [...prev, newBathroom])
    setShowAddDialog(false)
    // TODO: Save to backend/API
    console.log('Add bathroom', newBathroom)
  }

  const handleAddCancel = () => {
    setShowAddDialog(false)
  }

  const handleDelete = (bathroom: BathroomCatalogItem) => {
    setDeletingBathroom(bathroom)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingBathroom) {
      setBathrooms((prev) => prev.filter((b) => b.id !== deletingBathroom.id))
      setDeletingBathroom(null)
      setShowDeleteDialog(false)
      // TODO: Delete from backend/API
      console.log('Delete bathroom', deletingBathroom.id)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingBathroom(null)
    setShowDeleteDialog(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading bathroom catalog...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Washroom Catalog ({filteredBathrooms.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              size="small"
            >
              Add Bathroom
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search by ID, terminal, zone, or gate..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Terminal</InputLabel>
              <Select value={terminalFilter} onChange={(e) => setTerminalFilter(e.target.value)} label="Terminal">
                <MenuItem value="all">All</MenuItem>
                {terminals.map((term) => (
                  <MenuItem key={term} value={term}>
                    {term}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Zone</InputLabel>
              <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} label="Zone">
                <MenuItem value="all">All</MenuItem>
                {zones.map((zone) => (
                  <MenuItem key={zone} value={zone}>
                    {zone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} label="Type">
                <MenuItem value="all">All</MenuItem>
                {genders.map((gender) => (
                  <MenuItem key={gender} value={gender}>
                    {gender}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Terminal</TableCell>
                  <TableCell>Zone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBathrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No bathrooms found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBathrooms.map((bathroom) => (
                    <TableRow key={bathroom.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {bathroom.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{bathroom.terminal}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{bathroom.zone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bathroom.gender}
                          size="small"
                          color={bathroom.gender === 'Men' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label="Active" size="small" color="success" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(bathroom)}
                          color="primary"
                          aria-label="Edit bathroom"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(bathroom)}
                          color="error"
                          aria-label="Delete bathroom"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingBathroom && (
        <WashroomEditDialog
          bathroom={editingBathroom}
          open={showEditDialog}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <WashroomEditDialog
          bathroom={{
            id: '',
            terminal: 'T1',
            level: '2',
            zone: 'Post Security',
            gender: 'Men',
            nearest_gate: '',
            coordinates: { x: 0, y: 0, z: 0 },
            facility_counts: { stalls: 0, urinals: 0 },
          }}
          open={showAddDialog}
          onSave={handleAddSave}
          onCancel={handleAddCancel}
          isNew={true}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Bathroom?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete bathroom <strong>{deletingBathroom?.id}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default WashroomCatalog

