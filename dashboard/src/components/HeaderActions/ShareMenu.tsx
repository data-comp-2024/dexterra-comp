/**
 * Share Menu Component
 */

import { useState } from 'react'
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material'
import {
  ContentCopy,
  Email,
  Link as LinkIcon,
} from '@mui/icons-material'

interface ShareMenuProps {
  anchorEl: HTMLElement | null
  onClose: () => void
}

function ShareMenu({ anchorEl, onClose }: ShareMenuProps) {
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setSnackbar({ open: true, message: 'Link copied to clipboard!' })
      onClose()
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to copy link' })
    }
  }

  const handleEmail = () => {
    const subject = encodeURIComponent('Pearson Washroom Dashboard')
    const body = encodeURIComponent(`Check out this dashboard: ${window.location.href}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    onClose()
  }

  const handleShareAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pearson Washroom Dashboard',
          text: 'Check out this dashboard',
          url: window.location.href,
        })
        onClose()
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled')
      }
    } else {
      // Fallback to copy link
      handleCopyLink()
    }
  }

  return (
    <>
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
        {navigator.share && (
          <MenuItem onClick={handleShareAPI}>
            <ListItemIcon>
              <LinkIcon />
            </ListItemIcon>
            <ListItemText primary="Share via..." />
          </MenuItem>
        )}
        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon>
            <ContentCopy />
          </ListItemIcon>
          <ListItemText primary="Copy link" />
        </MenuItem>
        <MenuItem onClick={handleEmail}>
          <ListItemIcon>
            <Email />
          </ListItemIcon>
          <ListItemText primary="Email link" />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.message.includes('Failed') ? 'error' : 'success'}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ShareMenu

