/**
 * Help Articles - High-level guidance articles
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  ExpandMore,
  LiveTv,
  FlightTakeoff,
  Warning,
} from '@mui/icons-material'

interface Article {
  id: string
  title: string
  icon: React.ReactNode
  content: string
}

const articles: Article[] = [
  {
    id: 'live-ops',
    title: 'How to use Live Ops',
    icon: <LiveTv />,
    content: `
# How to use Live Ops

The Live Ops tab provides real-time visibility into washroom operations and crew activities.

## Key Components

### Mini KPI Panel
- **Average Happy Score**: Overall satisfaction across all washrooms (target: 85+)
- **Active Tasks**: Number of tasks currently assigned or in progress
- **Active Emergencies**: Critical incidents requiring immediate attention
- **Crew Utilization**: Percentage of crew members actively working

### Incoming Demand Panel
Shows tasks and emergencies that need attention:
- **Unassigned Tasks**: Tasks waiting for crew assignment
- **Active Emergencies**: Critical incidents detected
- Sort by time, priority, or location
- Use the menu (⋮) to assign tasks or view details

### Airport Map
Visual representation of washroom status:
- **Green**: Clean and within SLA
- **Yellow**: Due soon (approaching SLA limit)
- **Orange**: Overdue (SLA breached)
- **Red**: Emergency situation
- **Gray**: Closed/inactive
- Click on a washroom to view detailed status

### Crew Strip
Shows current crew assignments and availability:
- Green badge: Available
- Yellow badge: Busy
- Red badge: Unavailable
- Click on crew member to see their current tasks

## Best Practices

1. **Monitor KPIs regularly** - Check average happy score and active emergencies frequently
2. **Prioritize emergencies** - Red indicators require immediate attention
3. **Balance workload** - Use the crew strip to ensure fair task distribution
4. **Use filters** - Filter by terminal or priority to focus on specific areas
    `,
  },
  {
    id: 'mass-delay',
    title: 'What to do when there is a mass delay',
    icon: <FlightTakeoff />,
    content: `
# Handling Mass Flight Delays

When multiple flights are delayed, passenger flow patterns change significantly, requiring operational adjustments.

## Immediate Actions

1. **Assess Impact**
   - Check the Flights tab to see delayed flights
   - Identify affected terminals and gates
   - Review passenger volume projections

2. **Adjust Cleaning Schedule**
   - Increase cleaning frequency for washrooms near delayed flights
   - Extend headway SLAs temporarily if needed
   - Reassign crew to high-traffic areas

3. **Monitor Happy Scores**
   - Watch for washrooms dropping below 85 threshold
   - Preemptively assign cleaning tasks before scores drop
   - Focus on washrooms near delayed flight gates

4. **Optimize Crew Allocation**
   - Use the Optimizer tab to generate optimized assignments
   - Consider extending crew shifts if delays are prolonged
   - Rebalance workload across available crew

## Long-term Adjustments

- **Update Poop Profiles**: If delays become common, update demand profiles for affected washrooms
- **Adjust SLAs**: Consider temporary SLA adjustments for peak delay periods
- **Crew Planning**: Plan for additional crew during known delay-prone times

## Communication

- Notify supervisors of mass delay situations
- Coordinate with airport operations for passenger flow information
- Document any SLA exceptions due to delays
    `,
  },
  {
    id: 'multiple-emergencies',
    title: 'How to handle multiple simultaneous emergencies',
    icon: <Warning />,
    content: `
# Handling Multiple Simultaneous Emergencies

When multiple emergencies occur at the same time, prioritize and coordinate response effectively.

## Prioritization Protocol

1. **Assess Severity**
   - **Critical**: Bodily fluids, overflowing toilets, slip hazards
   - **High**: Odor threshold exceeded, repeated issues
   - **Medium**: Minor spills, maintenance issues
   - **Low**: General cleaning needs

2. **Check Crew Availability**
   - Review Crew & Shifts tab for available crew
   - Consider pulling crew from routine tasks if needed
   - Check if any crew are on break and can be called back

3. **Assign by Priority**
   - Assign critical emergencies first
   - Use the Assignments tab to manually reassign if needed
   - Consider walking distance - assign nearest available crew

## Response Strategy

### Immediate Response (< 5 minutes)
- Assign crew to critical emergencies immediately
- Use emergency response target: 10 minutes
- Escalate if no crew available

### Coordination
- Use the Optimizer tab to generate optimized emergency response plan
- Consider reassigning routine tasks to free up crew
- Monitor response times in real-time

### Escalation Rules
- If emergency unresolved >10 minutes → Escalate to Ops Manager
- If critical emergency unresolved >5 minutes → Escalate + SMS Alert
- If 3+ emergencies in same washroom within 1 hour → Escalate to Supervisor

## Documentation

- All emergency responses are logged in Activity Log
- Document resolution time and crew member assigned
- Review patterns in Incidents & Alerts tab for recurring issues
    `,
  },
]

function HelpArticles() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Help Articles
        </Typography>

        <Box>
          {articles.map((article) => (
            <Accordion key={article.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>{article.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {article.title}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    '& h1': { fontSize: '1.5rem', fontWeight: 600, mb: 2, mt: 1 },
                    '& h2': { fontSize: '1.25rem', fontWeight: 600, mb: 1.5, mt: 2 },
                    '& h3': { fontSize: '1rem', fontWeight: 600, mb: 1, mt: 1.5 },
                    '& ul': { pl: 2, mb: 1 },
                    '& ol': { pl: 2, mb: 1 },
                    '& li': { mb: 0.5 },
                    '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' },
                    '& strong': { fontWeight: 600 },
                  }}
                >
                  {article.content.split('\n').map((line, idx) => {
                    // Simple markdown-like rendering
                    if (line.startsWith('# ')) {
                      return (
                        <Typography key={idx} variant="h5" sx={{ fontWeight: 600, mb: 2, mt: idx > 0 ? 2 : 0 }}>
                          {line.substring(2)}
                        </Typography>
                      )
                    }
                    if (line.startsWith('## ')) {
                      return (
                        <Typography key={idx} variant="h6" sx={{ fontWeight: 600, mb: 1.5, mt: 2 }}>
                          {line.substring(3)}
                        </Typography>
                      )
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <Typography key={idx} variant="subtitle1" sx={{ fontWeight: 600, mb: 1, mt: 1.5 }}>
                          {line.substring(4)}
                        </Typography>
                      )
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return (
                        <Box key={idx} component="li" sx={{ mb: 0.5 }}>
                          {line.substring(2)}
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
      </CardContent>
    </Card>
  )
}

export default HelpArticles

