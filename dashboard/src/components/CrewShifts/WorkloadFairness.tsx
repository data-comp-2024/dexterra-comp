/**
 * Workload & Fairness Indicators - Per-crew metrics and fairness alerts
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material'
import { Balance } from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { useCrew } from '../../context/CrewContext'
import { useOptimization } from '../../context/OptimizationContext'
import { Crew } from '../../types'
import { CURRENT_DATE } from '../../constants'

interface CrewWorkload {
  crew: Crew
  totalTasks: number
  emergencyTasks: number
  routineTasks: number
  walkingDistance: number
  emergencyRatio: number
}

function WorkloadFairness() {
  const { tasks } = useData()
  const { crew } = useCrew()
  const { optimizationResult } = useOptimization()

  const workloadData = useMemo(() => {
    const now = CURRENT_DATE
    const shiftStart = new Date(now)
    shiftStart.setHours(6, 0, 0, 0)

    return crew
      .filter((c) => c.status !== 'off_shift')
      .map((member): CrewWorkload => {
        // Use optimization results if available, otherwise fallback to tasks
        if (optimizationResult) {
          const crewAssignments = optimizationResult.assignments.filter(
            (a) => a.crewId === member.id
          )
          
          // Check taskId pattern to identify emergency tasks
          // Emergency tasks have IDs like "emergency-task-1", "emergency-task-2", etc.
          // Routine tasks have IDs like "ROUTINE_0001", "ROUTINE_0002", etc.
          // Also check original tasks array for emergency tasks that were passed to optimizer
          const emergencyTasks = crewAssignments.filter((a) => {
            const taskId = a.taskId.toLowerCase()
            // First check taskId pattern (emergency tasks have "emergency" in their ID)
            if (taskId.includes('emergency') || taskId.startsWith('emergency')) {
              return true
            }
            // Also check original tasks array if available
            const originalTask = tasks.find((t) => t.id === a.taskId)
            if (originalTask) {
              return originalTask.priority === 'emergency' || originalTask.type === 'emergency_cleaning'
            }
            return false
          }).length
          
          const routineTasks = crewAssignments.length - emergencyTasks
          const totalTasks = crewAssignments.length
          const emergencyRatio = totalTasks > 0 ? emergencyTasks / totalTasks : 0
          
          // Calculate walking distance from assignments
          const walkingDistance = crewAssignments.reduce((sum, a) => {
            // Approximate: travel time * average walking speed (5 km/h = 83 m/min)
            return sum + (a.travelTimeMinutes * 83)
          }, 0)

          return {
            crew: member,
            totalTasks,
            emergencyTasks,
            routineTasks,
            walkingDistance,
            emergencyRatio,
          }
        }

        // Fallback to tasks if no optimization results
        const crewTasks = tasks.filter(
          (t) =>
            t.assignedCrewId === member.id &&
            t.createdTime >= shiftStart
        )

        const emergencyTasks = crewTasks.filter((t) => t.priority === 'emergency').length
        const routineTasks = crewTasks.filter((t) => t.priority !== 'emergency').length
        const totalTasks = crewTasks.length
        const emergencyRatio = totalTasks > 0 ? emergencyTasks / totalTasks : 0

        return {
          crew: member,
          totalTasks,
          emergencyTasks,
          routineTasks,
          walkingDistance: member.cumulativeWalkingDistance || 0,
          emergencyRatio,
        }
      })
  }, [crew, tasks, optimizationResult])

  // Calculate fairness metrics
  const fairnessIssues = useMemo(() => {
    const issues: string[] = []

    if (workloadData.length === 0) return issues

    // Check emergency task distribution
    const totalEmergencies = workloadData.reduce((sum, w) => sum + w.emergencyTasks, 0)
    if (totalEmergencies > 0) {
      const avgEmergencies = totalEmergencies / workloadData.length
      const maxEmergencies = Math.max(...workloadData.map((w) => w.emergencyTasks))

      if (maxEmergencies > avgEmergencies * 1.7) {
        const overloadedCrew = workloadData.find((w) => w.emergencyTasks === maxEmergencies)
        const percentage = Math.round((maxEmergencies / totalEmergencies) * 100)
        issues.push(
          `${overloadedCrew?.crew.name} handling ${percentage}% of emergencies (${maxEmergencies}/${totalEmergencies})`
        )
      }
    }

    // Check total task distribution
    const totalTasks = workloadData.reduce((sum, w) => sum + w.totalTasks, 0)
    if (totalTasks > 0) {
      const avgTasks = totalTasks / workloadData.length
      const maxTasks = Math.max(...workloadData.map((w) => w.totalTasks))
      const minTasks = Math.min(...workloadData.map((w) => w.totalTasks))

      if (maxTasks > avgTasks * 1.5) {
        const overloadedCrew = workloadData.find((w) => w.totalTasks === maxTasks)
        issues.push(
          `${overloadedCrew?.crew.name} has ${maxTasks} tasks (avg: ${Math.round(avgTasks)})`
        )
      }

      if (minTasks < avgTasks * 0.5 && maxTasks > avgTasks * 1.5) {
        issues.push(
          `Uneven workload distribution: ${maxTasks} tasks max vs ${minTasks} tasks min`
        )
      }
    }

    return issues
  }, [workloadData])

  const maxTasks = Math.max(...workloadData.map((w) => w.totalTasks), 1)
  const maxWalkingDistance = Math.max(...workloadData.map((w) => w.walkingDistance), 1)

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Workload & Fairness
        </Typography>

        {fairnessIssues.length > 0 && (
          <Alert severity="warning" icon={<Balance />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Fairness Issues Detected:
            </Typography>
            {fairnessIssues.map((issue, index) => (
              <Typography key={index} variant="body2">
                • {issue}
              </Typography>
            ))}
          </Alert>
        )}

        {workloadData.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No crew members on shift
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {workloadData.map((workload) => (
              <Grid item xs={12} md={6} key={workload.crew.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {workload.crew.name}
                      </Typography>
                      <Chip
                        label={`${workload.totalTasks} tasks`}
                        size="small"
                        color={workload.totalTasks > maxTasks * 0.8 ? 'warning' : 'default'}
                      />
                    </Box>

                    {/* Tasks breakdown */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Tasks
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {workload.totalTasks}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(workload.totalTasks / maxTasks) * 100}
                        sx={{ height: 6, borderRadius: 1, mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Emergency
                          </Typography>
                          <Typography variant="body2" color="error.main">
                            {workload.emergencyTasks}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Routine
                          </Typography>
                          <Typography variant="body2">
                            {workload.routineTasks}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Emergency Ratio
                          </Typography>
                          <Typography variant="body2">
                            {Math.round(workload.emergencyRatio * 100)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Walking distance */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Walking Distance
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {(workload.walkingDistance / 1000).toFixed(1)} km
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(workload.walkingDistance / maxWalkingDistance) * 100}
                        color="secondary"
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkloadFairness
