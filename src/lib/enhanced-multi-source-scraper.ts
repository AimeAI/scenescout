import axios from 'axios'
import * as cheerio from 'cheerio'

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
  requiresAuth?: boolean
  rateLimit?: number
}

export class EnhancedMultiSourceScraper {
  private readonly EVENT_SOURCES: Record<string, EventSource[]> = {
    music: [
      {
        name: 'toronto_music',
        url: 'https://www.toronto.com/events/music/',
        selector: '.event-card, .event-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'blogto_music',
        url: 'https://www.blogto.com/music/',
        selector: '.event-item, .listing',
        titleSelector: 'h2, h3, .title',
        dateSelector: '.date, .event-date',
        venueSelector: '.venue, .location',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'nowtoronto_music',
        url: 'https://nowtoronto.com/music/concerts',
        selector: '.event-card, .concert-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
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
        name: 'torontofoodievents',
        url: 'https://www.torontofoodievents.ca/events',
        selector: '.event-card, .event-item',
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
        name: 'toronto_tech',
        url: 'https://www.toronto.com/events/business-and-tech/',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'techto_events',
        url: 'https://www.techto.org/events',
        selector: '.event-card, .event-item',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    sports: [
      {
        name: 'toronto_sports',
        url: 'https://www.toronto.com/events/sports/',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'blogto_sports',
        url: 'https://www.blogto.com/sports/',
        selector: '.event-item, .listing',
        titleSelector: 'h2, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    social: [
      {
        name: 'toronto_social',
        url: 'https://www.toronto.com/events/',
        selector: '.event-card, .event-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'blogto_events',
        url: 'https://www.blogto.com/events/',
        selector: '.event-item, .listing',
        titleSelector: 'h2, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'nowtoronto_events',
        url: 'https://nowtoronto.com/events',
        selector: '.event-card, .event-listing',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ],
    arts: [
      {
        name: 'toronto_arts',
        url: 'https://www.toronto.com/events/arts-and-culture/',
        selector: '.event-card, .event',
        titleSelector: '.event-title, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'blogto_arts',
        url: 'https://www.blogto.com/arts/',
        selector: '.event-item, .listing',
        titleSelector: 'h2, h3',
        dateSelector: '.date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      },
      {
        name: 'torontoart_events',
        url: 'https://www.torontoartbook.com/events',
        selector: '.event-card, .event-item',
        titleSelector: '.event-title, h3',
        dateSelector: '.event-date',
        venueSelector: '.venue',
        priceSelector: '.price',
        linkSelector: 'a',
        imageSelector: 'img'
      }
    ]
  }

  async scrapeAllSources(query: string, categories: string[] = ['music', 'food', 'tech', 'sports', 'social', 'arts']) {
    console.log(`🔍 Enhanced multi-source scraping for: "${query}" across ${categories.length} categories`)
    
    const allEvents = []
    
    for (const category of categories) {
      const sources = this.EVENT_SOURCES[category] || []
      
      for (const source of sources) {
        try {
          const events = await this.scrapeSource(source, query, category)
          allEvents.push(...events)
          console.log(`✅ ${source.name}: Found ${events.length} events`)
          
          // Rate limiting
          await this.delay(source.rateLimit || 1000)
        } catch (error) {
          console.error(`❌ ${source.name} failed:`, error.message)
        }
      }
    }

    // Always include Eventbrite as primary source
    const eventbriteEvents = await this.scrapeEventbrite(query)
    allEvents.push(...eventbriteEvents)

    const uniqueEvents = this.removeDuplicates(allEvents)
    console.log(`✅ Total unique events found: ${uniqueEvents.length}`)
    
    return uniqueEvents
  }

  private async scrapeSource(source: EventSource, query: string, category: string) {
    const events = []
    
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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
      toronto_music: 'https://www.toronto.com',
      toronto_food: 'https://www.toronto.com',
      toronto_tech: 'https://www.toronto.com',
      toronto_sports: 'https://www.toronto.com',
      toronto_social: 'https://www.toronto.com',
      toronto_arts: 'https://www.toronto.com',
      blogto_music: 'https://www.blogto.com',
      blogto_food: 'https://www.blogto.com',
      blogto_sports: 'https://www.blogto.com',
      blogto_events: 'https://www.blogto.com',
      blogto_arts: 'https://www.blogto.com',
      nowtoronto_music: 'https://nowtoronto.com',
      nowtoronto_events: 'https://nowtoronto.com',
      techto_events: 'https://www.techto.org',
      torontofoodievents: 'https://www.torontofoodievents.ca',
      torontoart_events: 'https://www.torontoartbook.com',
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
