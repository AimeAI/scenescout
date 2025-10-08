/**
 * Shared category definitions used across the app
 */

export const CATEGORIES = [
  // Music & Entertainment
  { id: 'music-concerts', title: 'Music & Concerts', emoji: '🎵', query: 'concert' },
  { id: 'nightlife-dj', title: 'Nightlife & DJ Sets', emoji: '🌃', query: 'dance' },
  { id: 'comedy-improv', title: 'Comedy & Improv', emoji: '😂', query: 'comedy' },
  { id: 'theatre-dance', title: 'Theatre & Dance', emoji: '🎭', query: 'theatre' },

  // Food & Culture
  { id: 'food-drink', title: 'Food & Drink (Pop-ups, Tastings)', emoji: '🍽️', query: 'festival' },
  { id: 'arts-exhibits', title: 'Arts & Exhibits', emoji: '🎨', query: 'art' },
  { id: 'film-screenings', title: 'Film & Screenings', emoji: '🎬', query: 'film' },
  { id: 'markets-popups', title: 'Markets & Pop-ups', emoji: '🛍️', query: 'festival' },

  // Active & Wellness
  { id: 'sports-fitness', title: 'Sports & Fitness', emoji: '🏃', query: 'sports' },
  { id: 'outdoors-nature', title: 'Outdoors & Nature', emoji: '🌲', query: 'festival' },
  { id: 'wellness-mindfulness', title: 'Wellness & Mindfulness', emoji: '🧘', query: 'expo' },

  // Community & Learning
  { id: 'workshops-classes', title: 'Workshops & Classes', emoji: '📚', query: 'expo' },
  { id: 'tech-startups', title: 'Tech & Startups', emoji: '💻', query: 'tech' },

  // Special Categories
  { id: 'family-kids', title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', query: 'family' },
  { id: 'date-night', title: 'Date Night Ideas', emoji: '💕', query: 'jazz' },
  { id: 'late-night', title: 'Late Night (11pm–4am)', emoji: '🌙', query: 'club' },
  { id: 'neighborhood', title: 'Neighborhood Hotspots', emoji: '📍', query: 'festival' },
  { id: 'halloween', title: 'Halloween Events', emoji: '🎃', query: 'halloween' }
] as const

export type CategoryId = typeof CATEGORIES[number]['id']
