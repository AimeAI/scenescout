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
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const isActive = (path: string) => pathname === path || pathname.startsWith(path)

  return (
    <nav className={cn(
      'sticky top-0 z-50 w-full border-b transition-all duration-200',
      isScrolled ? 'bg-background/95 backdrop-blur-md' : 'bg-background'
    )}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-primary">SceneScout</div>
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
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search - Hidden on mobile */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Search className="w-4 h-4" />
            </Button>

            {/* Submit Event */}
            <Link href="/submit">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Plus className="w-4 h-4 mr-2" />
                Submit Event
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                    3
                  </Badge>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
                <Button size="sm">
                  Sign up
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/feed"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
                onClick={() => setIsOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/plan"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
                onClick={() => setIsOpen(false)}
              >
                Plans
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
                href="/submit"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
                onClick={() => setIsOpen(false)}
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Submit Event
              </Link>

              {!isAuthenticated && (
                <div className="px-3 py-2 space-y-2">
                  <Button className="w-full" onClick={() => setIsOpen(false)}>
                    Sign up
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
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