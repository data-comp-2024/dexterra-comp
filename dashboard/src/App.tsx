import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import { PageSkeleton } from './components/LoadingSkeleton'

// Lazy load pages for code splitting
const LiveOps = lazy(() => import('./pages/LiveOps'))
const Assignments = lazy(() => import('./pages/Assignments'))
const Optimizer = lazy(() => import('./pages/Optimizer'))
const DemandFlights = lazy(() => import('./pages/DemandFlights'))
const PerformanceSLAs = lazy(() => import('./pages/PerformanceSLAs'))
const IncidentsAlerts = lazy(() => import('./pages/IncidentsAlerts'))
const CrewShifts = lazy(() => import('./pages/CrewShifts'))
const LocationsConfig = lazy(() => import('./pages/LocationsConfig'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const HelpPlaybook = lazy(() => import('./pages/HelpPlaybook'))
const Notifications = lazy(() => import('./pages/Notifications'))

function App() {
  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
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
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}


export default App

