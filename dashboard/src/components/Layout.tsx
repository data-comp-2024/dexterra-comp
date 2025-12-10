import { ReactNode, useState } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Divider,
} from '@mui/material'
const DexterraLogo = '/DexterraLogo.png'
import {
  NotificationsOutlined,
  HelpOutline,
  ShareOutlined,
  SettingsOutlined,
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { Chip, Tooltip } from '@mui/material'
import { Circle } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import Navigation from './Navigation'
import { RootState } from '../store'
import NotificationsMenu from './HeaderActions/NotificationsMenu'
import ShareMenu from './HeaderActions/ShareMenu'
import SettingsDialog from './HeaderActions/SettingsDialog'
import UserMenu from './HeaderActions/UserMenu'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.user)
  const connectionStatus = useSelector((state: RootState) => state.ui.connectionStatus)

  // Menu anchor states
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null)
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success'
      case 'connecting':
        return 'warning'
      case 'disconnected':
      case 'error':
        return 'error'
      case 'polling':
      default:
        return 'default'
    }
  }

  const getConnectionStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Error'
      case 'polling':
      default:
        return 'Polling'
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Header Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexShrink: 0,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '64px !important' }}>
          {/* Logo */}
          <Box
            component="img"
            src={DexterraLogo}
            alt="Dexterra Logo"
            sx={{
              height: 40,
              mr: 4,
              objectFit: 'contain',
            }}
          />

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Connection Status */}
          <Tooltip title={`Connection status: ${getConnectionStatusLabel()}`}>
            <Chip
              icon={<Circle sx={{ fontSize: '8px !important' }} />}
              label={getConnectionStatusLabel()}
              size="small"
              color={getConnectionStatusColor() as any}
              sx={{ mr: 2 }}
              aria-label={`Connection status: ${getConnectionStatusLabel()}`}
            />
          </Tooltip>

          {/* Action Buttons */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              sx={{ color: 'text.secondary', mr: 1 }}
              aria-label="View notifications"
              onClick={(e) => setNotificationsAnchor(e.currentTarget)}
            >
              <Badge badgeContent={1} color="error">
                <NotificationsOutlined />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Help & Support">
            <IconButton
              color="inherit"
              sx={{ color: 'text.secondary', mr: 1 }}
              aria-label="Open help"
              onClick={() => navigate('/help-playbook')}
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share Dashboard">
            <IconButton
              color="inherit"
              sx={{ color: 'text.secondary', mr: 1 }}
              aria-label="Share dashboard"
              onClick={(e) => setShareAnchor(e.currentTarget)}
            >
              <ShareOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              sx={{ color: 'text.secondary', mr: 2 }}
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsOutlined />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* User Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, cursor: 'pointer' }}>
            <Tooltip title={`Logged in as ${user.name}`}>
              <Avatar
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                aria-label={`User: ${user.name}`}
              >
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Avatar>
            </Tooltip>
            <Typography
              variant="body2"
              sx={{ ml: 1.5, fontWeight: 500, cursor: 'pointer' }}
              aria-label={`Current user: ${user.name}`}
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            >
              {user.name}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Navigation />
        <Box
          component="main"
          id="main-content"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.default',
            minHeight: 0,
            height: '100%',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Notifications Menu */}
      <NotificationsMenu
        anchorEl={notificationsAnchor}
        onClose={() => setNotificationsAnchor(null)}
        badgeCount={1}
      />

      {/* Share Menu */}
      <ShareMenu
        anchorEl={shareAnchor}
        onClose={() => setShareAnchor(null)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* User Menu */}
      <UserMenu
        anchorEl={userMenuAnchor}
        onClose={() => setUserMenuAnchor(null)}
        userName={user.name}
        onSettingsClick={() => setSettingsOpen(true)}
      />
    </Box>
  )
}

export default Layout

