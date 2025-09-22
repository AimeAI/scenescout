import axios from 'axios'
import * as cheerio from 'cheerio'

interface ScrapedEvent {
  title: string
  description: string
  date: string
  time: string
  venue_name: string
  address: string
  price_min: number
  external_url: string
  category: string
  image_url?: string
  latitude?: number
  longitude?: number
}

export class LiveEventScraper {
  private readonly TORONTO_VENUES = {
    'scotiabank arena': { lat: 43.6434, lng: -79.3791, address: '40 Bay St, Toronto, ON' },
    'roy thomson hall': { lat: 43.6465, lng: -79.3871, address: '60 Simcoe St, Toronto, ON' },
    'phoenix concert theatre': { lat: 43.6677, lng: -79.3534, address: '410 Sherbourne St, Toronto, ON' },
    'danforth music hall': { lat: 43.6777, lng: -79.3534, address: '147 Danforth Ave, Toronto, ON' },
    'rebel nightclub': { lat: 43.6387, lng: -79.3816, address: '11 Polson St, Toronto, ON' },
    'budweiser stage': { lat: 43.6287, lng: -79.4187, address: '909 Lake Shore Blvd W, Toronto, ON' },
    'massey hall': { lat: 43.6544, lng: -79.3807, address: '178 Victoria St, Toronto, ON' },
    'cn tower': { lat: 43.6426, lng: -79.3871, address: '290 Bremner Blvd, Toronto, ON' },
    'casa loma': { lat: 43.6780, lng: -79.4094, address: '1 Austin Terrace, Toronto, ON' },
    'distillery district': { lat: 43.6503, lng: -79.3599, address: '55 Mill St, Toronto, ON' }
  }

  async scrapeEventbrite(query: string, limit: number = 50): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []
    
