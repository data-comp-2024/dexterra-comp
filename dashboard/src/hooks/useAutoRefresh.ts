/**
 * Custom hook for auto-refreshing data at intervals
 */

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setLastDataRefresh } from '../store/slices/uiSlice'

interface UseAutoRefreshOptions {
  intervalMs?: number
  onRefresh?: () => Promise<void> | void
  enabled?: boolean
  triggerOnMount?: boolean
}

export function useAutoRefresh({
  intervalMs = 30000, // 30 seconds default
  onRefresh,
  enabled = true,
  triggerOnMount = false,
}: UseAutoRefreshOptions = {}) {
  const dispatch = useDispatch()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onRefreshRef = useRef(onRefresh)

  // Keep ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const refresh = useCallback(async () => {
    if (onRefreshRef.current) {
      await onRefreshRef.current()
    }
    // Store timestamp as number (serializable) instead of Date object
    dispatch(setLastDataRefresh(Date.now()))
  }, [dispatch])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial refresh
    if (triggerOnMount) {
      refresh()
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      refresh()
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, intervalMs, refresh])

  return { refresh }
}

