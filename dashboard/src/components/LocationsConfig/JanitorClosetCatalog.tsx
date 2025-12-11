/**
 * Janitor Closet Catalog - Table of all janitor closets with search/filter
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
import { JanitorClosetItem, loadJanitorClosets } from '../../services/dataService'
import JanitorClosetEditDialog from './JanitorClosetEditDialog'

function JanitorClosetCatalog() {
  const location = useLocation()
  const [closets, setClosets] = useState<JanitorClosetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [terminalFilter, setTerminalFilter] = useState<string>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [editingCloset, setEditingCloset] = useState<JanitorClosetItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deletingCloset, setDeletingCloset] = useState<JanitorClosetItem | null>(null)
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
      const data = await loadJanitorClosets()
      setClosets(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredClosets = useMemo(() => {
    return closets.filter((closet) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !closet.id.toLowerCase().includes(searchLower) &&
          !closet.terminal.toLowerCase().includes(searchLower) &&
          !closet.zone.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Terminal filter
      if (terminalFilter !== 'all' && closet.terminal !== terminalFilter) {
        return false
      }

      // Zone filter
      if (zoneFilter !== 'all' && closet.zone !== zoneFilter) {
        return false
      }

      return true
    })
  }, [closets, searchTerm, terminalFilter, zoneFilter])

  const terminals = Array.from(new Set(closets.map((c) => c.terminal))).sort()
  const zones = Array.from(new Set(closets.map((c) => c.zone))).sort()

  const handleEdit = (closet: JanitorClosetItem) => {
    setEditingCloset(closet)
    setShowEditDialog(true)
  }

  const handleSave = (updatedCloset: JanitorClosetItem) => {
    setClosets((prev) =>
      prev.map((c) => (c.id === updatedCloset.id ? updatedCloset : c))
    )
    setEditingCloset(null)
    setShowEditDialog(false)
    // TODO: Save to backend/API
    console.log('Save janitor closet', updatedCloset)
  }

  const handleCancel = () => {
    setEditingCloset(null)
    setShowEditDialog(false)
  }

  const handleAdd = () => {
    setShowAddDialog(true)
  }

  const handleAddSave = (newCloset: JanitorClosetItem) => {
    // Check if ID already exists
    if (closets.some((c) => c.id === newCloset.id)) {
      alert(`Janitor closet with ID "${newCloset.id}" already exists. Please use a different ID.`)
      return
    }
    setClosets((prev) => [...prev, newCloset])
    setShowAddDialog(false)
    // TODO: Save to backend/API
    console.log('Add janitor closet', newCloset)
  }

  const handleAddCancel = () => {
    setShowAddDialog(false)
  }

  const handleDelete = (closet: JanitorClosetItem) => {
    setDeletingCloset(closet)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingCloset) {
      setClosets((prev) => prev.filter((c) => c.id !== deletingCloset.id))
      setDeletingCloset(null)
      setShowDeleteDialog(false)
      // TODO: Delete from backend/API
      console.log('Delete janitor closet', deletingCloset.id)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingCloset(null)
    setShowDeleteDialog(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading janitor closets catalog...
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
              Janitor Closets Catalog ({filteredClosets.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              size="small"
            >
              Add Closet
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
                {filteredClosets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No janitor closets found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClosets.map((closet) => (
                    <TableRow key={closet.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {closet.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{closet.terminal}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{closet.level}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{closet.zone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          ({closet.coordinates.x.toFixed(1)}, {closet.coordinates.y.toFixed(1)})
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(closet)}
                          color="primary"
                          aria-label="Edit janitor closet"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(closet)}
                          color="error"
                          aria-label="Delete janitor closet"
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
      {editingCloset && (
        <JanitorClosetEditDialog
          closet={editingCloset}
          open={showEditDialog}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <JanitorClosetEditDialog
          closet={{
            id: '',
            terminal: 'T1',
            level: '2',
            zone: 'Post Security',
            type: 'Janitor Closet',
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
        <DialogTitle>Delete Janitor Closet?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete janitor closet <strong>{deletingCloset?.id}</strong>? This action cannot be undone.
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

export default JanitorClosetCatalog

