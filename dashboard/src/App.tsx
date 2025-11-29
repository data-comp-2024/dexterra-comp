import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LiveOps from './pages/LiveOps'
import Assignments from './pages/Assignments'
import Optimizer from './pages/Optimizer'
import DemandFlights from './pages/DemandFlights'
import PerformanceSLAs from './pages/PerformanceSLAs'
import IncidentsAlerts from './pages/IncidentsAlerts'
import CrewShifts from './pages/CrewShifts'
import LocationsConfig from './pages/LocationsConfig'
import ActivityLog from './pages/ActivityLog'
import HelpPlaybook from './pages/HelpPlaybook'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/live-ops" replace />} />
        <Route path="/live-ops" element={<LiveOps />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/optimizer" element={<Optimizer />} />
        <Route path="/demand-flights" element={<DemandFlights />} />
        <Route path="/performance-slas" element={<PerformanceSLAs />} />
        <Route path="/incidents-alerts" element={<IncidentsAlerts />} />
        <Route path="/crew-shifts" element={<CrewShifts />} />
        <Route path="/locations-config" element={<LocationsConfig />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/help-playbook" element={<HelpPlaybook />} />
      </Routes>
    </Layout>
  )
}

export default App

