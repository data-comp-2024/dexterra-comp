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
import { TrendingUp, Warning, Balance } from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { useCrew } from '../../context/CrewContext'
import { Crew, Task } from '../../types'

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

  const workloadData = useMemo(() => {
    const now = new Date()
    const shiftStart = new Date(now)
    shiftStart.setHours(6, 0, 0, 0)

    return crew
      .filter((c) => c.status !== 'off_shift')
      .map((member): CrewWorkload => {
        // Get tasks for this crew member from today's shift
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
  }, [crew, tasks])

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

