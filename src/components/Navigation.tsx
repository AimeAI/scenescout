'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import {
  Menu,
  X,
  MapPin,
  Calendar,
  User,
  Settings,
  LogOut,
  Bell,
  Plus,
  Search,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSavedIds } from '@/lib/saved/store'

// TODO: Replace with actual auth state
const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: '/avatars/john.jpg',
  subscription: 'Pro'
}

const cities = [
  { name: 'New York', slug: 'new-york', events: 245 },
  { name: 'London', slug: 'london', events: 189 },
  { name: 'Tokyo', slug: 'tokyo', events: 156 },
  { name: 'Berlin', slug: 'berlin', events: 134 },
  { name: 'Paris', slug: 'paris', events: 98 },
  { name: 'Barcelona', slug: 'barcelona', events: 87 },
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false) // TODO: Replace with actual auth state
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // TODO: Replace with actual authentication check
  useEffect(() => {
    // Check if user is authenticated
    setIsAuthenticated(!!mockUser)
  }, [])

  // Update saved count
  useEffect(() => {
    const updateSavedCount = () => {
      if (typeof window !== 'undefined') {
        setSavedCount(getSavedIds().size)
      }
    }

    updateSavedCount()

    // Listen for storage events to update count when saves happen
    const handleStorageChange = () => updateSavedCount()
    window.addEventListener('storage', handleStorageChange)

    // Also update on interval to catch same-tab changes
    const interval = setInterval(updateSavedCount, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const isActive = (path: string) => pathname === path || pathname.startsWith(path)

  return (
    <nav className={cn(
      'sticky top-0 z-50 w-full border-b transition-all duration-200',
      isScrolled ? 'bg-background/95 backdrop-blur-md' : 'bg-background'
    )}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">SceneScout</div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Cities */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Cities</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px] lg:w-[500px] lg:grid-cols-2">
                      {cities.map((city) => (
                        <NavigationMenuLink key={city.slug} asChild>
                          <Link
                            href={`/city/${city.slug}`}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">{city.name}</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {city.events} active events
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Events */}
                <NavigationMenuItem>
                  <Link href="/feed" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50',
                      isActive('/feed') && 'bg-accent/50'
                    )}>
                      Events
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* Plans */}
                <NavigationMenuItem>
                  <Link href="/plan" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50',
                      isActive('/plan') && 'bg-accent/50'
                    )}>
                      Plans
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* My Events (Saved) */}
                <NavigationMenuItem>
                  <Link href="/saved" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50',
                      isActive('/saved') && 'bg-accent/50'
                    )}>
                      <Heart className="w-4 h-4 mr-1" />
                      My Events
                      {savedCount > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                          {savedCount}
                        </Badge>
                      )}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* Settings */}
                <NavigationMenuItem>
                  <Link href="/settings" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50',
                      isActive('/settings') && 'bg-accent/50'
                    )}>
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Hidden on mobile */}
            <Button variant="ghost" size="sm" className="hidden md:flex min-h-[44px] min-w-[44px]">
              <Search className="w-4 h-4" />
            </Button>

            {/* Submit Event */}
            <Link href="/submit" className="hidden md:block">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <Plus className="w-4 h-4 mr-2" />
                Submit Event
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative hidden sm:flex min-h-[44px] min-w-[44px]">
                  <Bell className="w-4 h-4" />
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                    3
                  </Badge>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full min-h-[44px] min-w-[44px] p-0">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                        <AvatarFallback>{mockUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{mockUser.name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {mockUser.email}
                        </p>
                        <Badge variant="outline" className="w-fit text-xs">
                          {mockUser.subscription}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">
                        <User className="mr-2 h-4 w-4" />
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/preferences">
                        <User className="mr-2 h-4 w-4" />
                        Preferences
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Discovery Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/plan">
                        <Calendar className="mr-2 h-4 w-4" />
                        My Plans
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing">
                        <Settings className="mr-2 h-4 w-4" />
                        Upgrade Plan
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/events">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  Log in
                </Button>
                <Button size="sm" className="min-h-[44px]">
                  Sign up
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/feed"
                className="block px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px] flex items-center"
                onClick={() => setIsOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/plan"
                className="block px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px] flex items-center"
                onClick={() => setIsOpen(false)}
              >
                Plans
              </Link>

              {/* My Events (Saved) */}
              <Link
                href="/saved"
                className="flex items-center px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px]"
                onClick={() => setIsOpen(false)}
              >
                <Heart className="w-4 h-4 mr-2" />
                My Events
                {savedCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {savedCount}
                  </Badge>
                )}
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                className="flex items-center px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px]"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>

              {/* Cities submenu */}
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">Cities</div>
                <div className="grid grid-cols-2 gap-2">
                  {cities.slice(0, 6).map((city) => (
                    <Link
                      key={city.slug}
                      href={`/city/${city.slug}`}
                      className="block px-2 py-1 text-sm rounded hover:bg-accent"
                      onClick={() => setIsOpen(false)}
                    >
                      {city.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/preferences"
                className="flex items-center px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px]"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 mr-2" />
                Preferences
              </Link>

              <Link
                href="/settings"
                className="flex items-center px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px]"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Discovery Settings
              </Link>

              <Link
                href="/submit"
                className="flex items-center px-3 py-3 rounded-md text-base font-medium hover:bg-accent min-h-[44px]"
                onClick={() => setIsOpen(false)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Submit Event
              </Link>

              {!isAuthenticated && (
                <div className="px-3 py-2 space-y-2">
                  <Button className="w-full min-h-[44px]" onClick={() => setIsOpen(false)}>
                    Sign up
                  </Button>
                  <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setIsOpen(false)}>
                    Log in
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}