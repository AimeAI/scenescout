'use client'

import { ToasterProvider } from '@/providers/ToasterProvider'
// import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
// import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
// import { InstallPrompt } from '@/components/pwa/InstallPrompt'
// import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
// import { CookieConsent } from '@/components/legal/CookieConsent'

export function ClientProviders() {
  return (
    <>
      <ToasterProvider />
      {/* <OfflineIndicator /> */}
      {/* <OnboardingFlow /> */}
      {/* <FeedbackWidget excludePaths={['/login', '/admin']} /> */}
      {/* <InstallPrompt /> */}
      {/* <CookieConsent /> */}
    </>
  )
}
