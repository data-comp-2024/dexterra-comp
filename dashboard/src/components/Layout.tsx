import { ReactNode } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Button,
  Divider,
} from '@mui/material'
import {
  NotificationsOutlined,
  HelpOutline,
  ShareOutlined,
  SettingsOutlined,
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import Navigation from './Navigation'
import { RootState } from '../store'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const user = useSelector((state: RootState) => state.user)
  const connectionStatus = useSelector((state: RootState) => state.ui.connectionStatus)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Header Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ px: 3, minHeight: '64px !important' }}>
          {/* Logo */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              mr: 4,
              fontSize: '1.25rem',
            }}
          >
            Pearson Washroom Dashboard
          </Typography>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Connection Status */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mr: 2,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: connectionStatus === 'connected' ? 'success.light' : 'warning.light',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {connectionStatus === 'connected' ? '●' : '○'} {connectionStatus}
          </Box>

          {/* Action Buttons */}
          <IconButton color="inherit" sx={{ color: 'text.secondary', mr: 1 }}>
            <Badge badgeContent={1} color="error">
              <NotificationsOutlined />
            </Badge>
          </IconButton>
          <IconButton color="inherit" sx={{ color: 'text.secondary', mr: 1 }}>
            <HelpOutline />
          </IconButton>
          <IconButton color="inherit" sx={{ color: 'text.secondary', mr: 1 }}>
            <ShareOutlined />
          </IconButton>
          <IconButton color="inherit" sx={{ color: 'text.secondary', mr: 2 }}>
            <SettingsOutlined />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* User Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
              }}
            >
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ ml: 1.5, fontWeight: 500 }}>
              {user.name}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Navigation />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export default Layout

