import { VenueConfiguration, ChainConfiguration } from '../types/venue';

export const VENUE_CONFIGURATIONS: VenueConfiguration[] = [
  // Concert Halls
  {
    id: 'fillmore',
    name: 'The Fillmore',
    type: 'concert_hall',
    baseUrl: 'https://www.fillmore.com',
    enabled: true,
    priority: 1,
    locations: [
      {
        id: 'fillmore-sf',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        url: 'https://www.fillmore.com/sf'
      },
      {
        id: 'fillmore-detroit',
        city: 'Detroit',
        state: 'MI',
        country: 'US',
        url: 'https://www.fillmore.com/detroit'
      },
      {
        id: 'fillmore-miami',
        city: 'Miami Beach',
        state: 'FL',
        country: 'US',
        url: 'https://www.fillmore.com/miami'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.events-list, .show-list',
        eventItem: '.event-item, .show-item, .performance'
      },
      eventSelectors: {
        title: ['.event-title', '.show-title', 'h2', 'h3'],
        date: ['.event-date', '.show-date', '[data-date]'],
        time: ['.event-time', '.show-time', '[data-time]'],
        description: ['.event-description', '.show-description'],
        price: ['.price', '.ticket-price', '.cost'],
        ticketUrl: ['a[href*="ticket"]', '.ticket-link', '.buy-button'],
        image: ['.event-image img', '.show-image img'],
        performers: ['.artist', '.performer', '.headliner']
      },
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      },
      javascript: true
    },
    fallbacks: [
      {
        id: 'alternative-selectors',
        description: 'Use alternative selectors if primary ones fail',
        triggers: [
          {
            type: 'selector_missing',
            condition: '.events-list'
          }
        ],
        action: {
          type: 'alternative_selectors',
          config: {
            container: ['.calendar', '.upcoming-shows', '.events']
          }
        }
      }
    ]
  },

  // Madison Square Garden
  {
    id: 'msg',
    name: 'Madison Square Garden',
    type: 'sports_arena',
    baseUrl: 'https://www.msg.com',
    enabled: true,
    priority: 1,
    locations: [
      {
        id: 'msg-nyc',
        city: 'New York',
        state: 'NY',
        country: 'US',
        url: 'https://www.msg.com/calendar'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.calendar-container, .events-grid',
        eventItem: '.event-card, .calendar-event'
      },
      eventSelectors: {
        title: ['.event-title', 'h3', '.title'],
        date: ['.event-date', '[data-date]', '.date'],
        time: ['.event-time', '[data-time]', '.time'],
        description: ['.event-description', '.description'],
        price: ['.price-range', '.starting-at', '.price'],
        ticketUrl: ['.tickets-link', 'a[href*="ticket"]'],
        image: ['.event-image img', 'img'],
        category: ['.event-type', '.category']
      },
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        respectRobotsTxt: true
      },
      javascript: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SceneScout/1.0)'
      }
    },
    fallbacks: [
      {
        id: 'wait-and-retry',
        description: 'Wait and retry if rate limited',
        triggers: [
          {
            type: 'rate_limited',
            condition: '429'
          }
        ],
        action: {
          type: 'wait_and_retry',
          config: {
            delay: 60000,
            maxRetries: 3
          }
        }
      }
    ]
  },

  // Kennedy Center
  {
    id: 'kennedy-center',
    name: 'Kennedy Center',
    type: 'performing_arts_center',
    baseUrl: 'https://www.kennedy-center.org',
    enabled: true,
    priority: 1,
    locations: [
      {
        id: 'kennedy-center-dc',
        city: 'Washington',
        state: 'DC',
        country: 'US',
        url: 'https://www.kennedy-center.org/whats-on'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.performance-list, .events-container',
        eventItem: '.performance-item, .event-listing'
      },
      eventSelectors: {
        title: ['.performance-title', '.event-title', 'h2'],
        date: ['.performance-date', '.event-date'],
        time: ['.performance-time', '.event-time'],
        description: ['.performance-description', '.description'],
        price: ['.ticket-prices', '.pricing'],
        ticketUrl: ['.buy-tickets', 'a[href*="ticket"]'],
        image: ['.performance-image img'],
        performers: ['.artists', '.performers'],
        category: ['.genre', '.performance-type']
      },
      rateLimit: {
        requestsPerMinute: 25,
        delayBetweenRequests: 2500,
        respectRobotsTxt: true
      },
      javascript: false
    },
    fallbacks: []
  },

  // House of Blues
  {
    id: 'house-of-blues',
    name: 'House of Blues',
    type: 'club',
    baseUrl: 'https://www.houseofblues.com',
    enabled: true,
    priority: 2,
    locations: [
      {
        id: 'hob-boston',
        city: 'Boston',
        state: 'MA',
        country: 'US',
        url: 'https://www.houseofblues.com/boston'
      },
      {
        id: 'hob-chicago',
        city: 'Chicago',
        state: 'IL',
        country: 'US',
        url: 'https://www.houseofblues.com/chicago'
      },
      {
        id: 'hob-las-vegas',
        city: 'Las Vegas',
        state: 'NV',
        country: 'US',
        url: 'https://www.houseofblues.com/lasvegas'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.show-list, .events',
        eventItem: '.show-item, .event'
      },
      eventSelectors: {
        title: ['.show-title', '.event-name'],
        date: ['.show-date', '.date'],
        time: ['.show-time', '.doors'],
        description: ['.show-description'],
        price: ['.ticket-price', '.price'],
        ticketUrl: ['.ticket-link'],
        image: ['.show-image img'],
        performers: ['.artist-name', '.headliner']
      },
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        respectRobotsTxt: true
      },
      javascript: true
    },
    fallbacks: []
  },

  // University venues - UC Berkeley
  {
    id: 'uc-berkeley',
    name: 'UC Berkeley Events',
    type: 'university',
    baseUrl: 'https://events.berkeley.edu',
    enabled: true,
    priority: 3,
    locations: [
      {
        id: 'ucb-main',
        city: 'Berkeley',
        state: 'CA',
        country: 'US',
        url: 'https://events.berkeley.edu/index.php/calendar'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.event-list, .calendar-events',
        eventItem: '.event-item, .calendar-event'
      },
      eventSelectors: {
        title: ['.event-title', 'h3', '.title'],
        date: ['.event-date', '.date'],
        time: ['.event-time', '.time'],
        description: ['.event-description', '.summary'],
        price: ['.admission', '.cost'],
        ticketUrl: ['.registration-link', 'a[href*="ticket"]'],
        image: ['.event-image img'],
        category: ['.event-category', '.type']
      },
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      },
      javascript: false
    },
    fallbacks: []
  },

  // Brooklyn Bowl
  {
    id: 'brooklyn-bowl',
    name: 'Brooklyn Bowl',
    type: 'club',
    baseUrl: 'https://www.brooklynbowl.com',
    enabled: true,
    priority: 2,
    locations: [
      {
        id: 'bb-brooklyn',
        city: 'Brooklyn',
        state: 'NY',
        country: 'US',
        url: 'https://www.brooklynbowl.com/events'
      },
      {
        id: 'bb-las-vegas',
        city: 'Las Vegas',
        state: 'NV',
        country: 'US',
        url: 'https://www.brooklynbowl.com/las-vegas/events'
      },
      {
        id: 'bb-nashville',
        city: 'Nashville',
        state: 'TN',
        country: 'US',
        url: 'https://www.brooklynbowl.com/nashville/events'
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.events-listing, .shows',
        eventItem: '.event, .show'
      },
      eventSelectors: {
        title: ['.event-title', '.show-title'],
        date: ['.event-date', '.show-date'],
        time: ['.event-time', '.doors-time'],
        description: ['.event-description'],
        price: ['.ticket-price'],
        ticketUrl: ['.buy-tickets'],
        image: ['.event-poster img'],
        performers: ['.artist', '.band']
      },
      rateLimit: {
        requestsPerMinute: 25,
        delayBetweenRequests: 2400,
        respectRobotsTxt: true
      },
      javascript: true
    },
    fallbacks: []
  }
];

