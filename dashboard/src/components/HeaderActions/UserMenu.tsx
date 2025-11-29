/**
 * User Menu Component
 */

import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material'
import {
  Person,
  Logout,
  Settings,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

interface UserMenuProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  userName: string
  onSettingsClick: () => void
}

function UserMenu({ anchorEl, onClose, userName, onSettingsClick }: UserMenuProps) {
  const navigate = useNavigate()

  const handleProfile = () => {
    console.log('View profile')
    onClose()
  }

  const handleSettings = () => {
    onSettingsClick()
    onClose()
  }

  const handleLogout = () => {
    console.log('Logout')
    // In production, this would clear auth tokens and redirect to login
    onClose()
  }

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box sx={{ p: 2, minWidth: 200 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {userName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Dispatcher
        </Typography>
      </Box>
      <Divider />
      <MenuItem onClick={handleProfile}>
        <ListItemIcon>
          <Person fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Profile" />
      </MenuItem>
      <MenuItem onClick={handleSettings}>
        <ListItemIcon>
          <Settings fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Settings" />
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <Logout fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </MenuItem>
    </Menu>
  )
}

export default UserMenu

