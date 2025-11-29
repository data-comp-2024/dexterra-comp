/**
 * Glossary - Definitions of key terms
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material'
import {
  Search,
  ExpandMore,
  HelpOutline,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'

interface GlossaryTerm {
  term: string
  definition: string
  category: string
  relatedTerms?: string[]
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Happy Score',
    definition: 'A metric (0-100) representing passenger satisfaction with a washroom. Scores are collected from feedback kiosks, sensors, and aggregated data. A score below 85 triggers alerts and may generate cleaning tasks.',
    category: 'Metrics',
    relatedTerms: ['Threshold', 'SLA'],
  },
  {
    term: 'Headway',
    definition: 'The time elapsed since the last completed cleaning task for a washroom. Headway is measured in minutes and compared against SLA thresholds (typically 45 minutes). If headway exceeds the SLA, the washroom is considered overdue.',
    category: 'Metrics',
    relatedTerms: ['SLA', 'Overdue'],
  },
  {
    term: 'Emergency Event',
    definition: 'A critical incident requiring immediate attention, such as overflowing toilets, bodily fluids, slip hazards, or odor threshold exceeded. Emergency events have a target response time of 10 minutes and are prioritized over routine tasks.',
    category: 'Operations',
    relatedTerms: ['Response Time', 'Priority'],
  },
  {
    term: 'SLA (Service Level Agreement)',
    definition: 'Performance targets for washroom maintenance. Key SLAs include: Max Headway (time between cleanings, typically 45 minutes) and Emergency Response Target (time to respond to emergencies, typically 10 minutes).',
    category: 'Operations',
    relatedTerms: ['Headway', 'Response Time'],
  },
  {
    term: 'Optimizer (Craptimizer)',
    definition: 'An optimization tool that generates efficient task assignments for crew members. The optimizer considers factors like walking distance, emergency response time, and SLA adherence to create optimal assignment plans.',
    category: 'Tools',
    relatedTerms: ['Assignment', 'Optimization'],
  },
  {
    term: 'Poop Profile',
    definition: 'A demand pattern configuration for each washroom that describes typical usage patterns (e.g., "Peak mornings", "Constant high traffic"). Poop profiles help predict cleaning demand and optimize scheduling.',
    category: 'Configuration',
    relatedTerms: ['Demand Forecast', 'Scheduling'],
  },
  {
    term: 'Task',
    definition: 'A cleaning or maintenance activity assigned to a crew member. Tasks can be routine cleaning, emergency cleaning, inspection, or consumable refill. Tasks have priorities (normal, high, emergency) and SLA deadlines.',
    category: 'Operations',
    relatedTerms: ['Assignment', 'Priority', 'SLA'],
  },
  {
    term: 'Crew Status',
    definition: 'The current state of a crew member: off_shift, on_shift, on_break, available, busy, or unavailable. Crew status affects task assignment and workload balancing.',
    category: 'Operations',
    relatedTerms: ['Assignment', 'Availability'],
  },
  {
    term: 'Terminal',
    definition: 'A major section of the airport (e.g., T1, T3). Washrooms are organized by terminal, and operations can be filtered and analyzed by terminal.',
    category: 'Location',
    relatedTerms: ['Zone', 'Concourse'],
  },
  {
    term: 'Zone/Concourse',
    definition: 'A sub-section within a terminal (e.g., Concourse A, Zone B). Zones help organize washrooms and can be used for filtering and reporting.',
    category: 'Location',
    relatedTerms: ['Terminal', 'Gate'],
  },
]

function Glossary() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTerms = useMemo(() => {
    if (!searchTerm) return glossaryTerms

    const searchLower = searchTerm.toLowerCase()
    return glossaryTerms.filter(
      (term) =>
        term.term.toLowerCase().includes(searchLower) ||
        term.definition.toLowerCase().includes(searchLower) ||
        term.category.toLowerCase().includes(searchLower) ||
        term.relatedTerms?.some((rt) => rt.toLowerCase().includes(searchLower))
    )
  }, [searchTerm])

  const categories = Array.from(new Set(glossaryTerms.map((t) => t.category)))

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Glossary
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search terms..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 3 }}
        />

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No terms found matching your search
          </Typography>
        ) : (
          <Box>
            {categories.map((category) => {
              const categoryTerms = filteredTerms.filter((t) => t.category === category)
              if (categoryTerms.length === 0) return null

              return (
                <Box key={category} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    {category}
                  </Typography>
                  {categoryTerms.map((term) => (
                    <Accordion key={term.term} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <HelpOutline color="primary" />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                              {term.term}
                            </Typography>
                            {term.relatedTerms && term.relatedTerms.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                {term.relatedTerms.map((rt) => (
                                  <Chip key={rt} label={rt} size="small" variant="outlined" />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {term.definition}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default Glossary

