import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how SceneScout collects, uses, and protects your personal data.',
}

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-gray-400">
            Last updated: October 22, 2025
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 bg-white/5 border border-white/10 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="#introduction" className="text-purple-400 hover:text-purple-300">1. Introduction</a></li>
            <li><a href="#data-collection" className="text-purple-400 hover:text-purple-300">2. What Data We Collect</a></li>
            <li><a href="#how-we-use" className="text-purple-400 hover:text-purple-300">3. How We Use Your Data</a></li>
            <li><a href="#third-party" className="text-purple-400 hover:text-purple-300">4. Third-Party Services</a></li>
            <li><a href="#cookies" className="text-purple-400 hover:text-purple-300">5. Cookies and Tracking</a></li>
            <li><a href="#your-rights" className="text-purple-400 hover:text-purple-300">6. Your Rights</a></li>
            <li><a href="#data-security" className="text-purple-400 hover:text-purple-300">7. Data Security</a></li>
            <li><a href="#data-retention" className="text-purple-400 hover:text-purple-300">8. Data Retention</a></li>
            <li><a href="#children" className="text-purple-400 hover:text-purple-300">9. Children's Privacy</a></li>
            <li><a href="#changes" className="text-purple-400 hover:text-purple-300">10. Changes to Policy</a></li>
            <li><a href="#contact" className="text-purple-400 hover:text-purple-300">11. Contact Us</a></li>
          </ul>
        </nav>

        {/* Content */}
        <div className="prose prose-invert prose-purple max-w-none space-y-10">

          {/* Section 1 */}
          <section id="introduction">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Welcome to SceneScout. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, share, and protect your information when you use
              our event discovery platform.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              SceneScout is operated from Ontario, Canada, and we comply with the Personal Information Protection
              and Electronic Documents Act (PIPEDA), as well as the EU General Data Protection Regulation (GDPR)
              for our European users.
            </p>
          </section>

          {/* Section 2 */}
          <section id="data-collection">
            <h2 className="text-2xl font-bold mb-4">2. What Data We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Email address (if you create an account)</li>
              <li><strong>Event Interactions:</strong> Events you save, like, or set reminders for</li>
              <li><strong>Feedback:</strong> Messages, bug reports, or feature requests you submit</li>
              <li><strong>Communication Preferences:</strong> Notification settings and email preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">2.2 Automatically Collected Data</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Location Data:</strong> Approximate location (city-level) to show nearby events</li>
              <li><strong>Usage Data:</strong> Pages viewed, features used, search queries</li>
              <li><strong>Device Information:</strong> Browser type, operating system, screen size</li>
              <li><strong>Analytics Data:</strong> Session duration, interaction patterns (via PostHog)</li>
              <li><strong>Error Logs:</strong> Technical errors for debugging (via Sentry)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">2.3 Data We Don't Collect</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Precise GPS coordinates (we only use city-level location)</li>
              <li>Payment information (we don't process transactions)</li>
              <li>Social media account data</li>
              <li>Government-issued ID or passport information</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="how-we-use">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Data</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use your personal data for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Personalization:</strong> Recommend events based on your interests and location</li>
              <li><strong>Notifications:</strong> Send reminders for events you've saved</li>
              <li><strong>Service Improvement:</strong> Analyze usage patterns to improve features</li>
              <li><strong>Communication:</strong> Send important updates about the service (rarely)</li>
              <li><strong>Bug Fixes:</strong> Debug technical issues and improve stability</li>
              <li><strong>Legal Compliance:</strong> Meet regulatory requirements and prevent abuse</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4 bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
              <strong>Legal Basis (GDPR):</strong> We process your data based on consent (notifications),
              legitimate interest (service improvement), and contractual necessity (providing the service).
            </p>
          </section>

          {/* Section 4 */}
          <section id="third-party">
            <h2 className="text-2xl font-bold mb-4">4. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the following trusted third-party services:
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-2">Supabase (Database & Authentication)</h4>
                <p className="text-gray-300 text-sm">
                  Stores your saved events, reminders, and account information.
                  <br />
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener" className="text-purple-400 hover:underline">
                    Supabase Privacy Policy →
                  </a>
                </p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-2">PostHog (Analytics)</h4>
                <p className="text-gray-300 text-sm">
                  Tracks usage patterns to improve the product. You can opt-out in cookie settings.
                  <br />
                  <a href="https://posthog.com/privacy" target="_blank" rel="noopener" className="text-purple-400 hover:underline">
                    PostHog Privacy Policy →
                  </a>
                </p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-2">Sentry (Error Monitoring)</h4>
                <p className="text-gray-300 text-sm">
                  Captures error logs to fix bugs. No personal data is intentionally sent.
                  <br />
                  <a href="https://sentry.io/privacy/" target="_blank" rel="noopener" className="text-purple-400 hover:underline">
                    Sentry Privacy Policy →
                  </a>
                </p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-2">Resend (Email Delivery)</h4>
                <p className="text-gray-300 text-sm">
                  Sends event reminders and account notifications.
                  <br />
                  <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener" className="text-purple-400 hover:underline">
                    Resend Privacy Policy →
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="cookies">
            <h2 className="text-2xl font-bold mb-4">5. Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Essential:</strong> Keep you logged in, remember your preferences</li>
              <li><strong>Analytics:</strong> Understand how you use the app (PostHog)</li>
              <li><strong>Performance:</strong> Cache data for faster loading</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You can manage cookie preferences using our{' '}
              <Link href="/settings/cookies" className="text-purple-400 hover:underline">
                Cookie Settings
              </Link>.
            </p>
          </section>

          {/* Section 6 */}
          <section id="your-rights">
            <h2 className="text-2xl font-bold mb-4">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the following rights regarding your personal data:
            </p>

            <div className="grid gap-4">
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">🔍 Right to Access</h4>
                <p className="text-gray-300 text-sm">
                  Request a copy of all data we hold about you.{' '}
                  <Link href="/settings/privacy" className="text-purple-400 hover:underline">
                    Download your data →
                  </Link>
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">✏️ Right to Rectification</h4>
                <p className="text-gray-300 text-sm">
                  Correct inaccurate data through your account settings.
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">🗑️ Right to Erasure</h4>
                <p className="text-gray-300 text-sm">
                  Delete your account and all associated data.{' '}
                  <Link href="/settings/privacy" className="text-purple-400 hover:underline">
                    Delete account →
                  </Link>
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">📦 Right to Data Portability</h4>
                <p className="text-gray-300 text-sm">
                  Export your data in JSON format for use elsewhere.
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">🚫 Right to Object</h4>
                <p className="text-gray-300 text-sm">
                  Opt-out of analytics and marketing communications.
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">⏸️ Right to Restriction</h4>
                <p className="text-gray-300 text-sm">
                  Limit how we process your data in certain circumstances.
                </p>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <strong>⚠️ Note:</strong> Some requests may take up to 30 days to process.
              We'll confirm receipt within 72 hours.
            </p>
          </section>

          {/* Section 7 */}
          <section id="data-security">
            <h2 className="text-2xl font-bold mb-4">7. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>🔒 HTTPS encryption for all data transmission</li>
              <li>🛡️ Supabase Row-Level Security (RLS) for database access control</li>
              <li>🔑 Secure authentication with JWTs</li>
              <li>📊 Regular security audits and vulnerability scans</li>
              <li>🚨 Automated error monitoring and alerting</li>
              <li>💾 Regular database backups</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              However, no method of transmission over the internet is 100% secure.
              We cannot guarantee absolute security.
            </p>
          </section>

          {/* Section 8 */}
          <section id="data-retention">
            <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We retain your data for the following periods:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white/5 border border-white/10 rounded-lg">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-purple-400">Data Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-purple-400">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Saved Events & Reminders</td>
                    <td className="px-4 py-3">Until you delete them or close your account</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Account Data</td>
                    <td className="px-4 py-3">30 days after account deletion request</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Analytics Data</td>
                    <td className="px-4 py-3">90 days (aggregated, anonymized)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-3">Error Logs</td>
                    <td className="px-4 py-3">90 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Email Logs</td>
                    <td className="px-4 py-3">30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 9 */}
          <section id="children">
            <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneScout is intended for users aged 16 and older. We do not knowingly collect
              personal data from children under 16. If you believe we have inadvertently collected
              such data, please contact us immediately at{' '}
              <a href="mailto:privacy@scenescout.app" className="text-purple-400 hover:underline">
                privacy@scenescout.app
              </a>.
            </p>
          </section>

          {/* Section 10 */}
          <section id="changes">
            <h2 className="text-2xl font-bold mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this privacy policy occasionally. Changes will be posted on this page
              with an updated "Last updated" date. For material changes, we'll notify you via email
              or an in-app notification.
            </p>
          </section>

          {/* Section 11 */}
          <section id="contact">
            <h2 className="text-2xl font-bold mb-4">11. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              For privacy-related questions or to exercise your rights, contact us:
            </p>
            <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-gray-300"><strong>Email:</strong>{' '}
                <a href="mailto:privacy@scenescout.app" className="text-purple-400 hover:underline">
                  privacy@scenescout.app
                </a>
              </p>
              <p className="text-gray-300 mt-2"><strong>Response Time:</strong> Within 72 hours</p>
              <p className="text-gray-300 mt-2"><strong>Location:</strong> Ontario, Canada</p>
            </div>

            <p className="text-gray-300 leading-relaxed mt-6 text-sm">
              <strong>EU Users:</strong> You have the right to lodge a complaint with your local
              data protection authority if you believe we've violated GDPR.
            </p>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-400">
          <Link href="/terms" className="hover:text-purple-400 transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/settings/cookies" className="hover:text-purple-400 transition-colors">
            Cookie Settings
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
