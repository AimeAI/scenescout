/**
 * Unit tests for event deduplication
 */

import {
  dedupeEvents,
  normalizeEventSlug,
  areEventsSimilar,
  type DedupeOptions
} from '../src/lib/deduplication/event-deduper'

describe('normalizeEventSlug', () => {
  it('should normalize basic titles', () => {
    expect(normalizeEventSlug('DJ Set')).toBe('dj-set')
    expect(normalizeEventSlug('Rock Concert!')).toBe('rock-concert')
    expect(normalizeEventSlug('Jazz   Night')).toBe('jazz-night')
  })

  it('should handle special characters', () => {
    expect(normalizeEventSlug('AC/DC Concert')).toBe('acdc-concert')
    expect(normalizeEventSlug('Music & Arts Festival')).toBe('music-arts-festival')
    expect(normalizeEventSlug('Hip-Hop Show')).toBe('hip-hop-show')
  })

  it('should include venue when provided', () => {
    expect(normalizeEventSlug('Concert', 'The Venue')).toBe('concert__the-venue')
    expect(normalizeEventSlug('Show', 'Club 123!')).toBe('show__club-123')
  })

  it('should handle empty or null inputs', () => {
    expect(normalizeEventSlug('')).toBe('')
    expect(normalizeEventSlug('Title', '')).toBe('title')
  })
})

describe('areEventsSimilar', () => {
  const baseEvent = {
    title: 'Jazz Concert',
    venue_name: 'Blue Note',
    start_time: '2024-01-01T20:00:00Z',
    date: '2024-01-01'
  }

  it('should detect exact matches', () => {
    const duplicate = { ...baseEvent }
    expect(areEventsSimilar(baseEvent, duplicate)).toBe(true)
  })

  it('should detect similar titles within time window', () => {
    const similar = {
      ...baseEvent,
      title: 'Jazz Concert Tonight',
      start_time: '2024-01-01T20:30:00Z' // 30 minutes later
    }
    expect(areEventsSimilar(baseEvent, similar)).toBe(true)
  })

  it('should reject events outside time window', () => {
    const different = {
      ...baseEvent,
      start_time: '2024-01-01T22:00:00Z' // 2 hours later (120 minutes)
    }
    expect(areEventsSimilar(baseEvent, different, { timeWindowMinutes: 90 })).toBe(false)
  })

  it('should respect custom similarity threshold', () => {
    const somewhat = {
      ...baseEvent,
      title: 'Classical Concert' // Different genre
    }
    
    expect(areEventsSimilar(baseEvent, somewhat, { titleSimilarityThreshold: 0.9 })).toBe(false)
    expect(areEventsSimilar(baseEvent, somewhat, { titleSimilarityThreshold: 0.3 })).toBe(true)
  })

  it('should enforce venue matching when required', () => {
    const differentVenue = {
      ...baseEvent,
      venue_name: 'Red Room'
    }
    
    expect(areEventsSimilar(baseEvent, differentVenue, { venueMatchRequired: true })).toBe(false)
    expect(areEventsSimilar(baseEvent, differentVenue, { venueMatchRequired: false })).toBe(true)
  })

  it('should handle missing dates gracefully', () => {
    const noDate = { title: 'Jazz Concert' }
    const withDate = { ...baseEvent }
    
    expect(areEventsSimilar(noDate, withDate)).toBe(true) // Falls back to string comparison
  })
})

