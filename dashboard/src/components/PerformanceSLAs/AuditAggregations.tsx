/**
 * Audit Aggregations - Monthly, Day of Week, and Hour of Day views
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
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
  Cell,
} from 'recharts'
import { useMemo, useState, useEffect } from 'react'
import { loadAuditData, AuditRecord } from '../../services/dataService'
import { TimeRange } from './TimeRangeSelector'
import { format, getDay, getHours } from 'date-fns'

interface AuditAggregationsProps {
  timeRange: TimeRange
}

interface MonthlyAggregate {
  month: string
  count: number
  avgScore: number
  targetMet: number
  targetMissed: number
}

interface DayOfWeekAggregate {
  day: string
  count: number
  avgScore: number
  targetMet: number
  targetMissed: number
}

interface HourOfDayAggregate {
  hour: number
  count: number
  avgScore: number
  targetMet: number
  targetMissed: number
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function AuditAggregations({ timeRange }: AuditAggregationsProps) {
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)

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

  // Filter audits by time range
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      return audit.dt >= timeRange.start && audit.dt <= timeRange.end
    })
  }, [audits, timeRange])

  // Monthly aggregates
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { count: number; totalScore: number; targetMet: number; targetMissed: number }>()
    
    filteredAudits.forEach((audit) => {
      const monthKey = format(audit.dt, 'MMM yyyy')
      const existing = monthMap.get(monthKey) || { count: 0, totalScore: 0, targetMet: 0, targetMissed: 0 }
      
      existing.count++
      existing.totalScore += audit.totalScore
      if (audit.totalScore >= audit.targetScore) {
        existing.targetMet++
      } else {
        existing.targetMissed++
      }
      
      monthMap.set(monthKey, existing)
    })

    const result: MonthlyAggregate[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        targetMet: data.targetMet,
        targetMissed: data.targetMissed,
      }))
      .sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })

    return result
  }, [filteredAudits])

  // Day of week aggregates
  const dayOfWeekData = useMemo(() => {
    const dayMap = new Map<number, { count: number; totalScore: number; targetMet: number; targetMissed: number }>()
    
    filteredAudits.forEach((audit) => {
      const dayOfWeek = getDay(audit.dt)
      const existing = dayMap.get(dayOfWeek) || { count: 0, totalScore: 0, targetMet: 0, targetMissed: 0 }
      
      existing.count++
      existing.totalScore += audit.totalScore
      if (audit.totalScore >= audit.targetScore) {
        existing.targetMet++
      } else {
        existing.targetMissed++
      }
      
      dayMap.set(dayOfWeek, existing)
    })

    const result: DayOfWeekAggregate[] = Array.from(dayMap.entries())
      .map(([day, data]) => ({
        day: DAYS_OF_WEEK[day],
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        targetMet: data.targetMet,
        targetMissed: data.targetMissed,
      }))
      .sort((a, b) => {
        // Sort by day of week (Sunday = 0)
        return DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day)
      })

    return result
  }, [filteredAudits])

  // Hour of day aggregates
  const hourOfDayData = useMemo(() => {
    const hourMap = new Map<number, { count: number; totalScore: number; targetMet: number; targetMissed: number }>()
    
    filteredAudits.forEach((audit) => {
      const hour = getHours(audit.dt)
      const existing = hourMap.get(hour) || { count: 0, totalScore: 0, targetMet: 0, targetMissed: 0 }
      
      existing.count++
      existing.totalScore += audit.totalScore
      if (audit.totalScore >= audit.targetScore) {
        existing.targetMet++
      } else {
        existing.targetMissed++
      }
      
      hourMap.set(hour, existing)
    })

    const result: HourOfDayAggregate[] = Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        targetMet: data.targetMet,
        targetMissed: data.targetMissed,
      }))
      .sort((a, b) => a.hour - b.hour)

    return result
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
          Audit Aggregations
        </Typography>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="Monthly" />
          <Tab label="Day of Week" />
          <Tab label="Hour of Day" />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Total Audits: {filteredAudits.length}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Audit Count by Month
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Average Score by Month
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Target Met vs Missed by Month
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="targetMet" stackId="a" fill="#82ca9d" name="Target Met" />
                    <Bar dataKey="targetMissed" stackId="a" fill="#ff6b6b" name="Target Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Total Audits: {filteredAudits.length}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Audit Count by Day of Week
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Average Score by Day of Week
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Target Met vs Missed by Day of Week
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="targetMet" stackId="a" fill="#82ca9d" name="Target Met" />
                    <Bar dataKey="targetMissed" stackId="a" fill="#ff6b6b" name="Target Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Total Audits: {filteredAudits.length}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Audit Count by Hour of Day
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Average Score by Hour of Day
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Target Met vs Missed by Hour of Day
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="targetMet" stackId="a" fill="#82ca9d" name="Target Met" />
                    <Bar dataKey="targetMissed" stackId="a" fill="#ff6b6b" name="Target Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default AuditAggregations
