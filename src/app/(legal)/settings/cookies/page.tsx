import { Metadata } from 'next'
import Link from 'next/link'
import { CookieSettings } from '@/components/legal/CookieSettings'

export const metadata: Metadata = {
  title: 'Cookie Settings',
  description: 'Manage your cookie preferences and learn about the cookies we use.',
}

export default function CookieSettingsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block"
          >
            ← Back to SceneScout
          </Link>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Cookie Settings
          </h1>
          <p className="text-gray-400">
            Manage your cookie preferences and understand what data we collect.
          </p>
        </div>

        {/* Cookie Manager */}
        <CookieSettings />

        {/* Cookie Details */}
        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-6">Cookies We Use</h2>

            {/* Essential Cookies */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Essential Cookies</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white/5 border border-white/10 rounded-lg">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Cookie Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300 text-sm">
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">sb-access-token</td>
                      <td className="px-4 py-3">Supabase authentication token</td>
                      <td className="px-4 py-3">1 hour</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">sb-refresh-token</td>
                      <td className="px-4 py-3">Refresh authentication session</td>
                      <td className="px-4 py-3">30 days</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">scenescout_cookie_consent</td>
                      <td className="px-4 py-3">Remember your cookie preferences</td>
                      <td className="px-4 py-3">1 year</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">onboarding_completed</td>
                      <td className="px-4 py-3">Track if you've seen the onboarding</td>
                      <td className="px-4 py-3">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Analytics Cookies (Optional)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white/5 border border-white/10 rounded-lg">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Cookie Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300 text-sm">
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">ph_*</td>
                      <td className="px-4 py-3">PostHog analytics and session tracking</td>
                      <td className="px-4 py-3">1 year</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">ph_phc_*_posthog</td>
                      <td className="px-4 py-3">PostHog session identifier</td>
                      <td className="px-4 py-3">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Local Storage */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Local Storage Data</h3>
              <p className="text-gray-300 mb-4 text-sm">
                We also use browser local storage (not cookies) to store:
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white/5 border border-white/10 rounded-lg">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Key</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300 text-sm">
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">user_preferences</td>
                      <td className="px-4 py-3">Your app preferences (theme, notifications, etc.)</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-3 font-mono text-xs">saved_events_cache</td>
                      <td className="px-4 py-3">Cache of your saved events for faster loading</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">scenescout_cookie_preferences</td>
                      <td className="px-4 py-3">Your detailed cookie category preferences</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-yellow-400">Third-Party Cookies</h3>
            <p className="text-gray-300 text-sm mb-4">
              When you visit external ticketing sites (Ticketmaster, Eventbrite, etc.) from SceneScout,
              those sites may set their own cookies. We have no control over these cookies.
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                <strong>Ticketmaster:</strong>{' '}
                <a
                  href="https://www.ticketmaster.com/h/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Privacy Policy →
                </a>
              </p>
              <p className="text-gray-300">
                <strong>Eventbrite:</strong>{' '}
                <a
                  href="https://www.eventbrite.com/support/articles/en_US/Troubleshooting/eventbrite-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Privacy Policy →
                </a>
              </p>
            </div>
          </section>

          {/* How to Disable Cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-4">How to Disable Cookies in Your Browser</h2>
            <p className="text-gray-300 mb-4 text-sm">
              If you want to disable all cookies (including essential ones), you can do so in your browser settings.
              Note that this may break some features of SceneScout.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold mb-2">Chrome</h4>
                <p className="text-sm text-gray-400">
                  Settings → Privacy and security → Cookies and other site data
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold mb-2">Firefox</h4>
                <p className="text-sm text-gray-400">
                  Settings → Privacy & Security → Cookies and Site Data
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold mb-2">Safari</h4>
                <p className="text-sm text-gray-400">
                  Preferences → Privacy → Cookies and website data
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold mb-2">Edge</h4>
                <p className="text-sm text-gray-400">
                  Settings → Cookies and site permissions → Cookies and site data
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-purple-400 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-purple-400 transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/settings/privacy" className="hover:text-purple-400 transition-colors">
            Privacy Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