export const CHAIN_CONFIGURATIONS: ChainConfiguration[] = [
  {
    id: 'live-nation',
    name: 'Live Nation Venues',
    venueIds: ['fillmore', 'house-of-blues'],
    sharedConfig: {
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        respectRobotsTxt: true
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SceneScout/1.0)'
      }
    },
    urlPattern: 'https://{venue}.livenation.com/{location}',
    locationDiscovery: {
      enabled: true,
      seedUrls: ['https://www.livenation.com/venues'],
      locationSelector: '.venue-list .venue-item',
      urlExtractor: 'a[href]',
      filters: ['concert', 'theater', 'amphitheater']
    }
  },

  {
    id: 'bowlmor-entertainment',
    name: 'Bowlmor Entertainment',
    venueIds: ['brooklyn-bowl'],
    sharedConfig: {
      rateLimit: {
        requestsPerMinute: 25,
        delayBetweenRequests: 2500,
        respectRobotsTxt: true
      }
    }
  }
];

export function getVenueConfig(venueId: string): VenueConfiguration | null {
  return VENUE_CONFIGURATIONS.find(config => config.id === venueId) || null;
}

export function getChainConfig(chainId: string): ChainConfiguration | null {
  return CHAIN_CONFIGURATIONS.find(config => config.id === chainId) || null;
}

export function getVenuesByType(type: string): VenueConfiguration[] {
  return VENUE_CONFIGURATIONS.filter(config => config.type === type && config.enabled);
}

export function getVenuesByCity(city: string, state?: string): VenueConfiguration[] {
  return VENUE_CONFIGURATIONS.filter(config => 
    config.enabled && 
    config.locations.some(location => 
      location.city.toLowerCase() === city.toLowerCase() &&
      (!state || location.state.toLowerCase() === state.toLowerCase())
    )
  );
}

export function getAllEnabledVenues(): VenueConfiguration[] {
  return VENUE_CONFIGURATIONS.filter(config => config.enabled)
    .sort((a, b) => a.priority - b.priority);
}