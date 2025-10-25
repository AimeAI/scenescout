import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-3">
              SceneScout
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Discover the best events, concerts, and nightlife in Toronto.
            </p>
            <div className="text-xs text-gray-500">
              © {currentYear} SceneScout
              <br />
              All rights reserved.
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="hover:text-purple-400 transition-colors">
                  Discover Events
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-purple-400 transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-purple-400 transition-colors">
                  Saved Events
                </Link>
              </li>
              <li>
                <Link href="/near-me" className="hover:text-purple-400 transition-colors">
                  Near Me
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-purple-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/settings/cookies" className="hover:text-purple-400 transition-colors">
                  Cookie Settings
                </Link>
              </li>
              <li>
                <Link href="/settings/privacy" className="hover:text-purple-400 transition-colors">
                  Privacy Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a
                  href="mailto:hello@scenescout.app"
                  className="hover:text-purple-400 transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="mailto:privacy@scenescout.app"
                  className="hover:text-purple-400 transition-colors"
                >
                  Privacy Inquiries
                </a>
              </li>
              <li>
                <a
                  href="mailto:legal@scenescout.app"
                  className="hover:text-purple-400 transition-colors"
                >
                  Legal
                </a>
              </li>
            </ul>

            {/* Social (Optional) */}
            <div className="mt-6">
              <h5 className="font-semibold text-white text-xs mb-2">Follow Us</h5>
              <div className="flex gap-3">
                {/* Add social links when available */}
                <span className="text-xs text-gray-500">Coming soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>
              Made with 💜 in Toronto, Ontario, Canada
            </p>
            <p>
              Beta Version • Data powered by Ticketmaster, Eventbrite & Yelp
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
