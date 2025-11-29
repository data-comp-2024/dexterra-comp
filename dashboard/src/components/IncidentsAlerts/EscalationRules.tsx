/**
 * Escalation Rules Display - Read-only escalation conditions
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
  Chip,
} from '@mui/material'
import {
  Phone,
  Sms,
  Email,
  Warning,
} from '@mui/icons-material'

interface EscalationRule {
  id: string
  condition: string
  action: string
  target: string
  icon: React.ReactNode
}

function EscalationRules() {
  const rules: EscalationRule[] = [
    {
      id: '1',
      condition: 'Emergency unresolved for >10 minutes',
      action: 'Escalate to',
      target: 'Ops Manager',
      icon: <Phone />,
    },
    {
      id: '2',
      condition: 'Critical emergency unresolved for >5 minutes',
      action: 'Escalate to',
      target: 'Ops Manager + SMS Alert',
      icon: <Sms />,
    },
    {
      id: '3',
      condition: '3+ emergencies in same washroom within 1 hour',
      action: 'Escalate to',
      target: 'Supervisor',
      icon: <Warning />,
    },
    {
      id: '4',
      condition: 'Happy Score < 70 for >30 minutes',
      action: 'Escalate to',
      target: 'Supervisor',
      icon: <Email />,
    },
    {
      id: '5',
      condition: 'No crew available for emergency assignment',
      action: 'Escalate to',
      target: 'Ops Manager',
      icon: <Phone />,
    },
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Escalation Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These rules define when incidents are automatically escalated to supervisors or managers.
        </Typography>

        <List>
          {rules.map((rule) => (
            <ListItem
              key={rule.id}
              sx={{
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                mb: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                {rule.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {rule.condition}
                    </Typography>
                    <Chip label="Active" size="small" color="success" />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {rule.action} <strong>{rule.target}</strong>
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

export default EscalationRules

