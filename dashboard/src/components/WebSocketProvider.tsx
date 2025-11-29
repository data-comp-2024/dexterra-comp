/**
 * WebSocket Provider Component
 * Initializes WebSocket connection on app mount
 */

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { websocketService } from '../services/websocketService'
import { setConnectionStatus } from '../store/slices/uiSlice'

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = websocketService.onStatusChange((status) => {
      dispatch(setConnectionStatus(status))
    })

    // Attempt to connect (will fallback to polling if unavailable)
    // Only connect if WebSocket URL is configured
    const wsUrl = import.meta.env.VITE_WS_URL
    if (wsUrl) {
      websocketService.connect()
    } else {
      // No WebSocket URL configured, use polling mode
      dispatch(setConnectionStatus('polling'))
    }

    return () => {
      unsubscribe()
      // Don't disconnect on unmount - let it stay connected
      // websocketService.disconnect()
    }
  }, [dispatch])

  return <>{children}</>
}

