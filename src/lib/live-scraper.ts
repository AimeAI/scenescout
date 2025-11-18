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

  /**
   * Fetch accurate date from EventBrite event page meta tags
   * Used when search results only show partial dates like "Oct 25"
   */
  private async fetchEventPageDate(eventUrl: string): Promise<{ date: string, time: string } | null> {
    try {
      const response = await axios.get(eventUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 5000 // 5 second timeout for faster responses
      })

      const $ = cheerio.load(response.data)

      // Extract from meta tag: <meta property="event:start_time" content="2026-08-25T09:00:00-04:00">
      const startTimeMeta = $('meta[property="event:start_time"]').attr('content')
      if (startTimeMeta) {
        const eventDate = new Date(startTimeMeta)
        if (!isNaN(eventDate.getTime())) {
          const date = eventDate.toISOString().split('T')[0]
          const time = eventDate.toISOString().split('T')[1].substring(0, 8)
          return { date, time }
        }
      }

      return null
    } catch (error) {
      console.warn(`Failed to fetch event page: ${error.message}`)
      return null
    }
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
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: function (status) {
              return status < 500 // Accept any status code less than 500
            }
          })

          const $ = cheerio.load(response.data)

          // First pass: collect all event data from search results
          const tempEvents: Array<{
            title: string,
            description: string,
            dateText: string,
            date: string,
            time: string,
            venue: string,
            price: number,
            priceMax: number,
            priceRange: string,
            imageUrl: string,
            fullUrl: string
          }> = []

          $('article, [data-testid="search-event-card"], .search-event-card, .event-card').each((i, elem) => {
            const $elem = $(elem)

            // Extract title
            const title = $elem.find('h3, h2, [data-testid="event-title"], .event-title').first().text().trim()
            if (!title || title.length < 5) return

            // Skip if not relevant to query
            if (!this.isRelevantToQuery(title, query)) return

            // Extract description first (may contain date information)
            let rawDescription = $elem.find('.event-description, .summary, p').first().text().trim()

            // Extract date and time with improved parsing
            // EventBrite often puts date in description field
            let dateText = ''

            // Try specific selectors first
            const dateElement = $elem.find('[data-testid="event-date"], .date-info, .event-date, time').first()
            if (dateElement.length) {
              dateText = dateElement.text().trim() || dateElement.attr('datetime') || ''
            }

            // If not found, look in description for date patterns
            if (!dateText && rawDescription) {
              // Check if description contains date-like patterns
              const datePattern = /(?:(?:mon|tue|wed|thu|fri|sat|sun|today|tomorrow)[a-z]*(?:day)?),?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{1,2}:\d{2}\s*(?:am|pm)/i
              const match = rawDescription.match(datePattern)
              if (match) {
                dateText = match[0]
                // Remove the date from description since we extracted it
                rawDescription = rawDescription.replace(match[0], '').trim()
              }
            }

            // If still not found, look for any span containing date-like text
            if (!dateText) {
              $elem.find('span').each((_, span) => {
                const text = $(span).text().trim()
                // Match patterns like "Sat, Oct 25, 10:00 PM" or "Saturday at 8:00 PM" or "Tomorrow at 5:30 PM"
                if (text.match(/(?:mon|tue|wed|thu|fri|sat|sun|tomorrow|today)/i) &&
                    text.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i)) {
                  dateText = text
                  return false // Break the loop
                }
              })
            }

            const { date, time } = this.parseDateTime(dateText, title)
            console.log(`📅 "${title.substring(0, 40)}": dateText="${dateText}" -> ${date} ${time}`)

            // Use cleaned description
            const description = rawDescription || `${title} - Event in Toronto`

            // Extract venue with better parsing
            const venueText = $elem.find('[data-testid="event-location"], .location-info, .venue-name').first().text().trim()
            const venue = this.extractVenueName(venueText)

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

            // Also check in the description for price info (ONLY dollar amounts - no text parsing)
            if (!priceText && description) {
              const descPriceMatch = description.match(/\$\d+/)
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
            const fullUrl = link?.startsWith('http') ? link : `https://www.eventbrite.ca${link}`

            // CRITICAL: Skip category/listing pages - only include actual event URLs
            // EventBrite event URLs must contain '/e/' followed by event name and ID
            // Examples:
            //   ✅ https://www.eventbrite.ca/e/halloween-party-tickets-123456
            //   ❌ https://www.eventbrite.ca/d/canada--toronto/halloween-party/

            // Skip any URL containing '/d/' - these are directory/category pages
            if (fullUrl.includes('/d/')) {
              console.log(`⏭️  Skipping directory page: ${fullUrl}`)
              return
            }

            // Event URLs must contain '/e/' (event identifier)
            if (!fullUrl.includes('/e/')) {
              console.log(`⏭️  Skipping non-event URL (no /e/): ${fullUrl}`)
              return
            }

            tempEvents.push({
              title,
              description,
              dateText,
              date,
              time,
              venue,
              price,
              priceMax,
              priceRange,
              imageUrl: imageUrl?.startsWith('http') ? imageUrl : '',
              fullUrl
            })
          })

          // Second pass: fetch accurate dates in parallel (max 5 at a time for performance)
          const eventsNeedingFetch = tempEvents.filter(e =>
            (!e.dateText || !e.dateText.match(/\d{4}/)) && e.fullUrl
          )

          // Fetch in batches of 5 to avoid overwhelming EventBrite
          const batchSize = 5
          for (let i = 0; i < eventsNeedingFetch.length; i += batchSize) {
            const batch = eventsNeedingFetch.slice(i, i + batchSize)
            await Promise.all(batch.map(async (tempEvent) => {
              try {
                const accurateDateTime = await this.fetchEventPageDate(tempEvent.fullUrl)
                if (accurateDateTime) {
                  tempEvent.date = accurateDateTime.date
                  tempEvent.time = accurateDateTime.time
                  console.log(`✅ Fetched accurate date for "${tempEvent.title.substring(0, 30)}": ${tempEvent.date} ${tempEvent.time}`)
                }
              } catch (e) {
                // Silently fail and use the best guess date
              }
            }))
          }

          // Third pass: build final events with corrected dates
          for (const tempEvent of tempEvents) {
            // Get venue coordinates
            const venueInfo = this.getVenueInfo(tempEvent.venue)

            // Only add future events (skip past events)
            const eventDate = new Date(tempEvent.date)
            const now = new Date()
            now.setHours(0, 0, 0, 0) // Start of today

            if (eventDate >= now || isNaN(eventDate.getTime())) {
              events.push({
                title: tempEvent.title.substring(0, 255),
                description: tempEvent.description,
                date: tempEvent.date,
                time: tempEvent.time,
                venue_name: tempEvent.venue,
                address: venueInfo.address,
                price_min: tempEvent.price,
                price_max: tempEvent.priceMax,
                price_range: tempEvent.priceRange,
                external_url: tempEvent.fullUrl,
                category: this.categorizeEvent(tempEvent.title + ' ' + tempEvent.description),
                image_url: tempEvent.imageUrl,
                latitude: venueInfo.lat,
                longitude: venueInfo.lng
              })
            }
          }
        } catch (pageError) {
          if (pageError.response) {
            console.warn(`⚠️ Eventbrite page ${page} returned ${pageError.response.status}: ${pageError.response.statusText}`)
            // Continue scraping other pages even if one fails
          } else if (pageError.code === 'ECONNABORTED') {
            console.warn(`⚠️ Eventbrite page ${page} timed out - continuing...`)
          } else {
            console.error(`❌ Failed to scrape page ${page}:`, pageError.message)
          }
        }
      }
    } catch (error) {
      console.error('Eventbrite scraping failed:', error.message)
      // Return any events we managed to collect before the error
    }

    // If we didn't get enough events, try with a more generic query
    if (events.length < 5 && query !== 'events') {
      console.log(`🔄 Retrying with generic query due to low results...`)
      try {
        const genericUrl = `https://www.eventbrite.ca/d/canada--toronto/events/?page=1`
        const response = await axios.get(genericUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status < 500
          }
        })

        if (response.status === 200) {
          const $ = cheerio.load(response.data)
          
          $('article, [data-testid="search-event-card"], .search-event-card, .event-card').each((i, elem) => {
            const $elem = $(elem)
            const title = $elem.find('h3, h2, [data-testid="event-title"], .event-title').first().text().trim()
            
            if (!title || title.length < 5) return
            
            // Add generic events that match our original query
            if (this.isRelevantToQuery(title, query)) {
              const description = $elem.find('.event-description, .summary, p').first().text().trim()
              const venueText = $elem.find('[data-testid="event-location"], .location-info, .venue-name').first().text().trim()
              const venue = this.extractVenueName(venueText)
              const dateElement = $elem.find('[data-testid="event-date"], .date-info, .event-date, time').first()
              const dateText = dateElement.text().trim() || dateElement.attr('datetime') || ''
              const { date, time } = this.parseDateTime(dateText, title)
              const priceText = $elem.find('[data-testid="event-price"], .price, .ticket-price').first().text().trim()
              const { price, priceMax, priceRange } = this.parsePrice(priceText)
              const imageElement = $elem.find('img').first()
              const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || ''
              const linkElement = $elem.find('a').first()
              const link = linkElement.attr('href') || ''
              const venueInfo = this.getVenueInfo(venue)

              // Only add future events (skip past events)
              const eventDate = new Date(date)
              const now = new Date()
              now.setHours(0, 0, 0, 0) // Start of today

              if (eventDate >= now || isNaN(eventDate.getTime())) {
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
              }
            }
          })
        }
      } catch (fallbackError) {
        console.error('🔄 Fallback scraping also failed:', fallbackError.message)
      }
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

    // Handle relative dates like "Tomorrow at 5:30 PM" or "Today at 8:00 PM"
    if (cleanText.includes('tomorrow')) {
      const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
      if (timeMatch) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const [, hour, minute, ampm] = timeMatch
        let hour24 = parseInt(hour)
        if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
        if (ampm?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0

        return {
          date: tomorrow.toISOString().split('T')[0],
          time: `${hour24.toString().padStart(2, '0')}:${minute}:00`
        }
      }
    }

    if (cleanText.includes('today')) {
      const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
      if (timeMatch) {
        const today = new Date()
        const [, hour, minute, ampm] = timeMatch
        let hour24 = parseInt(hour)
        if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
        if (ampm?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0

        return {
          date: today.toISOString().split('T')[0],
          time: `${hour24.toString().padStart(2, '0')}:${minute}:00`
        }
      }
    }

    // Handle day of week with time like "Saturday at 8:00 PM"
    const dayOfWeekMatch = cleanText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (dayOfWeekMatch) {
      const [, dayName, hour, minute, ampm] = dayOfWeekMatch
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = daysOfWeek.indexOf(dayName.toLowerCase())

      if (targetDay !== -1) {
        const today = new Date()
        const currentDay = today.getDay()
        let daysUntilTarget = targetDay - currentDay
        if (daysUntilTarget <= 0) daysUntilTarget += 7 // Next week

        const targetDate = new Date()
        targetDate.setDate(today.getDate() + daysUntilTarget)

        let hour24 = parseInt(hour)
        if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
        if (ampm?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0

        return {
          date: targetDate.toISOString().split('T')[0],
          time: `${hour24.toString().padStart(2, '0')}:${minute}:00`
        }
      }
    }

    // Look for specific patterns
    const patterns = [
      /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\w{3}),?\s+(\w{3})\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})\s*(am|pm)/i, // "Sat, Oct 25, 10:00 PM"
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

          // Handle "Sat, Oct 25, 10:00 PM" format (match has 7 elements)
          if (match.length === 7) {
            const [, , month, day, hour, minute, ampm] = match
            let hour24 = parseInt(hour)
            if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12
            if (ampm?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0

            time = `${hour24.toString().padStart(2, '0')}:${minute}:00`

            // Smart year detection: if month/day has passed this year, use next year
            const currentYear = new Date().getFullYear()
            const testDate = new Date(`${month} ${day}, ${currentYear}`)
            const now = new Date()
            now.setHours(0, 0, 0, 0)

            // If the date is more than 30 days in the past, assume it's next year
            if (testDate.getTime() < now.getTime() - (30 * 24 * 60 * 60 * 1000)) {
              date = new Date(`${month} ${day}, ${currentYear + 1}`)
            } else {
              date = testDate
            }
          }
          // Handle other formats with am/pm
          else if (pattern.source.includes('am|pm')) {
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
    // STRICT: If no price text, return undefined values (not free)
    // EventBrite often shows "Free" for registration but tickets cost money
    if (!priceText) return { price: undefined, priceMax: undefined, priceRange: '' }

    // Only mark as free if EXPLICITLY stated
    if (/^(free|no charge|complimentary|gratis)$/i.test(priceText.trim())) {
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
    
    // If we have text but no clear price, return undefined (not free)
    // STRICT: Do not default to free - let the UI show "Tickets Available" fallback
    return { price: undefined, priceMax: undefined, priceRange: '' }
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

  async scrapeResidentAdvisor(query: string, limit: number = 20): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []

    try {
      console.log(`🎧 Fetching RA.co events via GraphQL API (Toronto area: 34)`)

      // Calculate date range (today + 30 days)
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)

      const startDateStr = today.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // GraphQL query for RA.co events
      const graphqlQuery = {
        query: `query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
          eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
            data {
              id
              event {
                id
                title
                date
                startTime
                endTime
                venue {
                  name
                }
              }
            }
          }
        }`,
        variables: {
          filters: {
            areas: { eq: 34 }, // Toronto area ID
            listingDate: { gte: startDateStr, lte: endDateStr }
          },
          pageSize: limit,
          page: 1
        }
      }

      const response = await axios.post('https://ra.co/graphql', graphqlQuery, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      })

      const listings = response.data?.data?.eventListings?.data || []

      for (const listing of listings) {
        const event = listing.event
        if (!event) continue

        // Parse date/time from ISO format
        const eventDate = new Date(event.date)
        const startTime = event.startTime ? new Date(event.startTime) : null

        const date = eventDate.toISOString().split('T')[0]
        const time = startTime ?
          `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}:00` :
          '20:00:00' // Default to 8 PM if no time

        const venue = event.venue?.name || 'Toronto Venue'
        const venueInfo = this.getVenueInfo(venue)

        events.push({
          title: event.title.substring(0, 255),
          description: `${event.title} - Underground electronic music event in Toronto`,
          date,
          time,
          venue_name: venue,
          address: venueInfo.address,
          price_min: undefined,
          price_max: undefined,
          price_range: '',
          external_url: `https://ra.co/events/${event.id}`,
          category: 'music',
          image_url: '',
          latitude: venueInfo.lat,
          longitude: venueInfo.lng
        })
      }

      console.log(`   🎧 RA.co GraphQL: Found ${events.length} underground events`)
    } catch (error) {
      console.error('RA.co GraphQL API failed:', error.message)
    }

    return events
  }

  async scrapeAll(query: string, limit: number = 50): Promise<ScrapedEvent[]> {
    console.log(`🔍 Live scraping for: "${query}" (limit: ${limit})`)

    // Check if this is an underground/electronic music query
    const isUndergroundQuery = query.toLowerCase().includes('underground') ||
                              query.toLowerCase().includes('dj') ||
                              query.toLowerCase().includes('electronic') ||
                              query.toLowerCase().includes('edm') ||
                              query.toLowerCase().includes('techno') ||
                              query.toLowerCase().includes('house')

    // Scrape from RA.co for underground electronic events
    let raEvents: ScrapedEvent[] = []
    if (isUndergroundQuery) {
      raEvents = await this.scrapeResidentAdvisor(query, 20)
      console.log(`   🎧 RA.co: ${raEvents.length} events`)
    }

    // Scrape from EventBrite
    const eventbriteEvents = await this.scrapeEventbrite(query, limit)
    console.log(`   📊 EventBrite: ${eventbriteEvents.length} events`)

    // Also fetch from Ticketmaster API for verified events
    let ticketmasterEvents: ScrapedEvent[] = []
    try {
      const tmResponse = await fetch(`http://localhost:3000/api/ticketmaster/search?q=${encodeURIComponent(query)}&limit=20`)
      const tmData = await tmResponse.json()
      if (tmData.success && tmData.events) {
        ticketmasterEvents = tmData.events
        console.log(`   🎫 Ticketmaster: ${ticketmasterEvents.length} events`)
      }
    } catch (error) {
      console.warn(`   ⚠️  Ticketmaster API unavailable for "${query}"`)
    }

    // Combine and deduplicate - prioritize RA.co for underground events
    const allEvents = isUndergroundQuery ?
      [...raEvents, ...eventbriteEvents, ...ticketmasterEvents] :
      [...eventbriteEvents, ...ticketmasterEvents]

    const uniqueEvents = this.removeDuplicates(allEvents)

    const sources = isUndergroundQuery ? 'RA.co + EventBrite + Ticketmaster' : 'EventBrite + Ticketmaster'
    console.log(`✅ Found ${uniqueEvents.length} unique relevant events (${sources})`)
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
