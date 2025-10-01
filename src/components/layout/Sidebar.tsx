'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Compass,
  Map,
  Calendar,
  Grid3X3,
  MapPin,
  Plus,
  User,
  Settings,
  Menu,
  X,
  ChevronRight,
  Search,
  Heart,
  Bell
} from 'lucide-react'
import { SidebarItem, SidebarState } from '@/types'
import { getSavedIds } from '@/lib/saved/store'

const getSidebarItems = (savedCount: number): SidebarItem[] => [
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    href: '/',
  },
  {
    id: 'discover',
    title: 'Discover',
    icon: Compass,
    href: '/feed',
  },
  {
    id: 'map',
    title: 'Map View',
    icon: Map,
    href: '/map',
  },
  {
    id: 'my-events',
    title: 'My Events',
    icon: Heart,
    href: '/saved',
    badge: savedCount,
  },
  {
    id: 'categories',
    title: 'Categories',
    icon: Grid3X3,
    href: '/categories',
    children: [
      { id: 'music', title: 'Music', icon: () => <span>🎵</span>, href: '/categories/music' },
      { id: 'sports', title: 'Sports', icon: () => <span>⚽</span>, href: '/categories/sports' },
      { id: 'arts', title: 'Arts', icon: () => <span>🎨</span>, href: '/categories/arts' },
      { id: 'food', title: 'Food', icon: () => <span>🍽️</span>, href: '/categories/food' },
      { id: 'tech', title: 'Tech', icon: () => <span>💻</span>, href: '/categories/tech' },
      { id: 'social', title: 'Social', icon: () => <span>👥</span>, href: '/categories/social' },
    ],
  },
  {
    id: 'cities',
    title: 'Cities',
    icon: MapPin,
    href: '/cities',
  },
  {
    id: 'submit',
    title: 'Submit Event',
    icon: Plus,
    href: '/submit',
  },
  {
    id: 'account',
    title: 'Account',
    icon: User,
    href: '/account',
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [sidebarState, setSidebarState] = useState<SidebarState>({
    isOpen: true,
    isMinimized: false,
  })
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // Update saved count
  useEffect(() => {
    const updateSavedCount = () => {
      if (typeof window !== 'undefined') {
        setSavedCount(getSavedIds().size)
      }
    }
    updateSavedCount()
    const handleStorageChange = () => updateSavedCount()
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(updateSavedCount, 1000)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(mobile)
      
      // Auto-minimize on mobile
      if (mobile && !sidebarState.isMinimized) {
        setSidebarState(prev => ({ ...prev, isMinimized: true, isOpen: false }))
      }
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [sidebarState.isMinimized])

  // Auto-minimize when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarState(prev => ({ ...prev, isOpen: false }))
    }
  }, [pathname, isMobile])

  const toggleSidebar = () => {
    setSidebarState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }

  const toggleMinimize = () => {
    setSidebarState(prev => ({ 
      ...prev, 
      isMinimized: !prev.isMinimized,
      isOpen: prev.isMinimized ? true : prev.isOpen 
    }))
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarWidth = sidebarState.isMinimized ? 'w-16' : 'w-64'
  const sidebarTranslate = sidebarState.isOpen ? 'translate-x-0' : '-translate-x-full'

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && sidebarState.isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed top-4 left-4 z-50 lg:hidden",
          "flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "bg-black/20 backdrop-blur-md border border-white/10",
          "text-white hover:bg-white/10 transition-colors"
        )}
      >
        {sidebarState.isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out",
          sidebarWidth,
          sidebarTranslate,
          "bg-gradient-to-b from-black/90 via-black/80 to-black/90",
          "backdrop-blur-xl border-r border-white/10",
          "shadow-2xl shadow-black/50",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {!sidebarState.isMinimized ? (
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-semibold text-lg">SceneScout</span>
            </Link>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          )}

          {/* Desktop Minimize/Expand Button */}
          <button
            onClick={toggleMinimize}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight 
              size={16} 
              className={cn(
                "transition-transform duration-200",
                sidebarState.isMinimized ? "rotate-0" : "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Search Bar */}
        {!sidebarState.isMinimized && (
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {getSidebarItems(savedCount).map((item) => (
              <SidebarMenuItem
                key={item.id}
                item={item}
                isActive={isActive(item.href)}
                isMinimized={sidebarState.isMinimized}
                isExpanded={expandedItems.includes(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                pathname={pathname}
              />
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {!sidebarState.isMinimized && (
          <div className="border-t border-white/10 p-4 space-y-2">
            <div className="flex items-center space-x-3 text-white/60 text-sm">
              <Heart size={16} />
              <span>23 saved events</span>
            </div>
            <div className="flex items-center space-x-3 text-white/60 text-sm">
              <Bell size={16} />
              <span>5 notifications</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

interface SidebarMenuItemProps {
  item: SidebarItem
  isActive: boolean
  isMinimized: boolean
  isExpanded: boolean
  onToggleExpanded: () => void
  pathname: string
  level?: number
}

function SidebarMenuItem({ 
  item, 
  isActive, 
  isMinimized, 
  isExpanded, 
  onToggleExpanded,
  pathname,
  level = 0 
}: SidebarMenuItemProps) {
  const hasChildren = item.children && item.children.length > 0
  const Icon = item.icon

  return (
    <li>
      <div className="relative">
        {hasChildren && !isMinimized ? (
          <button
            onClick={onToggleExpanded}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-white/70 hover:text-white hover:bg-white/10",
              isActive && "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-r-2 border-purple-500",
              level > 0 && "ml-4 text-sm"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
            <ChevronRight 
              size={16} 
              className={cn(
                "transition-transform duration-200 text-white/40",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              "text-white/70 hover:text-white hover:bg-white/10",
              isActive && "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-r-2 border-purple-500",
              level > 0 && "ml-4 text-sm",
              isMinimized && "justify-center px-2"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!isMinimized && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        )}

        {/* Minimized Tooltip */}
        {isMinimized && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
            {item.title}
            {item.badge && (
              <span className="ml-2 bg-red-500 text-xs rounded-full px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && !isMinimized && (
        <ul className="mt-1 space-y-1 ml-3 border-l border-white/10 pl-3">
          {item.children?.map((child) => (
            <SidebarMenuItem
              key={child.id}
              item={child}
              isActive={pathname === child.href}
              isMinimized={false}
              isExpanded={false}
              onToggleExpanded={() => {}}
              pathname={pathname}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}