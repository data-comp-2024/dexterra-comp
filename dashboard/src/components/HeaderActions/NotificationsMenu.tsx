/**
 * Notifications Menu Component
 */

import { useState, useEffect } from 'react'
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import {
  Warning,
  CheckCircle,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Notification } from '../../types'
import { fetchNotificationsList } from '../../services'

interface NotificationsMenuProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  badgeCount: number
}

function NotificationsMenu({ anchorEl, onClose, badgeCount }: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await fetchNotificationsList()
        setNotifications(data)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    if (Boolean(anchorEl)) {
      fetchNotifications()
    }
  }, [anchorEl])

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

  const handleViewAll = () => {
    onClose()
    navigate('/notifications')
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
      <MenuItem onClick={handleViewAll}>
        <ListItemText primary="View all notifications" primaryTypographyProps={{ align: 'center' }} />
      </MenuItem>
    </Menu>
  )
}

export default NotificationsMenu

