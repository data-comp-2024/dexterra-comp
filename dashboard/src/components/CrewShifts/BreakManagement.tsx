/**
 * Break Management - Track breaks and show alerts
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  LinearProgress,
  CardHeader,
} from '@mui/material'
import { AccessTime, Warning, CheckCircle } from '@mui/icons-material'
import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Crew } from '../../types'
import { format, formatDistanceToNow, differenceInMinutes, isAfter } from 'date-fns'

// Break policy constants
const MAX_WORK_MINUTES_BEFORE_BREAK = 240 // 4 hours
const BREAK_DURATION_MINUTES = 15 // 15 minutes

interface BreakInfo {
  crew: Crew
  lastBreakEnd?: Date
  minutesSinceLastBreak: number
  nextBreakDue?: Date
  isOverdue: boolean
  needsBreakSoon: boolean
}

function BreakManagement() {
  const { crew } = useData()
  const now = new Date()

  const breakInfo = useMemo(() => {
    return crew
      .filter((c) => c.status === 'on_shift' || c.status === 'available' || c.status === 'busy')
      .map((member): BreakInfo => {
        const lastBreakEnd = member.lastBreakEnd
        const minutesSinceLastBreak = lastBreakEnd
          ? differenceInMinutes(now, lastBreakEnd)
          : differenceInMinutes(now, member.shift.startTime)

        const nextBreakDue = lastBreakEnd
          ? new Date(lastBreakEnd.getTime() + MAX_WORK_MINUTES_BEFORE_BREAK * 60 * 1000)
          : new Date(member.shift.startTime.getTime() + MAX_WORK_MINUTES_BEFORE_BREAK * 60 * 1000)

        const isOverdue = minutesSinceLastBreak > MAX_WORK_MINUTES_BEFORE_BREAK
        const needsBreakSoon =
          minutesSinceLastBreak > MAX_WORK_MINUTES_BEFORE_BREAK * 0.8 &&
          !isOverdue

        return {
          crew: member,
          lastBreakEnd,
          minutesSinceLastBreak,
          nextBreakDue,
          isOverdue,
          needsBreakSoon,
        }
      })
      .sort((a, b) => {
        // Sort by urgency: overdue first, then needs break soon
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        if (a.needsBreakSoon && !b.needsBreakSoon) return -1
        if (!a.needsBreakSoon && b.needsBreakSoon) return 1
        return b.minutesSinceLastBreak - a.minutesSinceLastBreak
      })
  }, [crew, now])

  const overdueCount = breakInfo.filter((info) => info.isOverdue).length
  const needsBreakSoonCount = breakInfo.filter((info) => info.needsBreakSoon).length

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="Break Management" />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        {overdueCount > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {overdueCount} crew member{overdueCount > 1 ? 's' : ''} overdue for break
          </Alert>
        )}

        {needsBreakSoonCount > 0 && overdueCount === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {needsBreakSoonCount} crew member{needsBreakSoonCount > 1 ? 's' : ''} due for break soon
          </Alert>
        )}

        {breakInfo.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No crew members on shift
          </Typography>
        ) : (
          <List sx={{ height: '100%', overflow: 'auto' }}>
            {breakInfo.map((info) => {
              const progress = Math.min(
                (info.minutesSinceLastBreak / MAX_WORK_MINUTES_BEFORE_BREAK) * 100,
                100
              )

              return (
                <ListItem
                  key={info.crew.id}
                  sx={{
                    borderLeft: `4px solid ${info.isOverdue
                      ? '#D32F2F'
                      : info.needsBreakSoon
                        ? '#ED6C02'
                        : '#06A77D'
                      }`,
                    mb: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {info.crew.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {info.isOverdue ? (
                          <Chip
                            icon={<Warning />}
                            label="Overdue"
                            size="small"
                            color="error"
                          />
                        ) : info.needsBreakSoon ? (
                          <Chip
                            icon={<AccessTime />}
                            label="Due Soon"
                            size="small"
                            color="warning"
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircle />}
                            label="OK"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Time since last break
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {Math.floor(info.minutesSinceLastBreak / 60)}h{' '}
                          {info.minutesSinceLastBreak % 60}m
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={info.isOverdue ? 'error' : info.needsBreakSoon ? 'warning' : 'success'}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Box>
                        {info.lastBreakEnd ? (
                          <>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Last break ended
                            </Typography>
                            <Typography variant="caption">
                              {format(info.lastBreakEnd, 'MMM d, HH:mm')}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No break taken this shift
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Next break due
                        </Typography>
                        <Typography
                          variant="caption"
                          color={info.isOverdue ? 'error.main' : 'inherit'}
                          sx={{ fontWeight: 500 }}
                        >
                          {info.nextBreakDue && isAfter(now, info.nextBreakDue)
                            ? 'Overdue'
                            : info.nextBreakDue
                              ? formatDistanceToNow(info.nextBreakDue, { addSuffix: true })
                              : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
              )
            })}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

export default BreakManagement