    try {
      // Search multiple pages for more results
      const pages = Math.ceil(limit / 20)
      
      for (let page = 1; page <= pages; page++) {
        const searchUrl = `https://www.eventbrite.ca/d/canada--toronto/${encodeURIComponent(query)}/?page=${page}`
        
        try {
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 15000
          })

          const $ = cheerio.load(response.data)
          
          $('article, [data-testid="search-event-card"], .search-event-card, .event-card').each((i, elem) => {
            const $elem = $(elem)
            
            // Extract title
            const title = $elem.find('h3, h2, [data-testid="event-title"], .event-title').first().text().trim()
            if (!title || title.length < 5) return
            
            // Skip if not relevant to query
            if (!this.isRelevantToQuery(title, query)) return
            
            // Extract description
            const description = $elem.find('.event-description, .summary, p').first().text().trim()
            
            // Extract venue with better parsing
            const venueText = $elem.find('[data-testid="event-location"], .location-info, .venue-name').first().text().trim()
            const venue = this.extractVenueName(venueText)
            
            // Extract date and time with improved parsing
            const dateElement = $elem.find('[data-testid="event-date"], .date-info, .event-date, time').first()
            const dateText = dateElement.text().trim() || dateElement.attr('datetime') || ''
            const { date, time } = this.parseDateTime(dateText, title)
            
            // Extract price with comprehensive search
            let priceText = ''
            
            // Look for price in multiple places
            const priceSelectors = [
              '[data-testid="event-price"]',
              '.price', '.ticket-price', '.cost', '.fee',
              '[class*="price"]', '[class*="cost"]', '[class*="ticket"]',
              '.event-price', '.pricing', '.admission'
            ]
            
            for (const selector of priceSelectors) {
              const element = $elem.find(selector).first()
              if (element.length && element.text().trim()) {
                priceText = element.text().trim()
                break
              }
            }
            
            // Also check in the description for price info
            if (!priceText && description) {
              const descPriceMatch = description.match(/\$\d+|\bfree\b|admission|ticket|cost/i)
              if (descPriceMatch) {
                priceText = descPriceMatch[0]
              }
            }
            
            const { price, priceMax, priceRange } = this.parsePrice(priceText)
            
            console.log(`💰 "${title.substring(0, 40)}": "${priceText}" -> ${priceRange}`)
            
            // Extract image
            const imageElement = $elem.find('img').first()
            const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || ''
            
            // Extract link
            const linkElement = $elem.find('a').first()
            const link = linkElement.attr('href') || ''
            
            // Get venue coordinates
            const venueInfo = this.getVenueInfo(venue)
            
            events.push({
              title: title.substring(0, 255),
              description: description || `${title} - Event in Toronto`,
              date,
              time,
              venue_name: venue,
              address: venueInfo.address,
              price_min: price,
              price_max: priceMax,
              price_range: priceRange,
              external_url: link?.startsWith('http') ? link : `https://www.eventbrite.ca${link}`,
              category: this.categorizeEvent(title + ' ' + description),
              image_url: imageUrl?.startsWith('http') ? imageUrl : '',
              latitude: venueInfo.lat,
              longitude: venueInfo.lng
            })
          })
        } catch (pageError) {
          console.error(`Failed to scrape page ${page}:`, pageError.message)
        }
      }
    } catch (error) {
      console.error('Eventbrite scraping failed:', error.message)
    }

    return events
  }

  private isRelevantToQuery(title: string, query: string): boolean {
    const titleLower = title.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Split query into keywords
    const keywords = queryLower.split(' ').filter(word => word.length > 2)
    
    // Check if at least 50% of keywords match
    const matches = keywords.filter(keyword => titleLower.includes(keyword))
    return matches.length >= Math.max(1, Math.floor(keywords.length * 0.5))
  }

  private parseDateTime(dateText: string, title: string): { date: string; time: string } {
    // Extract date from title if available
    const titleDateMatch = title.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
    if (titleDateMatch) {
      try {
        const [, month, day, year] = titleDateMatch
        const date = new Date(`${month} ${day}, ${year}`)
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split('T')[0],
            time: this.extractTimeFromText(title) || '19:00:00'
          }
        }
      } catch (e) {
        // Continue with dateText parsing
      }
    }

    if (!dateText) {
      return {
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '19:00:00'
      }
    }

    // Handle various date formats
    const cleanText = dateText.toLowerCase().replace(/[^\w\s:,-]/g, ' ').trim()
    
    // Look for specific patterns
    const patterns = [
      /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\w+)\s+(\d{1,2})\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s+(\w{3})\s+(\d{4})/i,
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ]

    for (const pattern of patterns) {
      const match = cleanText.match(pattern)
      if (match) {
        try {
          let date: Date
          let time = '19:00:00'
          
          if (pattern.source.includes('am|pm')) {
            const [, month, day, year, hour, minute, ampm] = match
            let hour24 = parseInt(hour)
            if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
            if (ampm?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0
            
            time = `${hour24.toString().padStart(2, '0')}:${minute}:00`
            
            if (year) {
              date = new Date(`${month} ${day}, ${year}`)
            } else {
              date = new Date(`${month} ${day}, ${new Date().getFullYear()}`)
            }
          } else {
            date = new Date(match[0])
          }
          
          if (!isNaN(date.getTime())) {
            return {
              date: date.toISOString().split('T')[0],
              time
            }
          }
        } catch (e) {
          continue
        }
      }
    }

    // Default fallback
    return {
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '19:00:00'
    }
  }

  private extractTimeFromText(text: string): string | null {
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

  private extractVenueName(venueText: string): string {
    if (!venueText) return 'Toronto Venue'
    
    const cleaned = venueText
      .replace(/\s+/g, ' ')
      .replace(/[•·]/g, '')
      .trim()
    
    const parts = cleaned.split(',')
    const venueName = parts[0].trim()
    
    return venueName || 'Toronto Venue'
  }

  private parsePrice(priceText: string): { price: number, priceMax: number, priceRange: string } {
    if (!priceText) return { price: 0, priceMax: 0, priceRange: 'Free' }
    
    // Explicit free indicators
    if (/free|no charge|complimentary|gratis/i.test(priceText)) {
      return { price: 0, priceMax: 0, priceRange: 'Free' }
    }
    
    // Look for price ranges like "$25-$50" or "$25 to $50"
    const rangeMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)\s*[-–to]\s*\$?(\d+(?:\.\d{2})?)/i)
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1])
      const max = parseFloat(rangeMatch[2])
      return { 
        price: min, 
        priceMax: max, 
        priceRange: `$${min}-$${max}` 
      }
    }
    
    // Look for single prices
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/g,           // $25.00 or $25
      /(\d+(?:\.\d{2})?)\s*dollars?/gi, // 25 dollars
      /CAD\s*(\d+(?:\.\d{2})?)/gi,      // CAD 25
      /(\d+(?:\.\d{2})?)\s*CAD/gi       // 25 CAD
    ]
    
    for (const pattern of pricePatterns) {
      const matches = priceText.match(pattern)
      if (matches) {
        const prices = matches.map(match => {
          const numMatch = match.match(/(\d+(?:\.\d{2})?)/)
          return numMatch ? parseFloat(numMatch[1]) : 0
        }).filter(price => price > 0)
        
        if (prices.length > 0) {
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          
          if (minPrice === maxPrice) {
            return { 
              price: minPrice, 
              priceMax: minPrice, 
              priceRange: `$${minPrice}` 
            }
          } else {
            return { 
              price: minPrice, 
              priceMax: maxPrice, 
              priceRange: `$${minPrice}-$${maxPrice}` 
            }
          }
        }
      }
    }
    
    // If we have text but no clear price, check for "TBD" or similar
    if (/tbd|tba|contact|call|varies/i.test(priceText)) {
      return { price: 0, priceMax: 0, priceRange: 'TBD' }
    }
    
    // Default to free if unclear
    return { price: 0, priceMax: 0, priceRange: 'Free' }
  }

  private getVenueInfo(venueName: string): { lat: number; lng: number; address: string } {
    const venueKey = venueName.toLowerCase()
    
    for (const [key, info] of Object.entries(this.TORONTO_VENUES)) {
      if (venueKey.includes(key) || key.includes(venueKey)) {
        return info
      }
    }
    
    const baseCoords = { lat: 43.6532, lng: -79.3832 }
    const hash = this.simpleHash(venueName)
    
    return {
      lat: baseCoords.lat + ((hash % 100) - 50) * 0.001,
      lng: baseCoords.lng + ((hash % 100) - 50) * 0.001,
      address: `${venueName}, Toronto, ON`
    }
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private categorizeEvent(text: string): string {
    const categories = {
      sports: ['hockey', 'basketball', 'soccer', 'football', 'baseball', 'game', 'match', 'tournament', 'raptors', 'leafs'],
      music: ['concert', 'music', 'band', 'dj', 'festival', 'live', 'performance', 'show', 'singer', 'album'],
      food: ['food', 'restaurant', 'dining', 'wine', 'beer', 'culinary', 'tasting', 'cooking', 'chef', 'brunch'],
      tech: ['tech', 'startup', 'developer', 'coding', 'ai', 'data', 'software', 'hackathon', 'programming'],
      arts: ['art', 'gallery', 'museum', 'theater', 'theatre', 'exhibition', 'culture', 'painting', 'sculpture'],
      social: ['meetup', 'networking', 'social', 'community', 'party', 'halloween', 'haunted', 'celebration']
    }

    text = text.toLowerCase()
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category
      }
    }
    return 'social'
  }

  async scrapeAll(query: string, limit: number = 50): Promise<ScrapedEvent[]> {
    console.log(`🔍 Live scraping for: "${query}" (limit: ${limit})`)
    
    const eventbriteEvents = await this.scrapeEventbrite(query, limit)
    const uniqueEvents = this.removeDuplicates(eventbriteEvents)
    
    console.log(`✅ Found ${uniqueEvents.length} unique relevant events`)
    return uniqueEvents
  }

  private removeDuplicates(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>()
    return events.filter(event => {
      const key = event.title.toLowerCase().replace(/[^\w]/g, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
