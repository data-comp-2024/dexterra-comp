/**
 * Time Range Selection - Presets and custom date range
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  TextField,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { format, subDays, subHours } from 'date-fns'

export interface TimeRange {
  start: Date
  end: Date
  label: string
}

interface TimeRangeSelectorProps {
  onRangeChange: (range: TimeRange) => void
  defaultRange?: TimeRange
}

function TimeRangeSelector({ onRangeChange, defaultRange }: TimeRangeSelectorProps) {
  // Default to 2024 if defaultRange is provided and covers 2024, otherwise use '24h'
  const is2024Range = defaultRange && 
    defaultRange.start.getFullYear() === 2024 && 
    defaultRange.end.getFullYear() === 2024 &&
    defaultRange.start.getMonth() === 0 &&
    defaultRange.end.getMonth() === 11

  const [selectedPreset, setSelectedPreset] = useState<string>(is2024Range ? '2024' : '24h')
  const [customStart, setCustomStart] = useState<string>(
    defaultRange
      ? format(defaultRange.start, 'yyyy-MM-dd\'T\'HH:mm')
      : format(subHours(new Date(), 24), 'yyyy-MM-dd\'T\'HH:mm')
  )
  const [customEnd, setCustomEnd] = useState<string>(
    defaultRange
      ? format(defaultRange.end, 'yyyy-MM-dd\'T\'HH:mm')
      : format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
  )

  const presets: { [key: string]: TimeRange } = {
    '2024': {
      start: new Date('2024-01-01T00:00:00'),
      end: new Date('2024-12-31T23:59:59'),
      label: '2024',
    },
    '24h': {
      start: subHours(new Date(), 24),
      end: new Date(),
      label: 'Last 24 Hours',
    },
    '7d': {
      start: subDays(new Date(), 7),
      end: new Date(),
      label: 'Last 7 Days',
    },
    '30d': {
      start: subDays(new Date(), 30),
      end: new Date(),
      label: 'Last 30 Days',
    },
  }

  // Initialize with default range on mount
  useEffect(() => {
    if (defaultRange) {
      onRangeChange(defaultRange)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset)
    const range = presets[preset]
    onRangeChange(range)
  }

  const handleCustomApply = () => {
    const range: TimeRange = {
      start: new Date(customStart),
      end: new Date(customEnd),
      label: `${format(new Date(customStart), 'MMM d, HH:mm')} - ${format(new Date(customEnd), 'MMM d, HH:mm')}`,
    }
    setSelectedPreset('custom')
    onRangeChange(range)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Time Range
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ButtonGroup variant="outlined" size="small">
            {Object.entries(presets).map(([key, range]) => (
              <Button
                key={key}
                variant={selectedPreset === key ? 'contained' : 'outlined'}
                onClick={() => handlePresetClick(key)}
              >
                {range.label}
              </Button>
            ))}
          </ButtonGroup>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Start"
              type="datetime-local"
              size="small"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <Typography variant="body2" color="text.secondary">
              to
            </Typography>
            <TextField
              label="End"
              type="datetime-local"
              size="small"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <Button
              variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
              onClick={handleCustomApply}
              size="small"
            >
              Apply
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default TimeRangeSelector