describe('dedupeEvents', () => {
  it('should handle empty arrays', () => {
    expect(dedupeEvents([])).toEqual([])
    expect(dedupeEvents(null as any)).toEqual(null)
  })

  it('should remove exact duplicates', () => {
    const events = [
      { id: '1', title: 'Concert A', venue_name: 'Venue 1', date: '2024-01-01' },
      { id: '2', title: 'Concert A', venue_name: 'Venue 1', date: '2024-01-01' },
      { id: '3', title: 'Concert B', venue_name: 'Venue 2', date: '2024-01-02' }
    ]
    
    const result = dedupeEvents(events)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.title)).toEqual(['Concert A', 'Concert B'])
  })

  it('should prefer Ticketmaster events by default', () => {
    const events = [
      { 
        id: '1', 
        title: 'Concert', 
        venue_name: 'Venue', 
        date: '2024-01-01',
        source: 'eventbrite',
        description: 'Basic description'
      },
      { 
        id: '2', 
        title: 'Concert', 
        venue_name: 'Venue', 
        date: '2024-01-01',
        source: 'ticketmaster',
        description: 'Rich description',
        price_min: 25
      }
    ]
    
    const result = dedupeEvents(events, { preserveProvider: 'ticketmaster' })
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('ticketmaster')
  })

  it('should prefer more complete events', () => {
    const events = [
      { 
        id: '1', 
        title: 'Concert',
        date: '2024-01-01'
      },
      { 
        id: '2', 
        title: 'Concert',
        date: '2024-01-01',
        venue_name: 'Venue',
        description: 'Description',
        image_url: 'image.jpg',
        price_min: 25
      }
    ]
    
    const result = dedupeEvents(events)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2') // More complete event
  })

  it('should handle fuzzy matches within time window', () => {
    const events = [
      { 
        id: '1', 
        title: 'DJ Set',
        venue_name: 'Club',
        start_time: '2024-01-01T22:00:00Z'
      },
      { 
        id: '2', 
        title: 'DJ SET!',
        venue_name: 'Club',
        start_time: '2024-01-01T22:30:00Z' // 30 minutes later
      },
      { 
        id: '3', 
        title: 'Rock Concert',
        venue_name: 'Arena',
        start_time: '2024-01-01T22:00:00Z'
      }
    ]
    
    const result = dedupeEvents(events)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.title.toLowerCase())).toContain('dj set')
    expect(result.map(e => e.title)).toContain('Rock Concert')
  })

  it('should keep events without titles', () => {
    const events = [
      { id: '1', venue_name: 'Venue 1' },
      { id: '2', title: 'Concert', venue_name: 'Venue 2' },
      { id: '3', venue_name: 'Venue 3' }
    ]
    
    const result = dedupeEvents(events)
    expect(result).toHaveLength(3) // All kept since 2 have no title to match
  })

  it('should handle large event lists efficiently', () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      id: i.toString(),
      title: `Event ${i % 10}`, // Creates 10 groups of 10 duplicates each
      venue_name: 'Venue',
      date: '2024-01-01'
    }))
    
    const start = Date.now()
    const result = dedupeEvents(events)
    const duration = Date.now() - start
    
    expect(result).toHaveLength(10) // Should dedupe to 10 unique events
    expect(duration).toBeLessThan(1000) // Should complete in under 1 second
  })

  it('should respect custom options', () => {
    const events = [
      { 
        id: '1', 
        title: 'Jazz Concert',
        venue_name: 'Blue Note',
        start_time: '2024-01-01T20:00:00Z'
      },
      { 
        id: '2', 
        title: 'Jazz Show',
        venue_name: 'Red Room', // Different venue
        start_time: '2024-01-01T20:30:00Z'
      }
    ]
    
    // Should be considered different with venue requirement
    const strictResult = dedupeEvents(events, { 
      venueMatchRequired: true,
      titleSimilarityThreshold: 0.7
    })
    expect(strictResult).toHaveLength(2)
    
    // Should be considered similar without venue requirement
    const lenientResult = dedupeEvents(events, { 
      venueMatchRequired: false,
      titleSimilarityThreshold: 0.7
    })
    expect(lenientResult).toHaveLength(1)
  })

  it('should handle cross-provider scenarios', () => {
    const events = [
      {
        id: 'tm_1',
        title: 'Halloween Party',
        venue_name: 'The Club',
        date: '2024-10-31',
        source: 'ticketmaster',
        price_min: 25
      },
      {
        id: 'eb_1', 
        title: 'Halloween Party 2024',
        venue_name: 'The Club',
        date: '2024-10-31',
        source: 'eventbrite',
        description: 'Costume party'
      },
      {
        id: 'eb_2',
        title: 'Different Event',
        venue_name: 'Other Venue',
        date: '2024-10-31',
        source: 'eventbrite'
      }
    ]
    
    const result = dedupeEvents(events, { preserveProvider: 'ticketmaster' })
    expect(result).toHaveLength(2)
    
    // Should keep Ticketmaster version of Halloween Party
    const halloweenEvent = result.find(e => e.title.includes('Halloween'))
    expect(halloweenEvent?.source).toBe('ticketmaster')
    
    // Should keep the different event
    expect(result.find(e => e.title === 'Different Event')).toBeTruthy()
  })
})