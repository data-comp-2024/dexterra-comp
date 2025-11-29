/**
 * Crew Productivity KPIs - Crew performance metrics
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { TimeRange } from './TimeRangeSelector'
import { differenceInMinutes } from 'date-fns'

interface CrewProductivityKPIsProps {
  timeRange: TimeRange
}

function CrewProductivityKPIs({ timeRange }: CrewProductivityKPIsProps) {
  const { crew, tasks } = useData()

  const metrics = useMemo(() => {
    // Filter tasks within time range
    const tasksInRange = tasks.filter(
      (t) =>
        t.completedTime &&
        t.completedTime >= timeRange.start &&
        t.completedTime <= timeRange.end
    )

    // Calculate metrics per crew member
    const crewMetrics = crew.map((member) => {
      const memberTasks = tasksInRange.filter(
        (t) => t.assignedCrewId === member.id
      )

      // Calculate task durations
      const taskDurations = memberTasks
        .filter((t) => t.startedTime && t.completedTime)
        .map((t) => differenceInMinutes(t.completedTime!, t.startedTime!))

      const avgTaskDuration =
        taskDurations.length > 0
          ? taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
          : 0

      // Estimate idle time (simplified: assume 8-hour shift, subtract task time)
      const shiftMinutes = 8 * 60
      const totalTaskTime = taskDurations.reduce((sum, d) => sum + d, 0)
      const idleTime = Math.max(0, shiftMinutes - totalTaskTime)

      // Utilization = (total task time / shift time) * 100
      const utilization =
        shiftMinutes > 0 ? (totalTaskTime / shiftMinutes) * 100 : 0

      return {
        crewId: member.id,
        crewName: member.name,
        tasksCompleted: memberTasks.length,
        avgTaskDuration: Math.round(avgTaskDuration * 10) / 10,
        idleTime: Math.round(idleTime * 10) / 10,
        utilization: Math.round(utilization * 10) / 10,
      }
    })

    // Overall average idle time
    const avgIdleTime =
      crewMetrics.length > 0
        ? crewMetrics.reduce((sum, m) => sum + m.idleTime, 0) /
          crewMetrics.length
        : 0

    // Idle time trend (hourly buckets - simplified)
    const idleTrendData = Array.from({ length: 8 }, (_, i) => ({
      hour: `${i * 2}:00`,
      idleTime: avgIdleTime * (0.8 + Math.random() * 0.4), // Mock variation
    }))

    return {
      crewMetrics,
      avgIdleTime: Math.round(avgIdleTime * 10) / 10,
      idleTrendData,
    }
  }, [crew, tasks, timeRange])

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Crew Productivity
        </Typography>

        <Grid container spacing={3}>
          {/* Average Idle Time */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Average Idle Time per Shift
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.avgIdleTime.toFixed(1)} min
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lower is better
              </Typography>
            </Box>
          </Grid>

          {/* Idle Time Trend */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Idle Time Trend
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.idleTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="idleTime"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Utilization Chart */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Utilization % by Crew
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.crewMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="crewName" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Tasks Completed Table */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tasks Completed per Crew
              </Typography>
              <TableContainer sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Crew Member</TableCell>
                      <TableCell align="right">Tasks</TableCell>
                      <TableCell align="right">Avg Duration</TableCell>
                      <TableCell align="right">Utilization</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.crewMetrics
                      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
                      .map((metric) => (
                        <TableRow key={metric.crewId} hover>
                          <TableCell>{metric.crewName}</TableCell>
                          <TableCell align="right">
                            {metric.tasksCompleted}
                          </TableCell>
                          <TableCell align="right">
                            {metric.avgTaskDuration.toFixed(1)} min
                          </TableCell>
                          <TableCell align="right">
                            {metric.utilization.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CrewProductivityKPIs

