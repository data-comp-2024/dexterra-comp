/**
 * Gates Catalog - Table of all gates with search/filter
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
import { useLocation } from 'react-router-dom'
import { GateItem, loadGates } from '../../services/dataService'
import GateEditDialog from './GateEditDialog'

function GatesCatalog() {
  const location = useLocation()
  const [gates, setGates] = useState<GateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [terminalFilter, setTerminalFilter] = useState<string>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [editingGate, setEditingGate] = useState<GateItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deletingGate, setDeletingGate] = useState<GateItem | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Parse search query
  const searchParams = new URLSearchParams(location.search)
  const searchId = searchParams.get('search')

  // Auto-filter by search ID if present
  useEffect(() => {
    if (searchId) {
      setSearchTerm(searchId)
    }
  }, [searchId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const data = await loadGates()
      setGates(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredGates = useMemo(() => {
    return gates.filter((gate) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !gate.id.toLowerCase().includes(searchLower) &&
          !gate.terminal.toLowerCase().includes(searchLower) &&
          !gate.zone.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Terminal filter
      if (terminalFilter !== 'all' && gate.terminal !== terminalFilter) {
        return false
      }

      // Zone filter
      if (zoneFilter !== 'all' && gate.zone !== zoneFilter) {
        return false
      }

      return true
    })
  }, [gates, searchTerm, terminalFilter, zoneFilter])

  const terminals = Array.from(new Set(gates.map((g) => g.terminal))).sort()
  const zones = Array.from(new Set(gates.map((g) => g.zone))).sort()

  const handleEdit = (gate: GateItem) => {
    setEditingGate(gate)
    setShowEditDialog(true)
  }

  const handleSave = (updatedGate: GateItem) => {
    setGates((prev) =>
      prev.map((g) => (g.id === updatedGate.id ? updatedGate : g))
    )
    setEditingGate(null)
    setShowEditDialog(false)
    // TODO: Save to backend/API
    console.log('Save gate', updatedGate)
  }

  const handleCancel = () => {
    setEditingGate(null)
    setShowEditDialog(false)
  }

  const handleAdd = () => {
    setShowAddDialog(true)
  }

  const handleAddSave = (newGate: GateItem) => {
    // Check if ID already exists
    if (gates.some((g) => g.id === newGate.id)) {
      alert(`Gate with ID "${newGate.id}" already exists. Please use a different ID.`)
      return
    }
    setGates((prev) => [...prev, newGate])
    setShowAddDialog(false)
    // TODO: Save to backend/API
    console.log('Add gate', newGate)
  }

  const handleAddCancel = () => {
    setShowAddDialog(false)
  }

  const handleDelete = (gate: GateItem) => {
    setDeletingGate(gate)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingGate) {
      setGates((prev) => prev.filter((g) => g.id !== deletingGate.id))
      setDeletingGate(null)
      setShowDeleteDialog(false)
      // TODO: Delete from backend/API
      console.log('Delete gate', deletingGate.id)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingGate(null)
    setShowDeleteDialog(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading gates catalog...
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
              Gates Catalog ({filteredGates.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              size="small"
            >
              Add Gate
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search by ID, terminal, or zone..."
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
          </Box>

          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Terminal</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Zone</TableCell>
                  <TableCell>Coordinates</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No gates found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGates.map((gate) => (
                    <TableRow key={gate.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {gate.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{gate.terminal}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{gate.level}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{gate.zone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          ({gate.coordinates.x.toFixed(1)}, {gate.coordinates.y.toFixed(1)})
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(gate)}
                          color="primary"
                          aria-label="Edit gate"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(gate)}
                          color="error"
                          aria-label="Delete gate"
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
      {editingGate && (
        <GateEditDialog
          gate={editingGate}
          open={showEditDialog}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <GateEditDialog
          gate={{
            id: '',
            terminal: 'T1',
            level: '2',
            zone: 'Post Security',
            type: 'Gate',
            coordinates: { x: 0, y: 0, z: 0 },
          }}
          open={showAddDialog}
          onSave={handleAddSave}
          onCancel={handleAddCancel}
          isNew={true}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Gate?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete gate <strong>{deletingGate?.id}</strong>? This action cannot be undone.
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

export default GatesCatalog

