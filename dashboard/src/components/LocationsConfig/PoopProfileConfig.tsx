/**
 * Poop Profile Configuration - Demand labels and curves
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material'
import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { Washroom } from '../../types'

const DEMAND_PROFILES = [
  'Peak mornings',
  'Peak afternoons',
  'Constant high traffic',
  'Constant low traffic',
  'Event-driven spikes',
  'Overnight quiet',
  'Custom',
]

function PoopProfileConfig() {
  const { washrooms } = useData()
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map())

  const handleProfileChange = (washroomId: string, profile: string) => {
    const newMap = new Map(profileMap)
    newMap.set(washroomId, profile)
    setProfileMap(newMap)
    // TODO: Save to Redux store/API
    console.log('Update poop profile', washroomId, profile)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Poop Profile Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure demand patterns for each washroom to improve cleaning scheduling.
        </Typography>

        <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Washroom</TableCell>
                <TableCell>Terminal</TableCell>
                <TableCell>Current Profile</TableCell>
                <TableCell>Demand Profile</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {washrooms.map((washroom) => {
                const currentProfile = profileMap.get(washroom.id) || washroom.poopProfile || 'Not set'

                return (
                  <TableRow key={washroom.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {washroom.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {washroom.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={washroom.terminal} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={currentProfile}
                        size="small"
                        color={currentProfile === 'Not set' ? 'default' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                          value={currentProfile}
                          onChange={(e) => handleProfileChange(washroom.id, e.target.value)}
                        >
                          {DEMAND_PROFILES.map((profile) => (
                            <MenuItem key={profile} value={profile}>
                              {profile}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Profile Descriptions
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>
              <Typography variant="caption">
                <strong>Peak mornings:</strong> High demand 6am-10am
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                <strong>Peak afternoons:</strong> High demand 2pm-6pm
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                <strong>Constant high traffic:</strong> Consistently busy throughout the day
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                <strong>Constant low traffic:</strong> Low but steady demand
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                <strong>Event-driven spikes:</strong> Demand spikes during flight arrivals/departures
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                <strong>Overnight quiet:</strong> Minimal demand during night hours
              </Typography>
            </li>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default PoopProfileConfig

