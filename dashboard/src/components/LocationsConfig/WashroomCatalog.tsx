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
} from '@mui/material'
import {
  Edit,
  Delete,
  Add,
  Search,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Washroom, WashroomType, WashroomStatus } from '../../types'
import WashroomDetailForm from './WashroomDetailForm'

function WashroomCatalog() {
  const { washrooms } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [terminalFilter, setTerminalFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingWashroom, setEditingWashroom] = useState<Washroom | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const filteredWashrooms = useMemo(() => {
    return washrooms.filter((washroom) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !washroom.id.toLowerCase().includes(searchLower) &&
          !washroom.name.toLowerCase().includes(searchLower) &&
          !washroom.terminal.toLowerCase().includes(searchLower) &&
          !(washroom.concourse?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Terminal filter
      if (terminalFilter !== 'all' && washroom.terminal !== terminalFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== 'all' && washroom.type !== typeFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && washroom.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [washrooms, searchTerm, terminalFilter, typeFilter, statusFilter])

  const terminals = Array.from(new Set(washrooms.map((w) => w.terminal)))
  const types: WashroomType[] = ['standard', 'family', 'accessible', 'staff-only', 'other']
  const statuses: WashroomStatus[] = ['active', 'inactive', 'closed']

  const handleEdit = (washroom: Washroom) => {
    setEditingWashroom(washroom)
  }

  const handleDelete = (washroom: Washroom) => {
    // TODO: Implement delete functionality
    console.log('Delete washroom', washroom.id)
  }

  const handleAdd = () => {
    setShowAddDialog(true)
  }

  const handleSave = (washroom: Washroom) => {
    // TODO: Save to Redux store/API
    console.log('Save washroom', washroom)
    setEditingWashroom(null)
    setShowAddDialog(false)
  }

  const handleCancel = () => {
    setEditingWashroom(null)
    setShowAddDialog(false)
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Washroom Catalog ({filteredWashrooms.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              size="small"
            >
              Add Washroom
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ minWidth: 200 }}
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
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Type">
                <MenuItem value="all">All</MenuItem>
                {types.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <MenuItem value="all">All</MenuItem>
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
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
                  <TableCell>Name</TableCell>
                  <TableCell>Terminal</TableCell>
                  <TableCell>Zone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredWashrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No washrooms found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWashrooms.map((washroom) => (
                    <TableRow key={washroom.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {washroom.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{washroom.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{washroom.terminal}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {washroom.concourse || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={washroom.type}
                          size="small"
                          color={washroom.type === 'accessible' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={washroom.status}
                          size="small"
                          color={
                            washroom.status === 'active'
                              ? 'success'
                              : washroom.status === 'closed'
                              ? 'error'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(washroom)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(washroom)}
                          color="error"
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

      {/* Edit/Add Dialog */}
      <Dialog
        open={Boolean(editingWashroom) || showAddDialog}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingWashroom ? 'Edit Washroom' : 'Add New Washroom'}
        </DialogTitle>
        <DialogContent>
          <WashroomDetailForm
            washroom={editingWashroom || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default WashroomCatalog

