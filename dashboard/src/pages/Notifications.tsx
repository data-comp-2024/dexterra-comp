import { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Chip,
    Divider,
    Container,
    CircularProgress,
} from '@mui/material'
import {
    NotificationsOutlined,
    Warning,
    CheckCircle,
    Info,
    Error as ErrorIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Notification } from '../types'
import { fetchNotificationsList } from '../services'

function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                console.log('Fetching notifications...')
                const data = await fetchNotificationsList()
                console.log('Notifications fetched:', data)
                setNotifications(data || [])
            } catch (err) {
                console.error('Failed to fetch notifications:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchNotifications()
    }, [])

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'error':
                return <ErrorIcon color="error" />
            case 'warning':
                return <Warning color="warning" />
            case 'success':
                return <CheckCircle color="success" />
            case 'info':
                return <Info color="info" />
            default:
                return <NotificationsOutlined />
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
                    <Typography variant="h6">Error loading notifications</Typography>
                    <Typography>{error}</Typography>
                </Paper>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Notifications
            </Typography>
            <Paper sx={{ p: 2 }}>
                {notifications.length === 0 ? (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">No notifications</Typography>
                    </Box>
                ) : (
                    <List>
                        {notifications.map((notification, index) => (
                            <div key={notification.id}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        alignItems="flex-start"
                                        onClick={() => navigate(`/incidents-alerts?search=${notification.id}`)}
                                    >
                                        <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="subtitle1" component="span">
                                                        {notification.title}
                                                    </Typography>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {!notification.read && (
                                                            <Chip label="New" color="primary" size="small" variant="outlined" />
                                                        )}
                                                        <Typography variant="caption" color="textSecondary">
                                                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                    sx={{ display: 'block', mt: 0.5 }}
                                                >
                                                    {notification.message}
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
                            </div>
                        ))}
                    </List>
                )}
            </Paper>
        </Container>
    )
}

export default Notifications
