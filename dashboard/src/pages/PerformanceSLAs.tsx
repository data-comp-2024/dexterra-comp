import { Typography, Box, Grid, Button } from '@mui/material'
import { Download } from '@mui/icons-material'
import { useState } from 'react'
import TimeRangeSelector, { TimeRange } from '../components/PerformanceSLAs/TimeRangeSelector'
import ServiceQualityKPIs from '../components/PerformanceSLAs/ServiceQualityKPIs'
import ResponseHeadwayKPIs from '../components/PerformanceSLAs/ResponseHeadwayKPIs'
import CrewProductivityKPIs from '../components/PerformanceSLAs/CrewProductivityKPIs'
import PerformanceFilters, { PerformanceFilters as FiltersType } from '../components/PerformanceSLAs/PerformanceFilters'

function PerformanceSLAs() {
  // Default to 2024 timeline (Jan 1, 2024 to Dec 31, 2024)
  const default2024Range: TimeRange = {
    start: new Date('2024-01-01T00:00:00'),
    end: new Date('2024-12-31T23:59:59'),
    label: '2024',
  }

  const [timeRange, setTimeRange] = useState<TimeRange>(default2024Range)
  const [filters, setFilters] = useState<FiltersType>({
    terminals: [],
    zones: [],
    washroomTypes: [],
    timeOfDay: [],
    crewMembers: [],
  })

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('Export to CSV', { timeRange, filters })
    alert('CSV export functionality coming soon')
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export (optional)
    console.log('Export to PDF', { timeRange, filters })
    alert('PDF export functionality coming soon')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {/* <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Performance & SLAs
        </Typography> */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<Download />}
            onClick={handleExportCSV}
            variant="outlined"
            size="small"
          >
            Export CSV
          </Button>
          <Button
            startIcon={<Download />}
            onClick={handleExportPDF}
            variant="outlined"
            size="small"
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Time Range Selector */}
        <Grid item xs={12}>
          <TimeRangeSelector onRangeChange={setTimeRange} defaultRange={default2024Range} />
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <PerformanceFilters onFiltersChange={setFilters} />
        </Grid>

        {/* Service Quality KPIs */}
        <Grid item xs={12}>
          <ServiceQualityKPIs timeRange={timeRange} />
        </Grid>

        {/* Response & Headway KPIs */}
        <Grid item xs={12}>
          <ResponseHeadwayKPIs timeRange={timeRange} />
        </Grid>

        {/* Crew Productivity KPIs */}
        <Grid item xs={12}>
          <CrewProductivityKPIs timeRange={timeRange} />
        </Grid>
      </Grid>
    </Box>
  )
}

export default PerformanceSLAs

