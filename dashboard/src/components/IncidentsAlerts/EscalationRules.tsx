/**
 * Escalation Rules Configuration - Configurable escalation conditions
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Tooltip,
} from '@mui/material'
import {
  Phone,
  Sms,
  Email,
  Warning,
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
} from '@mui/icons-material'
import { useState, useEffect } from 'react'

export interface EscalationRule {
  id: string
  name: string
  enabled: boolean
  conditionType: 'time_threshold' | 'count_threshold' | 'score_threshold' | 'availability'
  conditionDetails: {
    // For time_threshold
    timeMinutes?: number
    severity?: 'low' | 'medium' | 'high' | 'critical'
    // For count_threshold
    count?: number
    timeWindowMinutes?: number
    // For score_threshold
    scoreThreshold?: number
    durationMinutes?: number
    // For availability
    checkType?: 'crew' | 'equipment'
  }
  actionType: 'notify' | 'escalate' | 'alert'
  actionTarget: string
  actionMethod: 'phone' | 'sms' | 'email' | 'in_app'
  icon: 'phone' | 'sms' | 'email' | 'warning'
}

const DEFAULT_RULES: EscalationRule[] = [
  {
    id: '1',
    name: 'Emergency Unresolved',
    enabled: true,
    conditionType: 'time_threshold',
    conditionDetails: {
      timeMinutes: 10,
      severity: 'high',
    },
    actionType: 'escalate',
    actionTarget: 'Ops Manager',
    actionMethod: 'phone',
    icon: 'phone',
  },
  {
    id: '2',
    name: 'Critical Emergency Unresolved',
    enabled: true,
    conditionType: 'time_threshold',
    conditionDetails: {
      timeMinutes: 5,
      severity: 'critical',
    },
    actionType: 'escalate',
    actionTarget: 'Ops Manager',
    actionMethod: 'sms',
    icon: 'sms',
  },
  {
    id: '3',
    name: 'Multiple Emergencies Same Location',
    enabled: true,
    conditionType: 'count_threshold',
    conditionDetails: {
      count: 3,
      timeWindowMinutes: 60,
    },
    actionType: 'escalate',
    actionTarget: 'Supervisor',
    actionMethod: 'email',
    icon: 'warning',
  },
  {
    id: '4',
    name: 'Low Happy Score',
    enabled: true,
    conditionType: 'score_threshold',
    conditionDetails: {
      scoreThreshold: 70,
      durationMinutes: 30,
    },
    actionType: 'notify',
    actionTarget: 'Supervisor',
    actionMethod: 'email',
    icon: 'email',
  },
  {
    id: '5',
    name: 'No Crew Available',
    enabled: true,
    conditionType: 'availability',
    conditionDetails: {
      checkType: 'crew',
    },
    actionType: 'escalate',
    actionTarget: 'Ops Manager',
    actionMethod: 'phone',
    icon: 'phone',
  },
]

const STORAGE_KEY = 'escalation_rules'

function EscalationRules() {
  const [rules, setRules] = useState<EscalationRule[]>(() => {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return DEFAULT_RULES
      }
    }
    return DEFAULT_RULES
  })

  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Save to localStorage whenever rules change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  }, [rules])

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'phone':
        return <Phone />
      case 'sms':
        return <Sms />
      case 'email':
        return <Email />
      case 'warning':
        return <Warning />
      default:
        return <Warning />
    }
  }

  const formatCondition = (rule: EscalationRule): string => {
    switch (rule.conditionType) {
      case 'time_threshold':
        const severity = rule.conditionDetails.severity || 'any'
        return `${severity.charAt(0).toUpperCase() + severity.slice(1)} emergency unresolved for >${rule.conditionDetails.timeMinutes || 0} minutes`
      case 'count_threshold':
        return `${rule.conditionDetails.count || 0}+ emergencies in same washroom within ${rule.conditionDetails.timeWindowMinutes || 0} minutes`
      case 'score_threshold':
        return `Happy Score < ${rule.conditionDetails.scoreThreshold || 0} for >${rule.conditionDetails.durationMinutes || 0} minutes`
      case 'availability':
        const checkType = rule.conditionDetails.checkType || 'crew'
        return `No ${checkType} available for emergency assignment`
      default:
        return 'Unknown condition'
    }
  }

  const formatAction = (rule: EscalationRule): string => {
    const actionTypeMap: { [key: string]: string } = {
      notify: 'Notify',
      escalate: 'Escalate to',
      alert: 'Alert',
    }
    return `${actionTypeMap[rule.actionType] || 'Escalate to'} ${rule.actionTarget} via ${rule.actionMethod}`
  }

  const handleAdd = () => {
    setEditingRule({
      id: `rule-${Date.now()}`,
      name: 'New Rule',
      enabled: true,
      conditionType: 'time_threshold',
      conditionDetails: {},
      actionType: 'escalate',
      actionTarget: 'Ops Manager',
      actionMethod: 'phone',
      icon: 'phone',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (rule: EscalationRule) => {
    setEditingRule({ ...rule })
    setIsDialogOpen(true)
  }

  const handleDelete = (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this escalation rule?')) {
      setRules(rules.filter((r) => r.id !== ruleId))
    }
  }

  const handleToggleEnabled = (ruleId: string) => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    )
  }

  const handleSave = () => {
    if (!editingRule) return

    if (editingRule.id.startsWith('rule-')) {
      // New rule
      setRules([...rules, editingRule])
    } else {
      // Update existing
      setRules(rules.map((r) => (r.id === editingRule.id ? editingRule : r)))
    }
    setIsDialogOpen(false)
    setEditingRule(null)
  }

  const handleCancel = () => {
    setIsDialogOpen(false)
    setEditingRule(null)
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Escalation Rules
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleAdd}
            >
              Add Rule
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure automatic escalation rules for incidents and emergencies.
          </Typography>

          <List>
            {rules.map((rule) => (
              <ListItem
                key={rule.id}
                sx={{
                  borderLeft: '3px solid',
                  borderColor: rule.enabled ? 'primary.main' : 'grey.400',
                  mb: 1,
                  bgcolor: rule.enabled ? 'action.hover' : 'grey.50',
                  borderRadius: 1,
                }}
              >
                <ListItemIcon sx={{ color: rule.enabled ? 'primary.main' : 'grey.400', minWidth: 40 }}>
                  {getIcon(rule.icon)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {rule.name}
                      </Typography>
                      <Chip
                        label={rule.enabled ? 'Active' : 'Disabled'}
                        size="small"
                        color={rule.enabled ? 'success' : 'default'}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={rule.enabled}
                            onChange={() => handleToggleEnabled(rule.id)}
                          />
                        }
                        label=""
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Condition:</strong> {formatCondition(rule)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Action:</strong> {formatAction(rule)}
                      </Typography>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                  primaryTypographyProps={{ component: 'div' }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit rule">
                    <IconButton size="small" onClick={() => handleEdit(rule)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete rule">
                    <IconButton size="small" onClick={() => handleDelete(rule.id)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))}
            {rules.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No escalation rules configured. Click "Add Rule" to create one.
              </Typography>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule?.id.startsWith('rule-') ? 'Add' : 'Edit'} Escalation Rule</DialogTitle>
        <DialogContent>
          {editingRule && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Rule Name"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Condition Type</InputLabel>
                  <Select
                    value={editingRule.conditionType}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        conditionType: e.target.value as EscalationRule['conditionType'],
                        conditionDetails: {},
                      })
                    }
                    label="Condition Type"
                  >
                    <MenuItem value="time_threshold">Time Threshold</MenuItem>
                    <MenuItem value="count_threshold">Count Threshold</MenuItem>
                    <MenuItem value="score_threshold">Score Threshold</MenuItem>
                    <MenuItem value="availability">Availability Check</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Condition-specific fields */}
              {editingRule.conditionType === 'time_threshold' && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Time (minutes)"
                      value={editingRule.conditionDetails.timeMinutes || ''}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            timeMinutes: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={editingRule.conditionDetails.severity || 'high'}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            conditionDetails: {
                              ...editingRule.conditionDetails,
                              severity: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                            },
                          })
                        }
                        label="Severity"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="critical">Critical</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              {editingRule.conditionType === 'count_threshold' && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Count"
                      value={editingRule.conditionDetails.count || ''}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            count: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Time Window (minutes)"
                      value={editingRule.conditionDetails.timeWindowMinutes || ''}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            timeWindowMinutes: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                </>
              )}

              {editingRule.conditionType === 'score_threshold' && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Score Threshold"
                      value={editingRule.conditionDetails.scoreThreshold || ''}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            scoreThreshold: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Duration (minutes)"
                      value={editingRule.conditionDetails.durationMinutes || ''}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            durationMinutes: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                </>
              )}

              {editingRule.conditionType === 'availability' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Check Type</InputLabel>
                    <Select
                      value={editingRule.conditionDetails.checkType || 'crew'}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          conditionDetails: {
                            ...editingRule.conditionDetails,
                            checkType: e.target.value as 'crew' | 'equipment',
                          },
                        })
                      }
                      label="Check Type"
                    >
                      <MenuItem value="crew">Crew</MenuItem>
                      <MenuItem value="equipment">Equipment</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={editingRule.actionType}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        actionType: e.target.value as EscalationRule['actionType'],
                      })
                    }
                    label="Action Type"
                  >
                    <MenuItem value="notify">Notify</MenuItem>
                    <MenuItem value="escalate">Escalate</MenuItem>
                    <MenuItem value="alert">Alert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Action Target"
                  value={editingRule.actionTarget}
                  onChange={(e) => setEditingRule({ ...editingRule, actionTarget: e.target.value })}
                  placeholder="e.g., Ops Manager, Supervisor"
                />
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Action Method</InputLabel>
                  <Select
                    value={editingRule.actionMethod}
                    onChange={(e) => {
                      const method = e.target.value as EscalationRule['actionMethod']
                      setEditingRule({
                        ...editingRule,
                        actionMethod: method,
                        icon: method === 'phone' ? 'phone' : method === 'sms' ? 'sms' : method === 'email' ? 'email' : 'warning',
                      })
                    }}
                    label="Action Method"
                  >
                    <MenuItem value="phone">Phone</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="in_app">In-App Notification</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingRule.enabled}
                      onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.checked })}
                    />
                  }
                  label="Enable this rule"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" startIcon={<Save />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default EscalationRules
