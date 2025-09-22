/**
 * Configuration for different scraping targets
 * Defines selectors and settings for various event sources
 */

import { ScrapeTarget } from '../types'

/**
 * Eventbrite scraping target configurations
 */
export const EVENTBRITE_TARGETS: Record<string, ScrapeTarget> = {
  search_results: {
    id: 'eventbrite_search',
    name: 'Eventbrite Search Results',
    baseUrl: 'https://www.eventbrite.com/d/{{location}}/events/',
    source: 'eventbrite',
    selectors: {
      events: {
        container: '[data-testid="search-results"], .search-results',
        eventCard: '[data-testid="search-result-card"], .search-result-card, .eds-event-card',
        title: '[data-testid="event-name"], .event-name, .event-title h2, .eds-event-card__title',
        description: '[data-testid="event-description"], .event-description, .event-summary',
        date: '[data-testid="event-start-date"], .event-date, .event-start-date',
        time: '[data-testid="event-start-time"], .event-time, .event-start-time',
        venue: '[data-testid="venue-name"], .venue-name, .event-venue',
        price: '[data-testid="ticket-price"], .price, .event-price, .ticket-price',
        image: '[data-testid="event-image"] img, .event-image img, .event-card-image img',
        link: 'a[href*="/e/"], a[href*="/events/"]',
        category: '[data-testid="event-category"], .event-category',
        tags: '.event-tags .tag, .tags .tag'
      },
      pagination: {
        nextButton: '[data-testid="pagination-next"], .pagination-next, .eds-pagination__navigation--next',
        hasMore: '[data-testid="has-more-events"]'
      }
    },
    pagination: {
      type: 'button',
      selector: '[data-testid="pagination-next"], .pagination-next',
      maxPages: 10
    },
    cookieConsent: {
      selector: '[data-cookiebanner="accept_button"], #onetrust-accept-btn-handler, .cookie-accept',
      action: 'click',
      waitTime: 3000
    },
    antiBot: {
      detectCaptcha: true,
      captchaSelectors: [
        '.captcha',
        '#captcha',
        '[data-captcha]',
        '.recaptcha',
        '.cf-browser-verification'
      ],
      cloudflareDetection: true,
      rateLimitDetection: true,
      jsDetection: true,
      behaviorSimulation: {
        mouseMovement: true,
        scrolling: true,
        typing: false,
        randomDelays: true
      }
    }
  },
  
  city_events: {
    id: 'eventbrite_city',
    name: 'Eventbrite City Events',
    baseUrl: 'https://www.eventbrite.com/d/{{city}}/events/',
    source: 'eventbrite',
    selectors: {
      events: {
        container: '.search-results, [data-testid="search-results"]',
        eventCard: '.event-card, [data-testid="search-result-card"]',
        title: '.event-title h2, [data-testid="event-name"]',
        description: '.event-summary, [data-testid="event-description"]',
        date: '.event-date, [data-testid="event-start-date"]',
        time: '.event-time, [data-testid="event-start-time"]',
        venue: '.event-venue, [data-testid="venue-name"]',
        price: '.event-price, [data-testid="ticket-price"]',
        image: '.event-card-image img',
        link: 'a[href*="/e/"]'
      }
    },
    pagination: {
      type: 'infinite_scroll',
      maxPages: 5,
      scrollDelay: 2000
    }
  }
}

/**
 * Facebook Events scraping target configurations
 */
export const FACEBOOK_TARGETS: Record<string, ScrapeTarget> = {
  public_events: {
    id: 'facebook_events',
    name: 'Facebook Public Events',
    baseUrl: 'https://www.facebook.com/events/search/',
    source: 'facebook_events',
    selectors: {
      events: {
        container: '[role="main"] [data-pagelet="EventsCard"]',
        eventCard: '[data-testid="event-card"], .event-card',
        title: '[data-testid="event-title"] a, .event-title a',
        description: '[data-testid="event-description"], .event-description',
        date: '[data-testid="event-date"], .event-date',
        venue: '[data-testid="event-venue"], .event-venue',
        price: '[data-testid="event-price"], .event-price',
        image: '[data-testid="event-image"] img',
        link: 'a[href*="/events/"]'
      }
    },
    pagination: {
      type: 'infinite_scroll',
      maxPages: 3,
      scrollDelay: 3000
    },
    authentication: {
      type: 'none' // Public events only
    },
    antiBot: {
      detectCaptcha: true,
      captchaSelectors: ['.captcha_refresh'],
      cloudflareDetection: false,
      rateLimitDetection: true,
      jsDetection: true,
      behaviorSimulation: {
        mouseMovement: true,
        scrolling: true,
        typing: false,
        randomDelays: true
      }
    }
  }
}

