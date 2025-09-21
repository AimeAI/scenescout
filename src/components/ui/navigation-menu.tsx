'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const NavigationMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function NavigationMenu(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('relative flex items-center', className)} {...props} />
})

const NavigationMenuList = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(function NavigationMenuList(
  { className, ...props },
  ref
) {
  return <ul ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
})

const NavigationMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(function NavigationMenuItem(
  { className, ...props },
  ref
) {
  return <li ref={ref} className={cn('list-none', className)} {...props} />
})

const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function NavigationMenuTrigger(
  { className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-accent',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})

const NavigationMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function NavigationMenuContent(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('absolute left-0 top-full mt-2 min-w-[200px] rounded-lg border bg-popover p-4 shadow-lg', className)}
      {...props}
    />
  )
})

interface NavigationMenuLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}

const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(function NavigationMenuLink(
  { className, children, asChild, ...props },
  ref
) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn('block text-sm leading-tight transition-colors hover:text-primary', (children as any).props?.className, className),
      ref,
      ...props,
    })
  }

  return (
    <a ref={ref} className={cn('block text-sm leading-tight transition-colors hover:text-primary', className)} {...props}>
      {children}
    </a>
  )
})

const NavigationMenuIndicator: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...props }) => (
  <span className={cn('hidden', className)} {...props} />
)

const NavigationMenuViewport: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('hidden', className)} {...props} />
)

const navigationMenuTriggerStyle = (...classes: Array<string | undefined>) => cn('inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors', ...classes)

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
