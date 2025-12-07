import { NavLink, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material'
import {
  Dashboard,
  Assignment,
  AutoAwesome,
  FlightTakeoff,
  Assessment,
  Warning,
  People,
  LocationOn,
  History,
  Help,
  ChevronRight,
} from '@mui/icons-material'

const tabs = [
  { path: '/live-ops', label: 'Live Ops', icon: Dashboard },
  { path: '/assignments', label: 'Assignments', icon: Assignment },
  { path: '/optimizer', label: 'Optimizer', icon: AutoAwesome, subtitle: 'Craptimizer' },
  { path: '/demand-flights', label: 'Flights', icon: FlightTakeoff },
  { path: '/performance-slas', label: 'Performance & SLAs', icon: Assessment },
  { path: '/incidents-alerts', label: 'Incidents & Alerts', icon: Warning },
  { path: '/crew-shifts', label: 'Crew & Shifts', icon: People },
  { path: '/locations-config', label: 'Locations & Config', icon: LocationOn },
  { path: '/activity-log', label: 'Activity Log', icon: History },
  { path: '/help-playbook', label: 'Help & Playbook', icon: Help },
]

function Navigation() {
  const location = useLocation()

  return (
    <Box
      sx={{
        width: 260,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <List sx={{ flex: 1, pt: 2, pb: 1, overflowY: 'auto', minHeight: 0 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.path || (tab.path === '/live-ops' && location.pathname === '/')
          
          return (
            <ListItem key={tab.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to={tab.path}
                aria-label={`Navigate to ${tab.label}`}
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  py: 1.25,
                  px: 2,
                  borderRadius: '0 24px 24px 0',
                  mr: 1,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                    '& .MuiTypography-root': {
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <Icon
                  sx={{
                    mr: 2,
                    fontSize: '1.25rem',
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
                <ListItemText
                  primary={tab.label}
                  secondary={tab.subtitle}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    sx: { opacity: isActive ? 0.8 : 0.6 },
                  }}
                />
                {isActive && (
                  <ChevronRight
                    sx={{
                      ml: 'auto',
                      fontSize: '1rem',
                      color: 'primary.contrastText',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* Version Footer */}
      <Box sx={{ p: 2, pt: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
          }}
        >
          version: {import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </Typography>
      </Box>
    </Box>
  )
}

export default Navigation

