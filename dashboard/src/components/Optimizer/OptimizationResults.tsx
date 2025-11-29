/**
 * Optimization Results Summary - Metrics and statistics
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
} from '@mui/material'
import {
  CheckCircle,
  Cancel,
  TrendingDown,
  AccessTime,
} from '@mui/icons-material'

interface OptimizationResultsProps {
  metrics: {
    totalTasks: number
    assignedTasks: number
    unassignedTasks: number
    overdueTasks: number
    avgWalkingDistance: number
    avgResponseTime: number
    slaComplianceRate: number
  }
}

function OptimizationResults({ metrics }: OptimizationResultsProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Optimization Results Summary
        </Typography>

        <Grid container spacing={3}>
          {/* Task Assignment */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">
                  Task Assignment
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.assignedTasks} / {metrics.totalTasks}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.unassignedTasks} unassigned
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(metrics.assignedTasks / metrics.totalTasks) * 100}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
                color="success"
              />
            </Box>
          </Grid>

          {/* SLA Compliance */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime color={metrics.slaComplianceRate >= 90 ? 'success' : 'warning'} />
                <Typography variant="body2" color="text.secondary">
                  SLA Compliance
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.slaComplianceRate >= 90
                      ? 'success.main'
                      : metrics.slaComplianceRate >= 75
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.slaComplianceRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.overdueTasks} overdue tasks
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.slaComplianceRate}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
                color={
                  metrics.slaComplianceRate >= 90
                    ? 'success'
                    : metrics.slaComplianceRate >= 75
                    ? 'warning'
                    : 'error'
                }
              />
            </Box>
          </Grid>

          {/* Average Walking Distance */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingDown color="success" />
                <Typography variant="body2" color="text.secondary">
                  Avg Walking Distance
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.avgWalkingDistance.toFixed(1)}m
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per crew member
              </Typography>
            </Box>
          </Grid>

          {/* Average Response Time */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Avg Response Time
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color:
                    metrics.avgResponseTime <= 10
                      ? 'success.main'
                      : metrics.avgResponseTime <= 15
                      ? 'warning.main'
                      : 'error.main',
                }}
              >
                {metrics.avgResponseTime.toFixed(1)} min
              </Typography>
              <Typography variant="caption" color="text.secondary">
                For emergencies
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default OptimizationResults