/**
 * Meetup scraping target configurations
 */
export const MEETUP_TARGETS: Record<string, ScrapeTarget> = {
  events_search: {
    id: 'meetup_events',
    name: 'Meetup Events Search',
    baseUrl: 'https://www.meetup.com/find/events/',
    source: 'meetup',
    selectors: {
      events: {
        container: '[data-testid="event-card-list"]',
        eventCard: '[data-testid="event-card"]',
        title: '[data-testid="event-title"]',
        description: '[data-testid="event-description"]',
        date: '[data-testid="event-datetime"]',
        venue: '[data-testid="event-venue"]',
        price: '[data-testid="event-price"]',
        image: '[data-testid="event-image"] img',
        link: 'a[href*="/events/"]'
      }
    },
    pagination: {
      type: 'button',
      selector: '[data-testid="load-more"]',
      maxPages: 5
    }
  }
}

/**
 * Venue-specific scraping targets
 */
export const VENUE_TARGETS: Record<string, ScrapeTarget> = {
  venue_website: {
    id: 'venue_direct',
    name: 'Venue Website Events',
    baseUrl: '{{venue_url}}/events',
    source: 'venue_direct',
    selectors: {
      events: {
        container: '.events, .event-list, #events',
        eventCard: '.event, .event-item, .event-card',
        title: '.event-title, .title, h2, h3',
        description: '.event-description, .description, .summary',
        date: '.event-date, .date, time',
        venue: '.venue, .location',
        price: '.price, .cost, .ticket-price',
        image: '.event-image img, .image img',
        link: 'a'
      }
    },
    pagination: {
      type: 'url_params',
      paramName: 'page',
      maxPages: 3
    }
  }
}

/**
 * Additional specialized targets
 */
export const SPECIALIZED_TARGETS: Record<string, ScrapeTarget> = {
  ticketmaster: {
    id: 'ticketmaster_events',
    name: 'Ticketmaster Events',
    baseUrl: 'https://www.ticketmaster.com/search',
    source: 'ticketmaster',
    selectors: {
      events: {
        container: '.SearchResults',
        eventCard: '.SearchResult',
        title: '.EventDetails h3',
        date: '.EventDetails .date',
        venue: '.EventDetails .venue',
        price: '.PriceRange',
        image: '.EventImage img',
        link: 'a'
      }
    },
    pagination: {
      type: 'button',
      selector: '.LoadMore',
      maxPages: 5
    }
  },
  
  resident_advisor: {
    id: 'ra_events',
    name: 'Resident Advisor Events',
    baseUrl: 'https://ra.co/events/{{location}}',
    source: 'resident_advisor',
    selectors: {
      events: {
        container: '.event-listing',
        eventCard: '.event-item',
        title: '.event-title',
        date: '.event-date',
        venue: '.event-venue',
        price: '.event-price',
        image: '.event-image img',
        link: 'a'
      }
    }
  },
  
  songkick: {
    id: 'songkick_events',
    name: 'Songkick Events',
    baseUrl: 'https://www.songkick.com/metro_areas/{{metro_id}}',
    source: 'songkick',
    selectors: {
      events: {
        container: '.events-summary',
        eventCard: '.event-listings li',
        title: '.artists strong',
        date: '.date',
        venue: '.venue',
        price: '.price',
        link: 'a'
      }
    }
  }
}

/**
 * Target configuration by location
 */
export const LOCATION_BASED_TARGETS = {
  'san-francisco': {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/ca--san-francisco/events/'
    },
    facebook: {
      ...FACEBOOK_TARGETS.public_events,
      baseUrl: 'https://www.facebook.com/events/search/?q=san%20francisco'
    }
  },
  
  'new-york': {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/ny--new-york/events/'
    },
    facebook: {
      ...FACEBOOK_TARGETS.public_events,
      baseUrl: 'https://www.facebook.com/events/search/?q=new%20york'
    }
  },
  
  'los-angeles': {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/ca--los-angeles/events/'
    }
  }
}

/**
 * Category-specific targets
 */
