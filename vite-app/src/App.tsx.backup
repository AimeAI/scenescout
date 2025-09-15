import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { MapPage } from '@/pages/MapPage'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { SavedPage } from '@/pages/SavedPage'
import { PlanPage } from '@/pages/PlanPage'
import { EventDetailsPage } from '@/pages/EventDetailsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AuthGuard } from '@/components/auth/AuthGuard'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="event/:id" element={<EventDetailsPage />} />
          
          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route path="saved" element={<SavedPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App