/**
 * Loading Skeleton Components
 * Provides consistent loading states across the application
 */

import { Box, Skeleton, Card, CardContent } from '@mui/material'

export function PageSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} variant="rectangular" height={52} sx={{ mb: 1 }} />
      ))}
    </Box>
  )
}

export function CardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="60%" height={30} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={150} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  )
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <Box>
      {Array.from({ length: items }).map((_, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

