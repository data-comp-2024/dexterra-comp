/**
 * SOP Library - Standard Operating Procedures
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Search,
  ExpandMore,
  Description,
  Warning as WarningIcon,
  Build,
  BugReport,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'

interface SOP {
  id: string
  title: string
  category: 'emergency' | 'routine' | 'troubleshooting'
  content: string
  tags: string[]
}

const sops: SOP[] = [
  {
    id: 'emergency-response',
    title: 'Emergency Event Response Protocol',
    category: 'emergency',
    content: `
1. **Immediate Assessment**
   - Review emergency type and severity
   - Check assigned crew availability
   - Verify washroom location and access

2. **Assignment**
   - Assign nearest available crew member
   - Target response time: 10 minutes
   - Escalate if no crew available within 5 minutes

3. **Response**
   - Crew arrives at washroom
   - Assess situation and begin cleanup
   - Update status in system

4. **Resolution**
   - Complete cleanup and verification
   - Mark emergency as resolved
   - Document resolution time

5. **Follow-up**
   - Review response time metrics
   - Check for recurring issues
   - Update washroom status if needed
    `,
    tags: ['emergency', 'response', 'crew'],
  },
  {
    id: 'unhappy-washroom',
    title: 'Protocol for Repeatedly Unhappy Washrooms',
    category: 'routine',
    content: `
When a washroom consistently scores below 85:

1. **Investigation**
   - Review happy score history
   - Check cleaning frequency
   - Examine headway metrics

2. **Immediate Actions**
   - Increase cleaning frequency
   - Assign dedicated crew if needed
   - Review and adjust SLA thresholds

3. **Root Cause Analysis**
   - Check for equipment issues
   - Review passenger traffic patterns
   - Examine time-of-day patterns

4. **Corrective Actions**
   - Update poop profile if demand pattern changed
   - Adjust cleaning schedule
   - Consider maintenance requests

5. **Monitoring**
   - Track improvement in happy scores
   - Continue monitoring for 48 hours
   - Document resolution steps
    `,
    tags: ['happy score', 'routine', 'monitoring'],
  },
  {
    id: 'crew-shortage',
    title: 'Handling Crew Shortages',
    category: 'routine',
    content: `
When crew availability is limited:

1. **Assessment**
   - Count available crew members
   - Review active tasks and emergencies
   - Check upcoming shift schedules

2. **Prioritization**
   - Focus on emergencies first
   - Prioritize overdue tasks
   - Defer non-critical routine tasks

3. **Optimization**
   - Use Optimizer tab to generate efficient assignments
   - Minimize walking distance
   - Balance workload across available crew

4. **Escalation**
   - Notify supervisor if critical gaps exist
   - Request additional crew if needed
   - Document shortage and impact

5. **Recovery**
   - Adjust schedules when crew returns
   - Catch up on deferred tasks
   - Review lessons learned
    `,
    tags: ['crew', 'optimization', 'scheduling'],
  },
  {
    id: 'system-troubleshooting',
    title: 'System Troubleshooting Guide',
    category: 'troubleshooting',
    content: `
Common issues and solutions:

**Issue: Data not updating**
- Check connection status in header
- Refresh page (F5)
- Verify data sources are accessible

**Issue: Tasks not assigning**
- Check crew availability in Crew & Shifts tab
- Verify task priority and SLA deadlines
- Review conflict indicators in Assignments tab

**Issue: Map not showing washrooms**
- Check filter settings (Priority Only vs All)
- Verify terminal filter selection
- Refresh data using refresh button

**Issue: Optimization not running**
- Verify all parameters are set
- Check time window is valid
- Ensure sufficient tasks exist for optimization

**Issue: Reports not generating**
- Check date range selection
- Verify filters are not too restrictive
- Ensure data exists for selected period
    `,
    tags: ['troubleshooting', 'system', 'support'],
  },
]

function SOPLibrary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredSOPs = useMemo(() => {
    return sops.filter((sop) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !sop.title.toLowerCase().includes(searchLower) &&
          !sop.content.toLowerCase().includes(searchLower) &&
          !sop.tags.some((tag) => tag.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && sop.category !== categoryFilter) {
        return false
      }

      return true
    })
  }, [searchTerm, categoryFilter])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency':
        return <WarningIcon color="error" />
      case 'routine':
        return <Build color="primary" />
      case 'troubleshooting':
        return <BugReport color="warning" />
      default:
        return <Description />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emergency':
        return 'error'
      case 'routine':
        return 'primary'
      case 'troubleshooting':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          SOP Library
        </Typography>

        {/* Search and Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search SOPs..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flex: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['all', 'emergency', 'routine', 'troubleshooting'] as const).map((cat) => (
              <Chip
                key={cat}
                label={cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                onClick={() => setCategoryFilter(cat)}
                color={categoryFilter === cat ? (getCategoryColor(cat) as any) : 'default'}
                variant={categoryFilter === cat ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* SOP List */}
        {filteredSOPs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No SOPs found matching your search
          </Typography>
        ) : (
          <Box>
            {filteredSOPs.map((sop) => (
              <Accordion key={sop.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ color: 'primary.main' }}>{getCategoryIcon(sop.category)}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        {sop.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={sop.category}
                          size="small"
                          color={getCategoryColor(sop.category) as any}
                        />
                        {sop.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      whiteSpace: 'pre-wrap',
                      '& ol': { pl: 3, mb: 1 },
                      '& ul': { pl: 3, mb: 1 },
                      '& li': { mb: 0.5 },
                      '& strong': { fontWeight: 600 },
                    }}
                  >
                    {sop.content.split('\n').map((line, idx) => {
                      if (line.match(/^\d+\./)) {
                        // Numbered list item
                        return (
                          <Box key={idx} component="li" sx={{ mb: 1 }}>
                            <Typography variant="body1">{line.substring(line.indexOf(' ') + 1)}</Typography>
                          </Box>
                        )
                      }
                      if (line.trim() === '') {
                        return <Box key={idx} sx={{ mb: 1 }} />
                      }
                      return (
                        <Typography key={idx} variant="body1" sx={{ mb: 1 }}>
                          {line}
                        </Typography>
                      )
                    })}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default SOPLibrary

