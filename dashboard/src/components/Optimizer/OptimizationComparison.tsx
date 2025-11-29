/**
 * Optimization Comparison - Current vs Proposed assignments
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Checkbox,
} from '@mui/material'
import {
  CheckCircle,
  Cancel,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material'
import { useState } from 'react'
import { Task, Crew } from '../../types'
import { format } from 'date-fns'

interface ProposedAssignment {
  taskId: string
  currentCrewId?: string
  proposedCrewId?: string
  currentStartTime?: Date
  proposedStartTime?: Date
  improvement?: {
    walkingDistanceReduction?: number
    responseTimeImprovement?: number
    slaCompliance?: boolean
  }
}

interface OptimizationComparisonProps {
  currentTasks: Task[]
  proposedAssignments: ProposedAssignment[]
  crew: Crew[]
  onSelectAssignment: (taskId: string, selected: boolean) => void
  selectedTaskIds: Set<string>
}

function OptimizationComparison({
  currentTasks,
  proposedAssignments,
  crew,
  onSelectAssignment,
  selectedTaskIds,
}: OptimizationComparisonProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'comparison'>('comparison')

  const getCrewName = (crewId?: string) => {
    if (!crewId) return 'Unassigned'
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember?.name || crewId
  }

  const getTaskInfo = (taskId: string) => {
    return currentTasks.find((t) => t.id === taskId)
  }

  const improvements = {
    overdueTasksReduced: proposedAssignments.filter(
      (a) => a.improvement?.slaCompliance === true
    ).length,
    walkingDistanceReduced: proposedAssignments.reduce(
      (sum, a) => sum + (a.improvement?.walkingDistanceReduction || 0),
      0
    ),
    responseTimeImproved: proposedAssignments.filter(
      (a) => (a.improvement?.responseTimeImprovement || 0) > 0
    ).length,
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Current vs Proposed Plan
          </Typography>
          <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} size="small">
            <Tab label="Comparison" value="comparison" />
            <Tab label="Side-by-Side" value="side-by-side" />
          </Tabs>
        </Box>

        {/* Improvement Indicators */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            icon={<TrendingDown />}
            label={`${improvements.overdueTasksReduced} fewer overdue tasks`}
            color="success"
            size="small"
          />
          <Chip
            icon={<TrendingDown />}
            label={`${Math.round(improvements.walkingDistanceReduced)}m less walking`}
            color="success"
            size="small"
          />
          <Chip
            icon={<TrendingUp />}
            label={`${improvements.responseTimeImproved} faster responses`}
            color="success"
            size="small"
          />
        </Box>

        {viewMode === 'comparison' ? (
          <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Select</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Washroom</TableCell>
                  <TableCell>Current Assignment</TableCell>
                  <TableCell>Proposed Assignment</TableCell>
                  <TableCell>Improvements</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposedAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No proposed assignments. Run optimization first.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  proposedAssignments.map((assignment) => {
                    const task = getTaskInfo(assignment.taskId)
                    const hasChanges =
                      assignment.currentCrewId !== assignment.proposedCrewId

                    return (
                      <TableRow key={assignment.taskId} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedTaskIds.has(assignment.taskId)}
                            onChange={(e) =>
                              onSelectAssignment(assignment.taskId, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {task?.type.replace('_', ' ') || assignment.taskId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task?.priority}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{task?.washroomId || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {assignment.currentCrewId ? (
                              <>
                                <CheckCircle fontSize="small" color="success" />
                                <Typography variant="body2">
                                  {getCrewName(assignment.currentCrewId)}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Cancel fontSize="small" color="error" />
                                <Typography variant="body2" color="text.secondary">
                                  Unassigned
                                </Typography>
                              </>
                            )}
                          </Box>
                          {assignment.currentStartTime && (
                            <Typography variant="caption" color="text.secondary">
                              {format(assignment.currentStartTime, 'HH:mm')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              bgcolor: hasChanges ? 'action.hover' : 'transparent',
                              p: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            {assignment.proposedCrewId ? (
                              <>
                                <CheckCircle fontSize="small" color="primary" />
                                <Typography variant="body2" sx={{ fontWeight: hasChanges ? 600 : 400 }}>
                                  {getCrewName(assignment.proposedCrewId)}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Cancel fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  Unassigned
                                </Typography>
                              </>
                            )}
                          </Box>
                          {assignment.proposedStartTime && (
                            <Typography variant="caption" color="text.secondary">
                              {format(assignment.proposedStartTime, 'HH:mm')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.improvement && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {assignment.improvement.walkingDistanceReduction && (
                                <Chip
                                  label={`-${assignment.improvement.walkingDistanceReduction}m`}
                                  size="small"
                                  color="success"
                                  icon={<TrendingDown />}
                                />
                              )}
                              {assignment.improvement.responseTimeImprovement && (
                                <Chip
                                  label={`-${assignment.improvement.responseTimeImprovement}m`}
                                  size="small"
                                  color="success"
                                  icon={<TrendingUp />}
                                />
                              )}
                              {assignment.improvement.slaCompliance && (
                                <Chip label="SLA OK" size="small" color="success" />
                              )}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Current Assignments */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Current Assignments
              </Typography>
              <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Task</TableCell>
                      <TableCell>Crew</TableCell>
                      <TableCell>Start Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentTasks
                      .filter((t) => t.assignedCrewId)
                      .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.type.replace('_', ' ')}</TableCell>
                          <TableCell>{getCrewName(task.assignedCrewId)}</TableCell>
                          <TableCell>
                            {task.startedTime ? format(task.startedTime, 'HH:mm') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Proposed Assignments */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Proposed Assignments
              </Typography>
              <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Task</TableCell>
                      <TableCell>Crew</TableCell>
                      <TableCell>Start Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {proposedAssignments.map((assignment) => {
                      const task = getTaskInfo(assignment.taskId)
                      return (
                        <TableRow key={assignment.taskId}>
                          <TableCell>{task?.type.replace('_', ' ') || '-'}</TableCell>
                          <TableCell>{getCrewName(assignment.proposedCrewId)}</TableCell>
                          <TableCell>
                            {assignment.proposedStartTime
                              ? format(assignment.proposedStartTime, 'HH:mm')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default OptimizationComparison

