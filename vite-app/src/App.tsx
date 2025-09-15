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
import AuthCallback from '@/pages/AuthCallback'
import Auth from '@/pages/Auth'
import Pricing from '@/pages/Pricing'
import { UpgradePage } from '@/pages/UpgradePage'
import { AdminIngestPage } from '@/pages/AdminIngestPage'

function App() {
  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pricing" element={<Pricing />} />
        
        {/* Legacy auth routes for compatibility */}
        <Route path="/auth/login" element={<Auth />} />
        <Route path="/auth/register" element={<Auth />} />
        <Route path="/auth/forgot-password" element={<Auth />} />
        
        {/* Main app routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="event/:id" element={<EventDetailsPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          
          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route path="saved" element={<SavedPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          
          {/* Pro-only routes */}
          <Route element={<AuthGuard requireSubscription="pro" />}>
            <Route path="plan" element={<PlanPage />} />
          </Route>
          
          {/* Admin-only routes */}
          <Route element={<AuthGuard requireAdmin={true} />}>
            <Route path="admin/ingest" element={<AdminIngestPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
