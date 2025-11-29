/**
 * Notifications Menu Component
 */

import { useState } from 'react'
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material'
import {
  NotificationsOutlined,
  Warning,
  CheckCircle,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Mock notifications - in production, these would come from Redux/API
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'error',
    title: 'Emergency Alert',
    message: 'Emergency detected at T1-134-MEN',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'SLA Breach',
    message: 'Task T-2024-001 is overdue',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: 'Task Completed',
    message: 'Task T-2024-002 completed successfully',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
  },
  {
    id: '4',
    type: 'info',
    title: 'System Update',
    message: 'Optimization completed for next 2 hours',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    read: true,
  },
]

interface NotificationsMenuProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  badgeCount: number
}

function NotificationsMenu({ anchorEl, onClose, badgeCount }: NotificationsMenuProps) {
  const [notifications] = useState<Notification[]>(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return <ErrorIcon color="error" />
      case 'warning':
        return <Warning color="warning" />
      case 'success':
        return <CheckCircle color="success" />
      case 'info':
      default:
        return <Info color="info" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification.id)
    // In production, mark as read and navigate to relevant page
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
      PaperProps={{
        sx: { width: 360, maxHeight: 500 },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Chip label={unreadCount} size="small" color="error" />
        )}
      </Box>
      <Divider />
      {notifications.length === 0 ? (
        <MenuItem disabled>
          <ListItemText primary="No notifications" />
        </MenuItem>
      ) : (
        notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            sx={{
              bgcolor: notification.read ? 'transparent' : 'action.hover',
              py: 1.5,
            }}
          >
            <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                    {notification.title}
                  </Typography>
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                </Box>
              }
              secondary={
                <>
                  <Typography variant="caption" color="text.secondary">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </Typography>
                </>
              }
            />
          </MenuItem>
        ))
      )}
      <Divider />
      <MenuItem onClick={onClose}>
        <ListItemText primary="View all notifications" primaryTypographyProps={{ align: 'center' }} />
      </MenuItem>
    </Menu>
  )
}

export default NotificationsMenu

