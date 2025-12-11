/**
 * Audit Details - Detailed audit table view
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
  Paper,
  Chip,
  TablePagination,
} from '@mui/material'
import { useMemo, useState, useEffect } from 'react'
import { loadAuditData, AuditRecord } from '../../services/dataService'
import { TimeRange } from './TimeRangeSelector'
import { format } from 'date-fns'

interface AuditDetailsProps {
  timeRange: TimeRange
}

function AuditDetails({ timeRange }: AuditDetailsProps) {
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadAuditData()
        setAudits(data)
      } catch (error) {
        console.error('Failed to load audit data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter audits by time range and sort by date (newest first)
  const filteredAudits = useMemo(() => {
    return audits
      .filter((audit) => {
        return audit.dt >= timeRange.start && audit.dt <= timeRange.end
      })
      .sort((a, b) => b.dt.getTime() - a.dt.getTime())
  }, [audits, timeRange])

  const paginatedAudits = useMemo(() => {
    return filteredAudits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredAudits, page, rowsPerPage])

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredAudits.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        targetMet: 0,
        targetMissed: 0,
        targetMetPercent: 0,
      }
    }

    const targetMet = filteredAudits.filter((a) => a.totalScore >= a.targetScore).length
    const targetMissed = filteredAudits.length - targetMet
    const avgScore = filteredAudits.reduce((sum, a) => sum + a.totalScore, 0) / filteredAudits.length

    return {
      total: filteredAudits.length,
      avgScore,
      targetMet,
      targetMissed,
      targetMetPercent: (targetMet / filteredAudits.length) * 100,
    }
  }, [filteredAudits])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading audit data...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Detailed Audit Records
        </Typography>

        {/* Summary Statistics */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Total Audits: ${summaryStats.total}`} color="primary" />
          <Chip label={`Avg Score: ${summaryStats.avgScore.toFixed(2)}%`} color="default" />
          <Chip
            label={`Target Met: ${summaryStats.targetMet} (${summaryStats.targetMetPercent.toFixed(1)}%)`}
            color="success"
          />
          <Chip
            label={`Target Missed: ${summaryStats.targetMissed} (${(100 - summaryStats.targetMetPercent).toFixed(1)}%)`}
            color="error"
          />
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Audit ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Crew Member</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Bathroom</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Target Score</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total Score</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No audit records found for the selected time range</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAudits.map((audit) => {
                  const targetMet = audit.totalScore >= audit.targetScore
                  return (
                    <TableRow key={audit.auditId} hover>
                      <TableCell>{audit.auditId}</TableCell>
                      <TableCell>{format(audit.dt, 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>{audit.name || 'N/A'}</TableCell>
                      <TableCell>{audit.bathroom || 'N/A'}</TableCell>
                      <TableCell>{audit.targetScore.toFixed(2)}%</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              color: targetMet ? 'success.main' : 'error.main',
                            }}
                          >
                            {audit.totalScore.toFixed(2)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={targetMet ? 'Met' : 'Missed'}
                          color={targetMet ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredAudits.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </CardContent>
    </Card>
  )
}

export default AuditDetails
