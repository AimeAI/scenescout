import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Github, Twitter, Instagram, Facebook } from 'lucide-react'

const footerLinks = {
  Product: [
    { name: 'Events', href: '/feed' },
    { name: 'Cities', href: '/cities' },
    { name: 'Plans', href: '/plan' },
    { name: 'Submit Event', href: '/submit' },
  ],
  Company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
  ],
  Resources: [
    { name: 'Help Center', href: '/help' },
    { name: 'API Documentation', href: '/docs' },
    { name: 'Community', href: '/community' },
    { name: 'Guidelines', href: '/guidelines' },
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'GDPR', href: '/gdpr' },
  ],
}

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com/scenescout', icon: Twitter },
  { name: 'Instagram', href: 'https://instagram.com/scenescout', icon: Instagram },
  { name: 'Facebook', href: 'https://facebook.com/scenescout', icon: Facebook },
  { name: 'GitHub', href: 'https://github.com/scenescout', icon: Github },
]

const cities = [
  'New York',
  'London',
  'Tokyo',
  'Berlin',
  'Paris',
  'Barcelona',
  'Amsterdam',
  'San Francisco',
  'Los Angeles',
  'Miami'
]

export default function Footer() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Newsletter Section */}
        <div className="mb-12">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-semibold mb-2">Stay in the loop</h3>
            <p className="text-muted-foreground mb-4">
              Get notified about the best events happening in your city
            </p>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button>Subscribe</Button>
            </div>
          </div>
        </div>

        <Separator className="mb-12" />

        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <div className="text-2xl font-bold text-primary">SceneScout</div>
            </Link>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              Discover the pulse of urban culture. Find events, venues, and experiences 
              that define your city.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cities Section */}
        <div className="mb-8">
          <h4 className="font-semibold mb-4">Popular Cities</h4>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city}
                href={`/city/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SceneScout. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <Link href="/sitemap" className="hover:text-foreground transition-colors">
              Sitemap
            </Link>
            <Link href="/accessibility" className="hover:text-foreground transition-colors">
              Accessibility
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}