export const CATEGORY_TARGETS = {
  music: {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/{{location}}/events--music/',
      selectors: {
        ...EVENTBRITE_TARGETS.search_results.selectors,
        events: {
          ...EVENTBRITE_TARGETS.search_results.selectors.events,
          category: '.music-category, [data-category="music"]'
        }
      }
    },
    resident_advisor: SPECIALIZED_TARGETS.resident_advisor,
    songkick: SPECIALIZED_TARGETS.songkick
  },
  
  arts: {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/{{location}}/events--performing-visual-arts/'
    }
  },
  
  food: {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/{{location}}/events--food-and-drink/'
    }
  },
  
  business: {
    eventbrite: {
      ...EVENTBRITE_TARGETS.search_results,
      baseUrl: 'https://www.eventbrite.com/d/{{location}}/events--business/'
    },
    meetup: MEETUP_TARGETS.events_search
  }
}

/**
 * Get target configuration for a specific source and location
 */
export function getTargetConfig(
  source: string,
  location?: string,
  category?: string
): ScrapeTarget | null {
  // Try category-specific first
  if (category && CATEGORY_TARGETS[category] && CATEGORY_TARGETS[category][source]) {
    const target = { ...CATEGORY_TARGETS[category][source] }
    if (location) {
      target.baseUrl = target.baseUrl.replace('{{location}}', location)
    }
    return target
  }
  
  // Try location-specific
  if (location && LOCATION_BASED_TARGETS[location] && LOCATION_BASED_TARGETS[location][source]) {
    return { ...LOCATION_BASED_TARGETS[location][source] }
  }
  
  // Try general targets
  const allTargets = {
    ...EVENTBRITE_TARGETS,
    ...FACEBOOK_TARGETS,
    ...MEETUP_TARGETS,
    ...VENUE_TARGETS,
    ...SPECIALIZED_TARGETS
  }
  
  const target = Object.values(allTargets).find(t => t.source === source)
  if (target) {
    const configCopy = { ...target }
    if (location) {
      configCopy.baseUrl = configCopy.baseUrl.replace('{{location}}', location)
    }
    return configCopy
  }
  
  return null
}

/**
 * Get all available targets for a location
 */
export function getTargetsForLocation(location: string): ScrapeTarget[] {
  const targets: ScrapeTarget[] = []
  
  // Get location-specific targets
  if (LOCATION_BASED_TARGETS[location]) {
    targets.push(...Object.values(LOCATION_BASED_TARGETS[location]))
  }
  
  // Get general targets with location substitution
  const generalTargets = [
    ...Object.values(EVENTBRITE_TARGETS),
    ...Object.values(FACEBOOK_TARGETS),
    ...Object.values(MEETUP_TARGETS)
  ]
  
  for (const target of generalTargets) {
    if (target.baseUrl.includes('{{location}}') || target.baseUrl.includes('{{city}}')) {
      const configCopy = { ...target }
      configCopy.baseUrl = configCopy.baseUrl
        .replace('{{location}}', location)
        .replace('{{city}}', location)
      targets.push(configCopy)
    }
  }
  
  return targets
}

/**
 * Get targets for a specific category
 */
export function getTargetsForCategory(category: string): ScrapeTarget[] {
  if (!CATEGORY_TARGETS[category]) {
    return []
  }
  
  return Object.values(CATEGORY_TARGETS[category])
}

/**
 * Validate target configuration
 */
export function validateTarget(target: ScrapeTarget): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!target.id) errors.push('Target ID is required')
  if (!target.name) errors.push('Target name is required')
  if (!target.baseUrl) errors.push('Base URL is required')
  if (!target.source) errors.push('Source is required')
  
  // Selectors validation
  if (!target.selectors?.events?.container) {
    errors.push('Events container selector is required')
  }
  if (!target.selectors?.events?.eventCard) {
    errors.push('Event card selector is required')
  }
  if (!target.selectors?.events?.title) {
    errors.push('Event title selector is required')
  }
  
  // URL validation
  try {
    new URL(target.baseUrl.replace(/\{\{[^}]+\}\}/g, 'test'))
  } catch (e) {
    errors.push('Invalid base URL format')
  }
  
  // Pagination validation
  if (target.pagination) {
    if (target.pagination.type === 'button' && !target.pagination.selector) {
      errors.push('Button pagination requires selector')
    }
    if (target.pagination.maxPages && target.pagination.maxPages > 20) {
      warnings.push('High max pages count may cause long scraping times')
    }
  }
  
  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Export all target configurations
 */
export const ALL_TARGETS = {
  eventbrite: EVENTBRITE_TARGETS,
  facebook: FACEBOOK_TARGETS,
  meetup: MEETUP_TARGETS,
  venue: VENUE_TARGETS,
  specialized: SPECIALIZED_TARGETS
}