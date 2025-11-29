/**
 * Custom hook for WebSocket connection and real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { websocketService, ConnectionStatus, WebSocketMessage } from '../services/websocketService'
import { useDispatch } from 'react-redux'
import { setConnectionStatus } from '../store/slices/uiSlice'

interface UseWebSocketOptions {
  enabled?: boolean
  onTaskUpdate?: (task: any) => void
  onCrewUpdate?: (crew: any) => void
  onEmergencyUpdate?: (event: any) => void
  onHappyScoreUpdate?: (score: any) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, onTaskUpdate, onCrewUpdate, onEmergencyUpdate, onHappyScoreUpdate } = options
  const dispatch = useDispatch()
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const handlersRef = useRef({ onTaskUpdate, onCrewUpdate, onEmergencyUpdate, onHappyScoreUpdate })

  // Keep handlers updated
  useEffect(() => {
    handlersRef.current = { onTaskUpdate, onCrewUpdate, onEmergencyUpdate, onHappyScoreUpdate }
  }, [onTaskUpdate, onCrewUpdate, onEmergencyUpdate, onHappyScoreUpdate])

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = websocketService.onStatusChange((newStatus) => {
      setStatus(newStatus)
      dispatch(setConnectionStatus(newStatus))
    })
    return unsubscribe
  }, [dispatch])

  // Subscribe to messages
  useEffect(() => {
    if (!enabled) return

    const unsubscribe = websocketService.onMessage((message: WebSocketMessage) => {
      const handlers = handlersRef.current

      switch (message.type) {
        case 'task_update':
          if (handlers.onTaskUpdate) {
            handlers.onTaskUpdate(message.payload)
          }
          break
        case 'crew_update':
          if (handlers.onCrewUpdate) {
            handlers.onCrewUpdate(message.payload)
          }
          break
        case 'emergency_update':
          if (handlers.onEmergencyUpdate) {
            handlers.onEmergencyUpdate(message.payload)
          }
          break
        case 'happy_score_update':
          if (handlers.onHappyScoreUpdate) {
            handlers.onHappyScoreUpdate(message.payload)
          }
          break
      }
    })

    return unsubscribe
  }, [enabled])

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      websocketService.connect()
    } else {
      websocketService.disconnect()
    }

    return () => {
      // Don't disconnect on unmount - let it stay connected for other components
      // websocketService.disconnect()
    }
  }, [enabled])

  const send = useCallback((message: WebSocketMessage) => {
    websocketService.send(message)
  }, [])

  return {
    status,
    isConnected: websocketService.isConnected(),
    send,
  }
}

