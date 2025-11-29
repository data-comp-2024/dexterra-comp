import { Typography, Box, Grid, Tabs, Tab } from '@mui/material'
import { useState } from 'react'
import WashroomCatalog from '../components/LocationsConfig/WashroomCatalog'
import PoopProfileConfig from '../components/LocationsConfig/PoopProfileConfig'
import RulesThresholds from '../components/LocationsConfig/RulesThresholds'

function LocationsConfig() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Locations & Config
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Washroom Catalog" />
        <Tab label="Poop Profiles" />
        <Tab label="Rules & Thresholds" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <WashroomCatalog />
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <PoopProfileConfig />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12}>
            <RulesThresholds />
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

export default LocationsConfig

