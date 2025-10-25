import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using SceneScout.',
}

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-400">
            Last updated: October 22, 2025
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 bg-white/5 border border-white/10 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="#acceptance" className="text-purple-400 hover:text-purple-300">1. Acceptance of Terms</a></li>
            <li><a href="#beta" className="text-purple-400 hover:text-purple-300">2. Beta Program</a></li>
            <li><a href="#use" className="text-purple-400 hover:text-purple-300">3. Use of Service</a></li>
            <li><a href="#accounts" className="text-purple-400 hover:text-purple-300">4. User Accounts</a></li>
            <li><a href="#content" className="text-purple-400 hover:text-purple-300">5. Content and Ownership</a></li>
            <li><a href="#prohibited" className="text-purple-400 hover:text-purple-300">6. Prohibited Activities</a></li>
            <li><a href="#disclaimers" className="text-purple-400 hover:text-purple-300">7. Disclaimers</a></li>
            <li><a href="#liability" className="text-purple-400 hover:text-purple-300">8. Limitation of Liability</a></li>
            <li><a href="#termination" className="text-purple-400 hover:text-purple-300">9. Termination</a></li>
            <li><a href="#governing" className="text-purple-400 hover:text-purple-300">10. Governing Law</a></li>
            <li><a href="#changes" className="text-purple-400 hover:text-purple-300">11. Changes to Terms</a></li>
            <li><a href="#contact" className="text-purple-400 hover:text-purple-300">12. Contact</a></li>
          </ul>
        </nav>

        {/* Content */}
        <div className="prose prose-invert prose-purple max-w-none space-y-10">

          {/* Section 1 */}
          <section id="acceptance">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using SceneScout ("the Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              These Terms constitute a legally binding agreement between you and SceneScout, operated from
              Ontario, Canada.
            </p>
          </section>

          {/* Section 2 */}
          <section id="beta">
            <h2 className="text-2xl font-bold mb-4">2. Beta Program</h2>
            <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-purple-400">⚠️ Important:</strong> SceneScout is currently in beta.
                The Service is provided "AS IS" and may contain bugs, errors, or incomplete features.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">2.1 Beta Limitations</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Features may change, be added, or removed without notice</li>
              <li>Service availability is not guaranteed</li>
              <li>Data loss may occur (though we make reasonable efforts to prevent it)</li>
              <li>Performance and stability may vary</li>
              <li>No service level agreement (SLA) is provided</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">2.2 Feedback</h3>
            <p className="text-gray-300 leading-relaxed">
              We encourage you to provide feedback, bug reports, and feature requests. By submitting feedback,
              you grant us a perpetual, royalty-free license to use, modify, and incorporate your feedback
              into the Service without compensation or attribution.
            </p>
          </section>

          {/* Section 3 */}
          <section id="use">
            <h2 className="text-2xl font-bold mb-4">3. Use of Service</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">3.1 Eligibility</h3>
            <p className="text-gray-300 leading-relaxed">
              You must be at least 16 years old to use SceneScout. By using the Service, you represent and
              warrant that you meet this age requirement.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">3.2 License</h3>
            <p className="text-gray-300 leading-relaxed">
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable
              license to access and use the Service for personal, non-commercial purposes.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">3.3 Restrictions</h3>
            <p className="text-gray-300 leading-relaxed mb-2">You may not:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Use the Service for commercial purposes without our permission</li>
              <li>Scrape, crawl, or automatically extract event data</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Remove or modify any copyright, trademark, or proprietary notices</li>
              <li>Use the Service in any way that violates applicable laws</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="accounts">
            <h2 className="text-2xl font-bold mb-4">4. User Accounts</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">4.1 Account Creation</h3>
            <p className="text-gray-300 leading-relaxed">
              You may need to create an account to access certain features. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">4.2 Account Security</h3>
            <p className="text-gray-300 leading-relaxed">
              We implement reasonable security measures, but you are responsible for protecting your account.
              We are not liable for losses resulting from unauthorized use of your account.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">4.3 Account Termination</h3>
            <p className="text-gray-300 leading-relaxed">
              You may delete your account at any time through the{' '}
              <Link href="/settings/privacy" className="text-purple-400 hover:underline">
                Privacy Settings
              </Link>.
              Account deletion is permanent and cannot be undone after the 30-day grace period.
            </p>
          </section>

          {/* Section 5 */}
          <section id="content">
            <h2 className="text-2xl font-bold mb-4">5. Content and Ownership</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">5.1 Event Data</h3>
            <p className="text-gray-300 leading-relaxed">
              Event information displayed on SceneScout is sourced from third-party providers
              (Ticketmaster, Eventbrite, etc.). We do not own this content and are not responsible
              for its accuracy.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">5.2 User Content</h3>
            <p className="text-gray-300 leading-relaxed">
              You retain ownership of any feedback or content you submit. By submitting content, you grant
              us a worldwide, royalty-free license to use, display, and distribute it in connection with
              the Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">5.3 Intellectual Property</h3>
            <p className="text-gray-300 leading-relaxed">
              The SceneScout platform, including its design, code, branding, and features, is owned by us
              and protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          {/* Section 6 */}
          <section id="prohibited">
            <h2 className="text-2xl font-bold mb-4">6. Prohibited Activities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree not to engage in any of the following:
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">🚫 Abuse & Harassment</h4>
                <p className="text-gray-300 text-sm">
                  Harassing other users, submitting spam, or abusing the feedback system.
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">🤖 Automated Access</h4>
                <p className="text-gray-300 text-sm">
                  Using bots, scrapers, or automated tools without permission.
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">⚠️ Security Violations</h4>
                <p className="text-gray-300 text-sm">
                  Attempting to breach security, hack accounts, or disrupt service availability.
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">📋 Data Scraping</h4>
                <p className="text-gray-300 text-sm">
                  Systematically extracting event data for commercial use.
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">⚖️ Legal Violations</h4>
                <p className="text-gray-300 text-sm">
                  Using the Service for illegal purposes or violating third-party rights.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="disclaimers">
            <h2 className="text-2xl font-bold mb-4">7. Disclaimers</h2>

            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
              <p className="text-gray-300 leading-relaxed uppercase font-semibold">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">7.1 No Warranty</h3>
            <p className="text-gray-300 leading-relaxed mb-2">We disclaim all warranties, including:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Merchantability and fitness for a particular purpose</li>
              <li>Accuracy, reliability, or completeness of event information</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security or freedom from viruses</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">7.2 Third-Party Content</h3>
            <p className="text-gray-300 leading-relaxed">
              Event data is provided by third parties (Ticketmaster, Eventbrite, etc.). We are not responsible
              for the accuracy, availability, or quality of this content. Always verify event details on the
              official ticketing platform.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">7.3 No Event Guarantee</h3>
            <p className="text-gray-300 leading-relaxed">
              SceneScout is an event discovery tool. We do not sell tickets, organize events, or guarantee
              event availability. Events may be canceled, rescheduled, or sell out.
            </p>
          </section>

          {/* Section 8 */}
          <section id="liability">
            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>

            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
              <p className="text-gray-300 leading-relaxed uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>
            </div>

            <p className="text-gray-300 leading-relaxed mb-4">
              This includes, but is not limited to, damages for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Data loss or corruption</li>
              <li>Service interruptions or unavailability</li>
              <li>Reliance on inaccurate event information</li>
              <li>Unauthorized access to your account</li>
            </ul>

            <p className="text-gray-300 leading-relaxed mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <strong>Maximum Liability:</strong> Our total liability to you for all claims related to the
              Service shall not exceed $100 CAD or the amount you paid us in the past 12 months (currently $0,
              as the Service is free).
            </p>
          </section>

          {/* Section 9 */}
          <section id="termination">
            <h2 className="text-2xl font-bold mb-4">9. Termination</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">9.1 By You</h3>
            <p className="text-gray-300 leading-relaxed">
              You may terminate your account at any time by using the{' '}
              <Link href="/settings/privacy" className="text-purple-400 hover:underline">
                account deletion feature
              </Link>.
              Your data will be permanently deleted after a 30-day grace period.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">9.2 By Us</h3>
            <p className="text-gray-300 leading-relaxed mb-2">
              We may suspend or terminate your access if you:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Violate these Terms</li>
              <li>Engage in prohibited activities</li>
              <li>Abuse the Service or other users</li>
              <li>Are inactive for an extended period (we'll notify you first)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">9.3 Effect of Termination</h3>
            <p className="text-gray-300 leading-relaxed">
              Upon termination, your right to use the Service ceases immediately. We will delete your data
              in accordance with our{' '}
              <Link href="/privacy" className="text-purple-400 hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </section>

          {/* Section 10 */}
          <section id="governing">
            <h2 className="text-2xl font-bold mb-4">10. Governing Law and Dispute Resolution</h2>

            <h3 className="text-xl font-semibold mb-3 text-purple-400">10.1 Governing Law</h3>
            <p className="text-gray-300 leading-relaxed">
              These Terms are governed by the laws of the Province of Ontario, Canada, without regard to
              conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">10.2 Jurisdiction</h3>
            <p className="text-gray-300 leading-relaxed">
              You agree to submit to the exclusive jurisdiction of the courts located in Ontario, Canada,
              for the resolution of any disputes.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-purple-400">10.3 Informal Resolution</h3>
            <p className="text-gray-300 leading-relaxed">
              Before filing a claim, please contact us at{' '}
              <a href="mailto:legal@scenescout.app" className="text-purple-400 hover:underline">
                legal@scenescout.app
              </a>{' '}
              to attempt informal resolution.
            </p>
          </section>

          {/* Section 11 */}
          <section id="changes">
            <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update these Terms from time to time. If we make material changes, we will notify you
              via email or an in-app notification at least 30 days before the changes take effect.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Continued use of the Service after changes take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Section 12 */}
          <section id="contact">
            <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              For questions about these Terms, contact us:
            </p>
            <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-gray-300"><strong>Email:</strong>{' '}
                <a href="mailto:legal@scenescout.app" className="text-purple-400 hover:underline">
                  legal@scenescout.app
                </a>
              </p>
              <p className="text-gray-300 mt-2"><strong>Privacy Inquiries:</strong>{' '}
                <a href="mailto:privacy@scenescout.app" className="text-purple-400 hover:underline">
                  privacy@scenescout.app
                </a>
              </p>
              <p className="text-gray-300 mt-2"><strong>Location:</strong> Ontario, Canada</p>
            </div>
          </section>

          {/* Additional Provisions */}
          <section className="mt-12 p-6 bg-white/5 border border-white/10 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Additional Provisions</h3>

            <h4 className="font-semibold text-purple-400 mb-2">Severability</h4>
            <p className="text-gray-300 text-sm mb-4">
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will continue in full effect.
            </p>

            <h4 className="font-semibold text-purple-400 mb-2">Entire Agreement</h4>
            <p className="text-gray-300 text-sm mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and SceneScout.
            </p>

            <h4 className="font-semibold text-purple-400 mb-2">No Waiver</h4>
            <p className="text-gray-300 text-sm">
              Our failure to enforce any right or provision of these Terms does not constitute a waiver
              of that right or provision.
            </p>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-purple-400 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/settings/cookies" className="hover:text-purple-400 transition-colors">
            Cookie Settings
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-purple-400 transition-colors">
            Back to SceneScout
          </Link>
        </div>
      </div>
    </div>
  )
}
