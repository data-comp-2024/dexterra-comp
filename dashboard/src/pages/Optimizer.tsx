import { Typography, Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import { useState } from 'react'
import { useData } from '../hooks/useData'
import OptimizationControls, { OptimizationParameters } from '../components/Optimizer/OptimizationControls'
import OptimizationComparison from '../components/Optimizer/OptimizationComparison'
import OptimizationResults from '../components/Optimizer/OptimizationResults'

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
  const { tasks, crew } = useData()
  const [isRunning, setIsRunning] = useState(false)
  const [proposedAssignments, setProposedAssignments] = useState<ProposedAssignment[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const handleRunOptimization = async (params: OptimizationParameters) => {
    setIsRunning(true)
    try {
      // Simulate optimization run (would call actual optimizer API)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate mock proposed assignments
      const unassignedTasks = tasks.filter((t) => !t.assignedCrewId && t.state === 'unassigned')
      const assignedTasks = tasks.filter((t) => t.assignedCrewId)

      const proposals: ProposedAssignment[] = [
        ...unassignedTasks.slice(0, 10).map((task, idx) => ({
          taskId: task.id,
          currentCrewId: undefined,
          proposedCrewId: crew[idx % crew.length].id,
          proposedStartTime: new Date(Date.now() + (idx + 1) * 15 * 60 * 1000),
          improvement: {
            walkingDistanceReduction: 50 + idx * 10,
            slaCompliance: true,
          },
        })),
        ...assignedTasks.slice(0, 5).map((task, idx) => ({
          taskId: task.id,
          currentCrewId: task.assignedCrewId,
          proposedCrewId: crew[(idx + 1) % crew.length].id,
          currentStartTime: task.startedTime,
          proposedStartTime: new Date(Date.now() + (idx + 2) * 15 * 60 * 1000),
          improvement: {
            walkingDistanceReduction: 30 + idx * 5,
            responseTimeImprovement: 2 + idx,
            slaCompliance: true,
          },
        })),
      ]

      setProposedAssignments(proposals)
      setSelectedTaskIds(new Set(proposals.map((p) => p.taskId)))
    } catch (error) {
      throw error
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
    // TODO: Apply selected assignments to Redux store/API
    const toApply = proposedAssignments.filter((a) => selectedTaskIds.has(a.taskId))
    console.log('Applying assignments:', toApply)
    
    setShowApplyDialog(false)
    setProposedAssignments([])
    setSelectedTaskIds(new Set())
    setSnackbar({
      open: true,
      message: `Successfully applied ${toApply.length} assignment(s)`,
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

  const metrics = {
    totalTasks: tasks.length,
    assignedTasks: tasks.filter((t) => t.assignedCrewId).length,
    unassignedTasks: tasks.filter((t) => !t.assignedCrewId).length,
    overdueTasks: tasks.filter((t) => t.state === 'overdue').length,
    avgWalkingDistance: 450,
    avgResponseTime: 8.5,
    slaComplianceRate: 87.5,
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Optimizer (Craptimizer)
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <OptimizationControls onRunOptimization={handleRunOptimization} isRunning={isRunning} />
        </Grid>

        {/* Results Summary */}
        <Grid item xs={12} md={8}>
          <OptimizationResults metrics={metrics} />
        </Grid>

        {/* Comparison */}
        {proposedAssignments.length > 0 && (
          <Grid item xs={12}>
            <OptimizationComparison
              currentTasks={tasks}
              proposedAssignments={proposedAssignments}
              crew={crew}
              onSelectAssignment={handleSelectAssignment}
              selectedTaskIds={selectedTaskIds}
            />
          </Grid>
        )}

        {/* Action Buttons */}
        {proposedAssignments.length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleDiscard}
              >
                Discard
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
              >
                Apply Selected ({selectedTaskIds.size})
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleApply}
              >
                Apply All
              </Button>
            </Box>
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


