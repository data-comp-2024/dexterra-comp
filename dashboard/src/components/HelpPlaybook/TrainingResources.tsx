/**
 * Training Resources - Links to videos and training materials
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
} from '@mui/material'
import {
  VideoLibrary,
  School,
  Launch,
} from '@mui/icons-material'

interface TrainingResource {
  id: string
  title: string
  type: 'video' | 'document' | 'tutorial'
  description: string
  url?: string
  duration?: string
}

const trainingResources: TrainingResource[] = [
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview Video',
    type: 'video',
    description: 'Introduction to the Pearson Washroom Dashboard interface and navigation.',
    duration: '5 minutes',
  },
  {
    id: 'live-ops-tutorial',
    title: 'Live Ops Tab Tutorial',
    type: 'tutorial',
    description: 'Step-by-step guide to using the Live Ops tab for real-time monitoring.',
    duration: '10 minutes',
  },
  {
    id: 'optimizer-guide',
    title: 'Using the Optimizer',
    type: 'video',
    description: 'How to run optimizations and apply proposed assignment plans.',
    duration: '8 minutes',
  },
  {
    id: 'emergency-response',
    title: 'Emergency Response Procedures',
    type: 'document',
    description: 'Detailed procedures for handling emergency events and escalations.',
  },
  {
    id: 'crew-management',
    title: 'Crew & Shifts Management',
    type: 'tutorial',
    description: 'Managing crew availability, breaks, and workload balancing.',
    duration: '7 minutes',
  },
]

function TrainingResources() {
  const handleOpenResource = (resource: TrainingResource) => {
    if (resource.url) {
      window.open(resource.url, '_blank')
    } else {
      // TODO: Open resource viewer or show placeholder
      alert(`Opening ${resource.title}...\n\n(Resource viewer coming soon)`)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoLibrary color="primary" />
      case 'document':
        return <School color="primary" />
      case 'tutorial':
        return <School color="primary" />
      default:
        return <Launch />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'primary'
      case 'document':
        return 'info'
      case 'tutorial':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Training Resources
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Access training materials, videos, and tutorials to help you use the dashboard effectively.
        </Typography>

        <List>
          {trainingResources.map((resource) => (
            <ListItem
              key={resource.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon>{getTypeIcon(resource.type)}</ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {resource.title}
                    </Typography>
                    <Chip
                      label={resource.type}
                      size="small"
                      color={getTypeColor(resource.type) as any}
                    />
                    {resource.duration && (
                      <Typography variant="caption" color="text.secondary">
                        {resource.duration}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={resource.description}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Launch />}
                onClick={() => handleOpenResource(resource)}
              >
                Open
              </Button>
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Interactive guided onboarding and embedded video players will be available in a future update.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default TrainingResources

