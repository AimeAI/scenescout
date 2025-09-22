import axios from 'axios'
import * as cheerio from 'cheerio'
import { LinktreeScraper } from './scrapers/linktree-scraper'

interface EventSource {
  name: string
  url: string
  selector: string
  titleSelector: string
  dateSelector: string
  venueSelector: string
  priceSelector: string
  linkSelector: string
  imageSelector: string
}

export class MultiSourceScraper {
  private linktreeScraper = new LinktreeScraper()
  
  private readonly EVENT_SOURCES: Record<string, EventSource[]> = {
    music: [
      {
        name: 'ticketmaster',
        url: 'https://www.ticketmaster.ca/browse/concerts-catid-10001/music-rid-10001?city=Toronto',
        selector: '.event-tile, [data-testid="event-card"]',
        titleSelector: '.event-name, h3, .title',
        dateSelector: '.event-date, .date',
        venueSelector: '.venue-name, .location',
        priceSelector: '.price-range, .price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'songkick',
        url: 'https://www.songkick.com/metro-areas/27396-canada-toronto',
        selector: '.event-listings li, .event',
        titleSelector: '.event-name, h3, .title',
        dateSelector: '.date, .event-date',
        venueSelector: '.venue-name, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'bandsintown',
        url: 'https://www.bandsintown.com/c/toronto',
        selector: '.event-card, .event-item',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date, .date',
        venueSelector: '.venue, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    food: [
      {
        name: 'blogto_food',
        url: 'https://www.blogto.com/eat_drink/events/',
        selector: '.event-item, .listing',
        titleSelector: 'h2, h3, .title',
        dateSelector: '.date, .event-date',
        venueSelector: '.venue, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'toronto_food',
        url: 'https://www.toronto.com/events/food-and-drink/',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'toronto_general',
        url: 'https://www.toronto.com/events/',
        selector: '.event-card, .event-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    tech: [
      {
        name: 'meetup_tech',
        url: 'https://www.meetup.com/find/tech/?location=Toronto%2C+ON',
        selector: '.event-card, .eventCard',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date, .date',
        venueSelector: '.venue, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'eventbrite_tech',
        url: 'https://www.eventbrite.ca/d/canada--toronto/technology/',
        selector: 'article, [data-testid="search-event-card"]',
        titleSelector: 'h3, h2',
        dateSelector: '[data-testid="event-date"]',
        venueSelector: '[data-testid="event-location"]',
        priceSelector: '[data-testid="event-price"]',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    sports: [
      {
        name: 'ticketmaster_sports',
        url: 'https://www.ticketmaster.ca/browse/sports-catid-10004?city=Toronto',
        selector: '.event-tile, [data-testid="event-card"]',
        titleSelector: '.event-name, h3',
        dateSelector: '.event-date, .date',
        venueSelector: '.venue-name, .location',
        priceSelector: '.price-range, .price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'stubhub_toronto',
        url: 'https://www.stubhub.com/toronto-sports-tickets/',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'seatgeek_toronto',
        url: 'https://seatgeek.com/cities/toronto/sports',
        selector: '.event-tile, .event-card',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue-name',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    social: [
      {
        name: 'facebook_events',
        url: 'https://www.facebook.com/events/explore/toronto/',
        selector: '[data-testid="event-card"], .event',
        titleSelector: 'h3, .event-title',
        dateSelector: '.date, .event-date',
        venueSelector: '.location, .venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'meetup_social',
        url: 'https://www.meetup.com/find/socializing/?location=Toronto%2C+ON',
        selector: '.event-card, .eventCard',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date, .date',
        venueSelector: '.venue, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'toronto_com',
        url: 'https://www.toronto.com/events/',
        selector: '.event-card, .event-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    arts: [
      {
        name: 'rom_events',
        url: 'https://www.rom.on.ca/en/whats-on',
        selector: '.event-card, .event-item',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'ago_events',
        url: 'https://ago.ca/events',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'ticketmaster_arts',
        url: 'https://www.ticketmaster.ca/browse/arts-theatre-catid-10002?city=Toronto',
        selector: '.event-tile, [data-testid="event-card"]',
        titleSelector: '.event-name, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue-name',
        priceSelector: '.price-range',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ]
  }

  async scrapeAllSources(query: string, categories: string[] = ['music', 'food', 'tech', 'sports', 'social', 'arts']) {
    console.log(`🔍 Multi-source scraping for: "${query}" across ${categories.length} categories`)
    
    const allEvents = []
    
    for (const category of categories) {
      const sources = this.EVENT_SOURCES[category] || []
      
      for (const source of sources) {
        try {
          const events = await this.scrapeSource(source, query, category)
          allEvents.push(...events)
          console.log(`✅ ${source.name}: Found ${events.length} events`)
        } catch (error) {
          console.error(`❌ ${source.name} failed:`, error.message)
        }
      }
    }

    // Also scrape Eventbrite as fallback
    const eventbriteEvents = await this.scrapeEventbrite(query)
    allEvents.push(...eventbriteEvents)

    // Temporarily disable Linktree scraper - needs improvement
    // try {
    //   const linktreeEvents = await this.linktreeScraper.scrapeEvents(query)
    //   allEvents.push(...linktreeEvents)
    //   console.log(`✅ Linktree: Found ${linktreeEvents.length} events`)
    // } catch (error) {
    //   console.error(`❌ Linktree failed:`, error.message)
    // }

    const uniqueEvents = this.removeDuplicates(allEvents)
    console.log(`✅ Total unique events found: ${uniqueEvents.length}`)
    
    return uniqueEvents
  }

  private async scrapeSource(source: EventSource, query: string, category: string) {
    const events = []
    
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      })

      const $ = cheerio.load(response.data)
      
      $(source.selector).each((i, elem) => {
        const $elem = $(elem)
        
        const title = $elem.find(source.titleSelector).first().text().trim()
        if (!title || title.length < 5) return
        
        // Check relevance to query
        if (!this.isRelevant(title, query)) return
        
        const description = $elem.find('.description, .summary, p').first().text().trim()
        const venue = $elem.find(source.venueSelector).first().text().trim()
        const dateText = $elem.find(source.dateSelector).first().text().trim()
        const priceText = $elem.find(source.priceSelector).first().text().trim()
        const link = $elem.find(source.linkSelector).first().attr('href')
        const image = $elem.find(source.imageSelector).first().attr('src')
        
        const { date, time } = this.parseDateTime(dateText, title)
        
        events.push({
          title: title.substring(0, 255),
          description: description || `${title} - ${category} event in Toronto`,
          date,
          time,
          venue_name: venue || 'Toronto Venue',
          address: `${venue}, Toronto, ON`,
          price_min: this.parsePrice(priceText),
          external_url: this.normalizeUrl(link, source.name),
          category,
          image_url: this.normalizeUrl(image, source.name),
          source: source.name,
          latitude: 43.6532 + (Math.random() - 0.5) * 0.1,
          longitude: -79.3832 + (Math.random() - 0.5) * 0.1,
          external_id: `${source.name}-${Date.now()}-${i}`
        })
      })
    } catch (error) {
      console.error(`Failed to scrape ${source.name}:`, error.message)
    }
    
    return events
  }

  private async scrapeEventbrite(query: string) {
    const events = []
    
    try {
      const searchUrl = `https://www.eventbrite.ca/d/canada--toronto/${encodeURIComponent(query)}/`
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      })

      const $ = cheerio.load(response.data)
      
      $('article, [data-testid="search-event-card"]').each((i, elem) => {
        const $elem = $(elem)
        
        const title = $elem.find('h3, h2').first().text().trim()
        if (!title || !this.isRelevant(title, query)) return
        
        const description = $elem.find('.event-description, p').first().text().trim()
        const venue = $elem.find('[data-testid="event-location"]').first().text().trim()
        const dateText = $elem.find('[data-testid="event-date"]').first().text().trim()
        const priceText = $elem.find('[data-testid="event-price"]').first().text().trim()
        const link = $elem.find('a').first().attr('href')
        const image = $elem.find('img').first().attr('src')
        
        const { date, time } = this.parseDateTime(dateText, title)
        
        events.push({
          title: title.substring(0, 255),
          description: description || `${title} - Event in Toronto`,
          date,
          time,
          venue_name: venue || 'Toronto Venue',
          address: `${venue}, Toronto, ON`,
          price_min: this.parsePrice(priceText),
          external_url: link?.startsWith('http') ? link : `https://www.eventbrite.ca${link}`,
          category: this.categorizeEvent(title + ' ' + description),
          image_url: image,
          source: 'eventbrite',
          latitude: 43.6532 + (Math.random() - 0.5) * 0.1,
          longitude: -79.3832 + (Math.random() - 0.5) * 0.1,
          external_id: `eventbrite-${Date.now()}-${i}`
        })
      })
    } catch (error) {
      console.error('Eventbrite scraping failed:', error.message)
    }
    
    return events
  }

  private isRelevant(title: string, query: string): boolean {
    const titleLower = title.toLowerCase()
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(' ').filter(word => word.length > 2)
    const matches = keywords.filter(keyword => titleLower.includes(keyword))
    return matches.length >= Math.max(1, Math.floor(keywords.length * 0.4))
  }

  private parseDateTime(dateText: string, title: string): { date: string; time: string } {
    // Extract from title first
    const titleMatch = title.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
    if (titleMatch) {
      try {
        const [, month, day, year] = titleMatch
        const date = new Date(`${month} ${day}, ${year}`)
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split('T')[0],
            time: this.extractTime(title) || '19:00:00'
          }
        }
      } catch (e) {}
    }

    // Parse dateText
    if (dateText) {
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
      let time = '19:00:00'
      
      if (timeMatch) {
        const [, hour, minute, ampm] = timeMatch
        let hour24 = parseInt(hour)
        if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
        if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0
        time = `${hour24.toString().padStart(2, '0')}:${minute}:00`
      }

      try {
        const date = new Date(dateText.replace(/at.*$/i, '').trim())
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split('T')[0],
            time
          }
        }
      } catch (e) {}
    }

    // Default to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return {
      date: tomorrow.toISOString().split('T')[0],
      time: '19:00:00'
    }
  }

  private extractTime(text: string): string | null {
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (timeMatch) {
      const [, hour, minute, ampm] = timeMatch
      let hour24 = parseInt(hour)
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
      if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0
      return `${hour24.toString().padStart(2, '0')}:${minute}:00`
    }
    return null
  }

  private parsePrice(priceText: string): number {
    if (!priceText || /free/i.test(priceText)) return 0
    const match = priceText.match(/\$?(\d+(?:\.\d{2})?)/g)
    if (match) {
      const prices = match.map(m => parseFloat(m.replace('$', '')))
      return Math.min(...prices)
    }
    return 0
  }

  private normalizeUrl(url: string, source: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    
    const baseUrls = {
      ticketmaster: 'https://www.ticketmaster.ca',
      ticketmaster_sports: 'https://www.ticketmaster.ca',
      ticketmaster_arts: 'https://www.ticketmaster.ca',
      songkick: 'https://www.songkick.com',
      bandsintown: 'https://www.bandsintown.com',
      blogto_food: 'https://www.blogto.com',
      toronto_food: 'https://www.toronto.com',
      meetup_tech: 'https://www.meetup.com',
      meetup_social: 'https://www.meetup.com',
      eventbrite_tech: 'https://www.eventbrite.ca',
      stubhub_toronto: 'https://www.stubhub.com',
      seatgeek_toronto: 'https://seatgeek.com',
      facebook_events: 'https://www.facebook.com',
      toronto_com: 'https://www.toronto.com',
      rom_events: 'https://www.rom.on.ca',
      ago_events: 'https://ago.ca',
      eventbrite: 'https://www.eventbrite.ca'
    }
    
    return `${baseUrls[source] || ''}${url}`
  }

  private categorizeEvent(text: string): string {
    const categories = {
      music: ['concert', 'music', 'band', 'dj', 'festival', 'live', 'performance', 'show', 'tour'],
      sports: ['game', 'match', 'tournament', 'basketball', 'football', 'baseball', 'soccer', 'hockey'],
      food: ['food', 'wine', 'tasting', 'dinner', 'brunch', 'restaurant', 'culinary', 'chef'],
      tech: ['tech', 'startup', 'code', 'developer', 'ai', 'data', 'hackathon', 'programming'],
      arts: ['art', 'gallery', 'museum', 'theater', 'theatre', 'exhibition', 'culture'],
      social: ['meetup', 'networking', 'social', 'community', 'party', 'halloween', 'haunted']
    }

    text = text.toLowerCase()
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category
      }
    }
    return 'social'
  }

  private removeDuplicates(events: any[]): any[] {
    const seen = new Set<string>()
    return events.filter(event => {
      const key = event.title.toLowerCase().replace(/[^\w]/g, '') + event.date
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
