import { Typography, Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import OptimizationControls, { OptimizationParameters } from '../components/Optimizer/OptimizationControls'
import TaskAssignmentsView from '../components/Optimizer/TaskAssignmentsView'
import { runOptimization, CleaningRequirement, CrewAssignment } from '../services/optimizerService'
import { generateCleaningRequirementsFromFlights } from '../services/flightBasedRequirements'
import { predictHappyScoresFromSchedule } from '../services/happyScorePrediction'
import { useOptimization } from '../context/OptimizationContext'
import { Task, TaskType, TaskPriority, TaskState } from '../types'
import { CURRENT_DATE } from '../constants'

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

function Optimizer() {
  const { tasks, crew, washrooms, flights } = useData()
  const { setOptimizedTasks } = useOptimization()
  const [isRunning, setIsRunning] = useState(false)
  const [proposedAssignments, setProposedAssignments] = useState<ProposedAssignment[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [happyScores, setHappyScores] = useState<Map<string, number>>(new Map())
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  // Filter out normal (non-emergency) tasks for Dec 31, 2024
  const filteredTasks = useMemo(() => {
    const todayStart = new Date(CURRENT_DATE)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    return tasks.filter((t) => {
      // If task is from today (Dec 31, 2024), only keep emergency tasks
      if (t.createdTime >= todayStart && t.createdTime < todayEnd) {
        return t.priority === 'emergency' || t.type === 'emergency_cleaning'
      }
      // Keep all tasks from other days
      return true
    })
  }, [tasks])

  const handleRunOptimization = async (params: OptimizationParameters) => {
    setIsRunning(true)
    try {
      // Use full day: Dec 31, 2024 (00:00 to 23:59)
      const dayStart = new Date(CURRENT_DATE)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(CURRENT_DATE)
      dayEnd.setHours(23, 59, 59, 999)
      const simulationDurationHours = 24

      // Get active crew members (whose shifts overlap with Dec 31, 2024)
      const activeCrew = crew.filter((c) => {
        const shiftStart = c.shift.startTime
        const shiftEnd = c.shift.endTime
        
        // Check if shift overlaps with Dec 31, 2024
        const shiftStartDate = new Date(shiftStart)
        shiftStartDate.setHours(0, 0, 0, 0)
        const shiftEndDate = new Date(shiftEnd)
        shiftEndDate.setHours(23, 59, 59, 999)
        
        const dec31Start = new Date(dayStart)
        const dec31End = new Date(dayEnd)
        
        // Shift overlaps if it starts before Dec 31 ends and ends after Dec 31 starts
        const overlaps = shiftStartDate <= dec31End && shiftEndDate >= dec31Start
        
        return overlaps && c.status !== 'off_shift'
      })

      // Generate cleaning requirements from flights for the full day
      const cleaningRequirements = generateCleaningRequirementsFromFlights(
        flights,
        washrooms,
        params.cleaningFrequencyHours,
        dayStart,
        simulationDurationHours
      )

      // Run optimization for full day with 1 minute time steps
      const result = runOptimization(
        filteredTasks,
        activeCrew,
        washrooms,
        cleaningRequirements,
        simulationDurationHours,
        1, // 1 minute time step
        params.cleaningFrequencyHours // Pass cleaning frequency
      )

      setOptimizationResult(result)

      // Predict happy scores based on schedule
      const predictedScores = predictHappyScoresFromSchedule(
        washrooms.map((w) => w.id),
        result.assignments.map((a) => ({ washroomId: a.washroomId, startTime: a.startTime })),
        CURRENT_DATE
      )
      setHappyScores(predictedScores)

      // Convert assignments to Task format for Assignment page
      const optimizedTasks: Task[] = result.assignments.map((assignment: CrewAssignment, index: number) => {
        const washroom = washrooms.find((w) => w.id === assignment.washroomId)
        const predictedScore = predictedScores.get(assignment.washroomId) || 85

        return {
          id: assignment.taskId,
          type: 'routine_cleaning' as TaskType,
          washroomId: assignment.washroomId,
          priority: 'normal' as TaskPriority,
          state: 'assigned' as TaskState,
          assignedCrewId: assignment.crewId,
          createdTime: assignment.startTime,
          startedTime: assignment.startTime,
          estimatedDurationMinutes: assignment.cleaningDurationMinutes,
          slaDeadline: new Date(assignment.endTime.getTime() + 30 * 60 * 1000), // 30 min buffer
        }
      })

      // Store optimized tasks in context
      setOptimizedTasks(optimizedTasks)

      // Convert optimization results to ProposedAssignment format
      const proposals: ProposedAssignment[] = result.assignments.map((assignment: CrewAssignment) => {
        const task = filteredTasks.find((t) => t.id === assignment.taskId)
        return {
          taskId: assignment.taskId,
          currentCrewId: task?.assignedCrewId,
          proposedCrewId: assignment.crewId,
          currentStartTime: task?.startedTime,
          proposedStartTime: assignment.startTime,
          improvement: {
            walkingDistanceReduction: assignment.travelTimeMinutes * 10, // Approximate
            responseTimeImprovement: task?.priority === 'emergency' ? assignment.travelTimeMinutes : undefined,
            slaCompliance: true,
          },
        }
      })

      setProposedAssignments(proposals)
      setSelectedTaskIds(new Set(proposals.map((p) => p.taskId)))
    } catch (error) {
      console.error('Optimization error:', error)
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to run optimization',
        severity: 'error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSelectAssignment = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTaskIds)
    if (selected) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTaskIds(newSelected)
  }

  const handleApply = () => {
    setShowApplyDialog(true)
  }

  const handleConfirmApply = () => {
    // Tasks are already stored in context via setOptimizedTasks
    // This confirms the optimization plan
    const toApply = proposedAssignments.filter((a) => selectedTaskIds.has(a.taskId))
    console.log('Applying assignments:', toApply)
    
    setShowApplyDialog(false)
    setSnackbar({
      open: true,
      message: `Successfully applied ${toApply.length} assignment(s). Tasks are now visible in Assignments page.`,
      severity: 'success',
    })
  }

  const handleDiscard = () => {
    setShowCancelDialog(true)
  }

  const handleConfirmDiscard = () => {
    setShowCancelDialog(false)
    setProposedAssignments([])
    setSelectedTaskIds(new Set())
    setSnackbar({
      open: true,
      message: 'Optimization proposals discarded',
      severity: 'success',
    })
  }


  return (
    <Box>
      {/* <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Optimizer (Craptimizer)
      </Typography> */}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column: Controls and Results */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Optimization Controls */}
            <OptimizationControls 
              onRunOptimization={handleRunOptimization} 
              isRunning={isRunning}
              autoRun={true}
            />

            {/* Emergency Responsiveness */}
            {optimizationResult?.metrics?.emergencyResponsiveness && (
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Emergency Responsiveness Analysis
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average Response Time
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        color:
                          optimizationResult.metrics.emergencyResponsiveness.avgResponseTimeMinutes <= 10
                            ? 'success.main'
                            : optimizationResult.metrics.emergencyResponsiveness.avgResponseTimeMinutes <= 15
                            ? 'warning.main'
                            : 'error.main',
                      }}
                    >
                      {optimizationResult.metrics.emergencyResponsiveness.avgResponseTimeMinutes.toFixed(1)} min
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Best Case
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {optimizationResult.metrics.emergencyResponsiveness.minResponseTimeMinutes.toFixed(1)} min
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Worst Case
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        {optimizationResult.metrics.emergencyResponsiveness.maxResponseTimeMinutes.toFixed(1)} min
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Crew Availability Rate
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {optimizationResult.metrics.emergencyResponsiveness.availabilityRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg {optimizationResult.metrics.emergencyResponsiveness.avgCrewAvailable.toFixed(1)} crew available
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Based on the optimized schedule, the system can respond to emergencies with an average response time of{' '}
                  {optimizationResult.metrics.emergencyResponsiveness.avgResponseTimeMinutes.toFixed(1)} minutes.
                  {optimizationResult.metrics.emergencyResponsiveness.availabilityRate >= 90
                    ? ' Crew availability is excellent throughout the day.'
                    : optimizationResult.metrics.emergencyResponsiveness.availabilityRate >= 75
                    ? ' Crew availability is good, but some periods may have limited coverage.'
                    : ' Crew availability may be limited during some periods.'}
                </Typography>
              </Box>
            )}

            {/* Happy Score Prediction */}
            {happyScores.size > 0 && (
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Predicted Happy Scores
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto' }}>
                  {Array.from(happyScores.entries()).map(([washroomId, score]) => {
                    const washroom = washrooms.find((w) => w.id === washroomId)
                    return (
                      <Box
                        key={washroomId}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {washroom?.name || washroomId}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            color:
                              score >= 85
                                ? 'success.main'
                                : score >= 70
                                ? 'warning.main'
                                : 'error.main',
                          }}
                        >
                          {score.toFixed(1)}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            {proposedAssignments.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={handleApply}
                  fullWidth
                >
                  Apply All
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Apply selected only
                    const toApply = proposedAssignments.filter((a) => selectedTaskIds.has(a.taskId))
                    console.log('Applying selected:', toApply)
                    setSnackbar({
                      open: true,
                      message: `Applied ${toApply.length} selected assignment(s)`,
                      severity: 'success',
                    })
                    setProposedAssignments([])
                    setSelectedTaskIds(new Set())
                  }}
                  disabled={selectedTaskIds.size === 0}
                  fullWidth
                >
                  Apply Selected ({selectedTaskIds.size})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleDiscard}
                  fullWidth
                  color="error"
                >
                  Discard
                </Button>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Right Column: Task Assignments View */}
        {optimizationResult && (
          <Grid item xs={12} md={8}>
            <TaskAssignmentsView
              assignments={optimizationResult.assignments}
              crewSchedules={optimizationResult.crewSchedules}
              crew={crew}
              washrooms={washrooms}
            />
          </Grid>
        )}
      </Grid>

      {/* Apply Confirmation Dialog */}
      <Dialog open={showApplyDialog} onClose={() => setShowApplyDialog(false)}>
        <DialogTitle>Apply Optimization Plan?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will apply {proposedAssignments.length} proposed assignment(s) to the current plan.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApplyDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmApply} variant="contained" autoFocus>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Discard Optimization Plan?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will discard all proposed assignments. You can run optimization again later.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDiscard} variant="contained" color="error" autoFocus>
            Discard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Optimizer


