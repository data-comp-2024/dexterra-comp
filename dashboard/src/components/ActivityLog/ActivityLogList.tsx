/**
 * Activity Log List - Table of log entries with search and filter
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TablePagination,
} from '@mui/material'
import {
  Search,
  FilterList,
  Visibility,
  ContentCopy,
  Clear,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { ActivityLogEntry } from '../../types'
import { format } from 'date-fns'

function ActivityLogList() {
  const { activityLog, washrooms, crew } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const filteredEntries = useMemo(() => {
    let filtered = activityLog

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((entry) => {
        return (
          entry.userName.toLowerCase().includes(searchLower) ||
          entry.actionType.toLowerCase().includes(searchLower) ||
          entry.affectedEntityId.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.details).toLowerCase().includes(searchLower)
        )
      })
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.userId === userFilter)
    }

    // Action type filter
    if (actionTypeFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.actionType === actionTypeFilter)
    }

    // Entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.affectedEntityType === entityTypeFilter)
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate)
      filtered = filtered.filter((entry) => entry.timestamp >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((entry) => entry.timestamp <= end)
    }

    return filtered
  }, [activityLog, searchTerm, userFilter, actionTypeFilter, entityTypeFilter, startDate, endDate])

  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredEntries, page, rowsPerPage])

  const uniqueUsers = Array.from(new Set(activityLog.map((e) => e.userId)))
  const actionTypes: ActivityLogEntry['actionType'][] = [
    'task_assigned',
    'task_reassigned',
    'task_cancelled',
    'task_priority_changed',
    'optimization_run',
    'config_changed',
    'crew_availability_changed',
  ]
  const entityTypes: ActivityLogEntry['affectedEntityType'][] = ['task', 'washroom', 'crew', 'config']

  const handleClearFilters = () => {
    setSearchTerm('')
    setUserFilter('all')
    setActionTypeFilter('all')
    setEntityTypeFilter('all')
    setStartDate('')
    setEndDate('')
    setPage(0)
  }

  const handleCopyToClipboard = (entry: ActivityLogEntry) => {
    const text = JSON.stringify(entry, null, 2)
    navigator.clipboard.writeText(text)
    // TODO: Show success notification
  }

  const getActionTypeColor = (actionType: ActivityLogEntry['actionType']) => {
    switch (actionType) {
      case 'task_assigned':
      case 'task_reassigned':
        return 'primary'
      case 'task_cancelled':
        return 'error'
      case 'task_priority_changed':
        return 'warning'
      case 'optimization_run':
        return 'success'
      case 'config_changed':
        return 'info'
      case 'crew_availability_changed':
      case 'crew_updated':
        return 'info'
      case 'washroom_deleted':
        return 'error'
      default:
        return 'default'
    }
  }

  const getEntityName = (entry: ActivityLogEntry) => {
    if (entry.affectedEntityType === 'washroom') {
      const washroom = washrooms.find((w) => w.id === entry.affectedEntityId)
      if (washroom) return washroom.name
      if (entry.actionType === 'washroom_deleted' && entry.details?.deletedWashroom) {
        return (entry.details.deletedWashroom as any).name || entry.affectedEntityId
      }
      return entry.affectedEntityId
    }
    if (entry.affectedEntityType === 'crew') {
      const crewMember = crew.find((c) => c.id === entry.affectedEntityId)
      return crewMember?.name || entry.affectedEntityId
    }
    return entry.affectedEntityId
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Activity Log ({filteredEntries.length})
            </Typography>
            <Button
              startIcon={<Clear />}
              onClick={handleClearFilters}
              size="small"
              disabled={
                searchTerm === '' &&
                userFilter === 'all' &&
                actionTypeFilter === 'all' &&
                entityTypeFilter === 'all' &&
                startDate === '' &&
                endDate === ''
              }
            >
              Clear Filters
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>User</InputLabel>
              <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} label="User">
                <MenuItem value="all">All</MenuItem>
                {uniqueUsers.map((userId) => {
                  const entry = activityLog.find((e) => e.userId === userId)
                  return (
                    <MenuItem key={userId} value={userId}>
                      {entry?.userName || userId}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                label="Action Type"
              >
                <MenuItem value="all">All</MenuItem>
                {actionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                label="Entity Type"
              >
                <MenuItem value="all">All</MenuItem>
                {entityTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
          </Box>

          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No log entries found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {format(entry.timestamp, 'MMM d, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(entry.timestamp, 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{entry.userName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.actionType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          size="small"
                          color={getActionTypeColor(entry.actionType) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{getEntityName(entry)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.affectedEntityType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
                          {JSON.stringify(entry.details).substring(0, 50)}...
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedEntry(entry)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyToClipboard(entry)}
                          color="default"
                        >
                          <ContentCopy />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredEntries.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedEntry && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Log Entry Details</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyToClipboard(selectedEntry)}
                >
                  <ContentCopy />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {format(selectedEntry.timestamp, 'PPpp')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1">{selectedEntry.userName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Action Type
                  </Typography>
                  <Chip
                    label={selectedEntry.actionType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    size="small"
                    color={getActionTypeColor(selectedEntry.actionType) as any}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Affected Entity
                  </Typography>
                  <Typography variant="body1">
                    {getEntityName(selectedEntry)} ({selectedEntry.affectedEntityType})
                  </Typography>
                </Grid>
                {selectedEntry.beforeValues && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Before Values
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'error.light',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {JSON.stringify(selectedEntry.beforeValues, null, 2)}
                    </Box>
                  </Grid>
                )}
                {selectedEntry.afterValues && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      After Values
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'success.light',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {JSON.stringify(selectedEntry.afterValues, null, 2)}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Details
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedEntry(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

export default ActivityLogList

