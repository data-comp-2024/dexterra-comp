/**
 * Performance Filters - Filter metrics by various criteria
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  OutlinedInput,
} from '@mui/material'
import { useState } from 'react'
import { useData } from '../../hooks/useData'

export interface PerformanceFilters {
  terminals: string[]
  zones: string[]
  washroomTypes: string[]
  timeOfDay: string[]
  crewMembers: string[]
}

interface PerformanceFiltersProps {
  onFiltersChange: (filters: PerformanceFilters) => void
}

function PerformanceFilters({ onFiltersChange }: PerformanceFiltersProps) {
  const { washrooms, crew } = useData()
  const [filters, setFilters] = useState<PerformanceFilters>({
    terminals: [],
    zones: [],
    washroomTypes: [],
    timeOfDay: [],
    crewMembers: [],
  })

  // Extract unique values
  const terminals = Array.from(new Set(washrooms.map((w) => w.terminal)))
  const zones = Array.from(new Set(washrooms.map((w) => w.concourse).filter(Boolean)))
  const washroomTypes = Array.from(new Set(washrooms.map((w) => w.type)))

  const timeOfDayOptions = [
    'Morning (6-12)',
    'Afternoon (12-18)',
    'Evening (18-24)',
    'Night (0-6)',
  ]

  const handleFilterChange = <K extends keyof PerformanceFilters>(
    key: K,
    value: PerformanceFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const emptyFilters: PerformanceFilters = {
      terminals: [],
      zones: [],
      washroomTypes: [],
      timeOfDay: [],
      crewMembers: [],
    }
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const activeFilterCount =
    filters.terminals.length +
    filters.zones.length +
    filters.washroomTypes.length +
    filters.timeOfDay.length +
    filters.crewMembers.length

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
          {activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} active`}
              color="primary"
              size="small"
              onDelete={handleClearFilters}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Terminal</InputLabel>
            <Select
              multiple
              value={filters.terminals}
              onChange={(e) =>
                handleFilterChange('terminals', e.target.value as string[])
              }
              input={<OutlinedInput label="Terminal" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {terminals.map((terminal) => (
                <MenuItem key={terminal} value={terminal}>
                  {terminal}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Zone</InputLabel>
            <Select
              multiple
              value={filters.zones}
              onChange={(e) =>
                handleFilterChange('zones', e.target.value as string[])
              }
              input={<OutlinedInput label="Zone" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {zones.map((zone) => (
                <MenuItem key={zone} value={zone}>
                  {zone}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Washroom Type</InputLabel>
            <Select
              multiple
              value={filters.washroomTypes}
              onChange={(e) =>
                handleFilterChange('washroomTypes', e.target.value as string[])
              }
              input={<OutlinedInput label="Washroom Type" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {washroomTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Time of Day</InputLabel>
            <Select
              multiple
              value={filters.timeOfDay}
              onChange={(e) =>
                handleFilterChange('timeOfDay', e.target.value as string[])
              }
              input={<OutlinedInput label="Time of Day" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {timeOfDayOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Crew Member</InputLabel>
            <Select
              multiple
              value={filters.crewMembers}
              onChange={(e) =>
                handleFilterChange('crewMembers', e.target.value as string[])
              }
              input={<OutlinedInput label="Crew Member" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {crew.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
          >
            Clear All
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default PerformanceFilters

