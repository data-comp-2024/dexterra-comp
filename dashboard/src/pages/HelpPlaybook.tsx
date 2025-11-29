import { Typography, Box, Grid, Tabs, Tab } from '@mui/material'
import { useState } from 'react'
import HelpArticles from '../components/HelpPlaybook/HelpArticles'
import SOPLibrary from '../components/HelpPlaybook/SOPLibrary'
import Glossary from '../components/HelpPlaybook/Glossary'
import TrainingResources from '../components/HelpPlaybook/TrainingResources'

function HelpPlaybook() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Help & Playbook
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Help Articles" />
        <Tab label="SOP Library" />
        <Tab label="Glossary" />
        <Tab label="Training" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <HelpArticles />
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <SOPLibrary />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <Glossary />
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <TrainingResources />
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

export default HelpPlaybook

