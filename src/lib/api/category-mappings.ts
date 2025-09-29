/**
 * Category mappings between external APIs and SceneScout categories
 * This helps organize events from different sources into consistent categories
 */

export interface SceneScoutCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  priority: number; // For ordering
}

export interface CategoryMapping {
  source: 'ticketmaster' | 'eventbrite' | 'meetup' | 'songkick';
  externalId: string;
  externalName: string;
  sceneScoutCategory: string;
  confidence: number; // 0-1, how confident we are in this mapping
}

// SceneScout Core Categories
export const SCENESCOUT_CATEGORIES: Record<string, SceneScoutCategory> = {
  // Concert Categories by Genre (Ticketmaster focus)
  'rock-concerts': {
    id: 'rock-concerts',
    name: 'Rock Concerts',
    description: 'Rock, alternative, metal, and indie rock concerts',
    color: 'bg-red-600',
    icon: 'Music',
    priority: 1
  },
  'pop-concerts': {
    id: 'pop-concerts',
    name: 'Pop Concerts',
    description: 'Pop, mainstream, and chart-topping artists',
    color: 'bg-pink-500',
    icon: 'Music',
    priority: 2
  },
  'hip-hop-concerts': {
    id: 'hip-hop-concerts',
    name: 'Hip-Hop & Rap',
    description: 'Hip-hop, rap, and urban music concerts',
    color: 'bg-orange-600',
    icon: 'Music',
    priority: 3
  },
  'electronic-concerts': {
    id: 'electronic-concerts',
    name: 'Electronic & EDM',
    description: 'Electronic, EDM, house, and techno events',
    color: 'bg-cyan-500',
    icon: 'Music',
    priority: 4
  },
  'country-concerts': {
    id: 'country-concerts',
    name: 'Country Music',
    description: 'Country, folk, and americana concerts',
    color: 'bg-amber-600',
    icon: 'Music',
    priority: 5
  },
  'rb-soul-concerts': {
    id: 'rb-soul-concerts',
    name: 'R&B & Soul',
    description: 'R&B, soul, funk, and neo-soul performances',
    color: 'bg-purple-600',
    icon: 'Music',
    priority: 6
  },
  'jazz-concerts': {
    id: 'jazz-concerts',
    name: 'Jazz & Blues',
    description: 'Jazz, blues, and contemporary jazz concerts',
    color: 'bg-indigo-600',
    icon: 'Music',
    priority: 7
  },
  'classical-concerts': {
    id: 'classical-concerts',
    name: 'Classical & Orchestra',
    description: 'Classical music, orchestra, and chamber music',
    color: 'bg-slate-600',
    icon: 'Music',
    priority: 8
  },
  'latin-concerts': {
    id: 'latin-concerts',
    name: 'Latin Music',
    description: 'Latin, reggaeton, salsa, and world music',
    color: 'bg-lime-600',
    icon: 'Music',
    priority: 9
  },
  'alternative-concerts': {
    id: 'alternative-concerts',
    name: 'Alternative & Indie',
    description: 'Alternative, indie, and experimental music',
    color: 'bg-teal-600',
    icon: 'Music',
    priority: 10
  },

  // Event Type Categories
  'music-festivals': {
    id: 'music-festivals',
    name: 'Music Festivals',
    description: 'Multi-day music festivals and outdoor events',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: 'Calendar',
    priority: 11
  },
  'arena-concerts': {
    id: 'arena-concerts',
    name: 'Arena Concerts',
    description: 'Large venue concerts in arenas and stadiums',
    color: 'bg-blue-600',
    icon: 'Building',
    priority: 12
  },
  'theater-concerts': {
    id: 'theater-concerts',
    name: 'Theater Concerts',
    description: 'Intimate theater and concert hall performances',
    color: 'bg-rose-600',
    icon: 'Theater',
    priority: 13
  },
  'outdoor-concerts': {
    id: 'outdoor-concerts',
    name: 'Outdoor Concerts',
    description: 'Outdoor venues, amphitheaters, and park concerts',
    color: 'bg-green-600',
    icon: 'TreePine',
    priority: 14
  },
  'club-concerts': {
    id: 'club-concerts',
    name: 'Club Shows',
    description: 'Nightclub performances and intimate venues',
    color: 'bg-violet-600',
    icon: 'Music2',
    priority: 15
  },

  // Sports & Entertainment
  'sports': {
    id: 'sports',
    name: 'Sports Events',
    description: 'Professional sports games and tournaments',
    color: 'bg-green-500',
    icon: 'Trophy',
    priority: 16
  },
  'theater-broadway': {
    id: 'theater-broadway',
    name: 'Theater & Broadway',
    description: 'Professional theater productions and Broadway shows',
    color: 'bg-red-500',
    icon: 'Theater',
    priority: 17
  },
  'comedy-shows': {
    id: 'comedy-shows',
    name: 'Comedy Shows',
    description: 'Stand-up comedy and comedy events',
    color: 'bg-yellow-500',
    icon: 'Laugh',
    priority: 18
  },

  // Local Events (typically Eventbrite)
  'local-music': {
    id: 'local-music',
    name: 'Local Music',
    description: 'Local bands, open mics, and intimate venues',
    color: 'bg-blue-500',
    icon: 'Music2',
    priority: 6
  },
  'networking': {
    id: 'networking',
    name: 'Networking',
    description: 'Professional networking and business events',
    color: 'bg-indigo-500',
    icon: 'Users',
    priority: 7
  },
  'workshops': {
    id: 'workshops',
    name: 'Workshops & Classes',
    description: 'Educational workshops and skill-building classes',
    color: 'bg-teal-500',
    icon: 'BookOpen',
    priority: 8
  },
  'community': {
    id: 'community',
    name: 'Community Events',
    description: 'Local community gatherings and social events',
    color: 'bg-orange-500',
    icon: 'Heart',
    priority: 9
  },
  'food-drink': {
    id: 'food-drink',
    name: 'Food & Drink',
    description: 'Food festivals, tastings, and culinary events',
    color: 'bg-amber-500',
    icon: 'Utensils',
    priority: 10
  },
  'arts-culture': {
    id: 'arts-culture',
    name: 'Arts & Culture',
    description: 'Art exhibits, cultural events, and galleries',
    color: 'bg-violet-500',
    icon: 'Palette',
    priority: 11
  },
  'wellness': {
    id: 'wellness',
    name: 'Health & Wellness',
    description: 'Fitness, yoga, meditation, and wellness events',
    color: 'bg-emerald-500',
    icon: 'Heart',
    priority: 12
  },
  'tech': {
    id: 'tech',
    name: 'Tech & Innovation',
    description: 'Technology meetups, hackathons, and tech talks',
    color: 'bg-slate-500',
    icon: 'Cpu',
    priority: 13
  },
  'family': {
    id: 'family',
    name: 'Family & Kids',
    description: 'Family-friendly events and activities for children',
    color: 'bg-lime-500',
    icon: 'Users2',
    priority: 14
  },
  'nightlife': {
    id: 'nightlife',
    name: 'Nightlife',
    description: 'Clubs, bars, and late-night entertainment',
    color: 'bg-purple-600',
    icon: 'Moon',
    priority: 15
  },
  'other': {
    id: 'other',
    name: 'Other Events',
    description: 'Miscellaneous events that don\'t fit other categories',
    color: 'bg-gray-500',
    icon: 'MoreHorizontal',
    priority: 16
  }
};

// Ticketmaster Category Mappings
export const TICKETMASTER_MAPPINGS: CategoryMapping[] = [
  // Music Genres -> Specific Concert Categories
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na', externalName: 'Rock', sceneScoutCategory: 'rock-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nA', externalName: 'Alternative Rock', sceneScoutCategory: 'rock-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nB', externalName: 'Hard Rock', sceneScoutCategory: 'rock-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nC', externalName: 'Metal', sceneScoutCategory: 'rock-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nd', externalName: 'Alternative', sceneScoutCategory: 'alternative-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nI', externalName: 'Indie Rock', sceneScoutCategory: 'alternative-concerts', confidence: 1.0 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nn', externalName: 'Pop', sceneScoutCategory: 'pop-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nP', externalName: 'Top 40', sceneScoutCategory: 'pop-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nQ', externalName: 'Adult Contemporary', sceneScoutCategory: 'pop-concerts', confidence: 0.9 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nE', externalName: 'Hip-Hop/Rap', sceneScoutCategory: 'hip-hop-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nH', externalName: 'Rap', sceneScoutCategory: 'hip-hop-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nU', externalName: 'Urban', sceneScoutCategory: 'hip-hop-concerts', confidence: 0.9 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7ne', externalName: 'Electronic', sceneScoutCategory: 'electronic-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nD', externalName: 'Dance/Electronic', sceneScoutCategory: 'electronic-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nT', externalName: 'House', sceneScoutCategory: 'electronic-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nS', externalName: 'Techno', sceneScoutCategory: 'electronic-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nR', externalName: 'EDM', sceneScoutCategory: 'electronic-concerts', confidence: 1.0 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nt', externalName: 'Country', sceneScoutCategory: 'country-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nF', externalName: 'Folk', sceneScoutCategory: 'country-concerts', confidence: 0.8 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nG', externalName: 'Americana', sceneScoutCategory: 'country-concerts', confidence: 0.9 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nW', externalName: 'Bluegrass', sceneScoutCategory: 'country-concerts', confidence: 0.9 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nl', externalName: 'R&B', sceneScoutCategory: 'rb-soul-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nM', externalName: 'Soul', sceneScoutCategory: 'rb-soul-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nN', externalName: 'Funk', sceneScoutCategory: 'rb-soul-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nO', externalName: 'Neo-Soul', sceneScoutCategory: 'rb-soul-concerts', confidence: 1.0 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nk', externalName: 'Jazz', sceneScoutCategory: 'jazz-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nV', externalName: 'Blues', sceneScoutCategory: 'jazz-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nX', externalName: 'Contemporary Jazz', sceneScoutCategory: 'jazz-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nY', externalName: 'Smooth Jazz', sceneScoutCategory: 'jazz-concerts', confidence: 1.0 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nZ', externalName: 'Classical', sceneScoutCategory: 'classical-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na1', externalName: 'Opera', sceneScoutCategory: 'classical-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na2', externalName: 'Symphony', sceneScoutCategory: 'classical-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na3', externalName: 'Chamber Music', sceneScoutCategory: 'classical-concerts', confidence: 1.0 },

  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na4', externalName: 'Latin', sceneScoutCategory: 'latin-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na5', externalName: 'Reggaeton', sceneScoutCategory: 'latin-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na6', externalName: 'Salsa', sceneScoutCategory: 'latin-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na7', externalName: 'World Music', sceneScoutCategory: 'latin-concerts', confidence: 0.8 },

  // Venue Types -> Event Type Categories
  { source: 'ticketmaster', externalId: 'festival', externalName: 'Festival', sceneScoutCategory: 'music-festivals', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'arena', externalName: 'Arena', sceneScoutCategory: 'arena-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'stadium', externalName: 'Stadium', sceneScoutCategory: 'arena-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'theater', externalName: 'Theater', sceneScoutCategory: 'theater-concerts', confidence: 0.8 },
  { source: 'ticketmaster', externalId: 'amphitheater', externalName: 'Amphitheater', sceneScoutCategory: 'outdoor-concerts', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'club', externalName: 'Club', sceneScoutCategory: 'club-concerts', confidence: 1.0 },

  // Sports
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nE', externalName: 'Sports', sceneScoutCategory: 'sports', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nA', externalName: 'Baseball', sceneScoutCategory: 'sports', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nF', externalName: 'Basketball', sceneScoutCategory: 'sports', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nL', externalName: 'Football', sceneScoutCategory: 'sports', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nH', externalName: 'Hockey', sceneScoutCategory: 'sports', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nK', externalName: 'Soccer', sceneScoutCategory: 'sports', confidence: 1.0 },

  // Arts & Theater
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7na', externalName: 'Arts & Theatre', sceneScoutCategory: 'theater-broadway', confidence: 0.9 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nJ', externalName: 'Theatre', sceneScoutCategory: 'theater-broadway', confidence: 0.95 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nI', externalName: 'Broadway', sceneScoutCategory: 'theater-broadway', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nF', externalName: 'Dance', sceneScoutCategory: 'arts-culture', confidence: 0.8 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nE', externalName: 'Opera', sceneScoutCategory: 'arts-culture', confidence: 0.9 },

  // Comedy
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nF', externalName: 'Comedy', sceneScoutCategory: 'comedy-shows', confidence: 1.0 },

  // Family
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nJ', externalName: 'Family', sceneScoutCategory: 'family', confidence: 1.0 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nI', externalName: 'Children', sceneScoutCategory: 'family', confidence: 1.0 },

  // Miscellaneous
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nJ', externalName: 'Miscellaneous', sceneScoutCategory: 'other', confidence: 0.5 },
  { source: 'ticketmaster', externalId: 'KZFzniwnSyZfZ7v7nE', externalName: 'Film', sceneScoutCategory: 'arts-culture', confidence: 0.8 }
];

// Eventbrite Category Mappings
export const EVENTBRITE_MAPPINGS: CategoryMapping[] = [
  // Business & Professional
  { source: 'eventbrite', externalId: '101', externalName: 'Business & Professional', sceneScoutCategory: 'networking', confidence: 0.9 },
  { source: 'eventbrite', externalId: '199', externalName: 'Networking', sceneScoutCategory: 'networking', confidence: 1.0 },
  { source: 'eventbrite', externalId: '102', externalName: 'Conference', sceneScoutCategory: 'networking', confidence: 0.8 },
  { source: 'eventbrite', externalId: '103', externalName: 'Seminar', sceneScoutCategory: 'workshops', confidence: 0.9 },
  { source: 'eventbrite', externalId: '104', externalName: 'Workshop', sceneScoutCategory: 'workshops', confidence: 1.0 },

  // Science & Technology
  { source: 'eventbrite', externalId: '102', externalName: 'Science & Technology', sceneScoutCategory: 'tech', confidence: 0.9 },
  { source: 'eventbrite', externalId: '299', externalName: 'High Tech', sceneScoutCategory: 'tech', confidence: 1.0 },
  { source: 'eventbrite', externalId: '298', externalName: 'Mobile', sceneScoutCategory: 'tech', confidence: 0.9 },
  { source: 'eventbrite', externalId: '297', externalName: 'Biotech', sceneScoutCategory: 'tech', confidence: 0.8 },

  // Music
  { source: 'eventbrite', externalId: '103', externalName: 'Music', sceneScoutCategory: 'local-music', confidence: 0.9 },
  { source: 'eventbrite', externalId: '399', externalName: 'Concert', sceneScoutCategory: 'local-music', confidence: 0.8 }, // Smaller concerts go to local-music
  { source: 'eventbrite', externalId: '398', externalName: 'Performance', sceneScoutCategory: 'local-music', confidence: 0.7 },
  { source: 'eventbrite', externalId: '397', externalName: 'DJ', sceneScoutCategory: 'nightlife', confidence: 0.9 },
  { source: 'eventbrite', externalId: '396', externalName: 'Festival', sceneScoutCategory: 'festivals', confidence: 0.9 },

  // Arts & Culture
  { source: 'eventbrite', externalId: '105', externalName: 'Arts & Culture', sceneScoutCategory: 'arts-culture', confidence: 0.9 },
  { source: 'eventbrite', externalId: '599', externalName: 'Visual Arts', sceneScoutCategory: 'arts-culture', confidence: 1.0 },
  { source: 'eventbrite', externalId: '598', externalName: 'Craft', sceneScoutCategory: 'workshops', confidence: 0.8 },
  { source: 'eventbrite', externalId: '597', externalName: 'Gallery', sceneScoutCategory: 'arts-culture', confidence: 1.0 },
  { source: 'eventbrite', externalId: '596', externalName: 'Literary Arts', sceneScoutCategory: 'arts-culture', confidence: 0.9 },

  // Food & Drink
  { source: 'eventbrite', externalId: '110', externalName: 'Food & Drink', sceneScoutCategory: 'food-drink', confidence: 1.0 },
  { source: 'eventbrite', externalId: '999', externalName: 'Beer', sceneScoutCategory: 'food-drink', confidence: 0.9 },
  { source: 'eventbrite', externalId: '998', externalName: 'Wine', sceneScoutCategory: 'food-drink', confidence: 0.9 },
  { source: 'eventbrite', externalId: '997', externalName: 'Food', sceneScoutCategory: 'food-drink', confidence: 1.0 },
  { source: 'eventbrite', externalId: '996', externalName: 'Spirits', sceneScoutCategory: 'food-drink', confidence: 0.9 },

  // Health & Wellness
  { source: 'eventbrite', externalId: '107', externalName: 'Health & Wellness', sceneScoutCategory: 'wellness', confidence: 1.0 },
  { source: 'eventbrite', externalId: '799', externalName: 'Yoga', sceneScoutCategory: 'wellness', confidence: 1.0 },
  { source: 'eventbrite', externalId: '798', externalName: 'Mental Health', sceneScoutCategory: 'wellness', confidence: 0.9 },
  { source: 'eventbrite', externalId: '797', externalName: 'Fitness', sceneScoutCategory: 'wellness', confidence: 1.0 },
  { source: 'eventbrite', externalId: '796', externalName: 'Meditation', sceneScoutCategory: 'wellness', confidence: 1.0 },

  // Family & Education
  { source: 'eventbrite', externalId: '115', externalName: 'Family & Education', sceneScoutCategory: 'family', confidence: 0.9 },
  { source: 'eventbrite', externalId: '199', externalName: 'Education', sceneScoutCategory: 'workshops', confidence: 0.8 },
  { source: 'eventbrite', externalId: '198', externalName: 'Baby', sceneScoutCategory: 'family', confidence: 1.0 },
  { source: 'eventbrite', externalId: '197', externalName: 'Kids & Family', sceneScoutCategory: 'family', confidence: 1.0 },

  // Community & Environment
  { source: 'eventbrite', externalId: '113', externalName: 'Community & Environment', sceneScoutCategory: 'community', confidence: 1.0 },
  { source: 'eventbrite', externalId: '299', externalName: 'Environment', sceneScoutCategory: 'community', confidence: 0.8 },
  { source: 'eventbrite', externalId: '298', externalName: 'Community', sceneScoutCategory: 'community', confidence: 1.0 },

  // Sports & Fitness
  { source: 'eventbrite', externalId: '108', externalName: 'Sports & Fitness', sceneScoutCategory: 'wellness', confidence: 0.8 },
  { source: 'eventbrite', externalId: '899', externalName: 'Sports', sceneScoutCategory: 'wellness', confidence: 0.7 }, // Local sports events go to wellness

  // Travel & Outdoor
  { source: 'eventbrite', externalId: '109', externalName: 'Travel & Outdoor', sceneScoutCategory: 'community', confidence: 0.7 },

  // Charity & Causes
  { source: 'eventbrite', externalId: '111', externalName: 'Charity & Causes', sceneScoutCategory: 'community', confidence: 0.9 },

  // Religion & Spirituality
  { source: 'eventbrite', externalId: '114', externalName: 'Religion & Spirituality', sceneScoutCategory: 'wellness', confidence: 0.7 },

  // Fashion & Beauty
  { source: 'eventbrite', externalId: '106', externalName: 'Fashion & Beauty', sceneScoutCategory: 'arts-culture', confidence: 0.8 },

  // Film, Media & Entertainment
  { source: 'eventbrite', externalId: '104', externalName: 'Film, Media & Entertainment', sceneScoutCategory: 'arts-culture', confidence: 0.9 },

  // Performing & Visual Arts
  { source: 'eventbrite', externalId: '105', externalName: 'Performing & Visual Arts', sceneScoutCategory: 'arts-culture', confidence: 0.9 },

  // Government & Politics
  { source: 'eventbrite', externalId: '112', externalName: 'Government & Politics', sceneScoutCategory: 'community', confidence: 0.8 },

  // Other
  { source: 'eventbrite', externalId: '199', externalName: 'Other', sceneScoutCategory: 'other', confidence: 0.5 }
];

// Helper functions
export function getSceneScoutCategory(source: string, externalCategory: string, externalGenre?: string): string {
  const mappings = source === 'ticketmaster' ? TICKETMASTER_MAPPINGS : EVENTBRITE_MAPPINGS;
  
  // For Ticketmaster, prioritize genre-based categorization
  if (source === 'ticketmaster' && externalGenre) {
    const genreMatch = mappings.find(m => 
      m.externalName.toLowerCase() === externalGenre.toLowerCase() ||
      externalGenre.toLowerCase().includes(m.externalName.toLowerCase())
    );
    
    if (genreMatch && genreMatch.confidence >= 0.9) {
      return genreMatch.sceneScoutCategory;
    }
  }
  
  // Try exact match on category
  const exactMatch = mappings.find(m => 
    m.externalName.toLowerCase() === externalCategory.toLowerCase() ||
    m.externalId === externalCategory
  );
  
  if (exactMatch) {
    return exactMatch.sceneScoutCategory;
  }

  // Try partial match
  const partialMatch = mappings.find(m => 
    externalCategory.toLowerCase().includes(m.externalName.toLowerCase()) ||
    m.externalName.toLowerCase().includes(externalCategory.toLowerCase())
  );

  if (partialMatch && partialMatch.confidence > 0.7) {
    return partialMatch.sceneScoutCategory;
  }

  // Smart defaults based on source
  if (source === 'ticketmaster') {
    // Default to pop-concerts for music, or appropriate category for non-music
    if (externalCategory.toLowerCase().includes('music') || 
        externalCategory.toLowerCase().includes('concert')) {
      return 'pop-concerts';
    } else if (externalCategory.toLowerCase().includes('sport')) {
      return 'sports';
    } else if (externalCategory.toLowerCase().includes('theater')) {
      return 'theater-broadway';
    } else if (externalCategory.toLowerCase().includes('comedy')) {
      return 'comedy-shows';
    }
    return 'arena-concerts'; // General fallback for large events
  }
  
  return 'community'; // Eventbrite fallback
}

// Helper function to get all music concert categories
export function getMusicConcertCategories(): string[] {
  return [
    'rock-concerts',
    'pop-concerts', 
    'hip-hop-concerts',
    'electronic-concerts',
    'country-concerts',
    'rb-soul-concerts',
    'jazz-concerts',
    'classical-concerts',
    'latin-concerts',
    'alternative-concerts'
  ];
}

// Helper function to get all event type categories
export function getEventTypeCategories(): string[] {
  return [
    'music-festivals',
    'arena-concerts',
    'theater-concerts', 
    'outdoor-concerts',
    'club-concerts'
  ];
}

// Function to determine if a category is music-related
export function isMusicCategory(categoryId: string): boolean {
  return getMusicConcertCategories().includes(categoryId) || 
         getEventTypeCategories().includes(categoryId) ||
         categoryId === 'local-music';
}

export function getCategoriesForSource(source: 'ticketmaster' | 'eventbrite'): string[] {
  if (source === 'ticketmaster') {
    return [
      // Concert Genres
      'rock-concerts',
      'pop-concerts',
      'hip-hop-concerts',
      'electronic-concerts',
      'country-concerts',
      'rb-soul-concerts',
      'jazz-concerts',
      'classical-concerts',
      'latin-concerts',
      'alternative-concerts',
      // Event Types
      'music-festivals',
      'arena-concerts',
      'theater-concerts',
      'outdoor-concerts',
      'club-concerts',
      // Non-Music
      'sports',
      'theater-broadway',
      'comedy-shows',
      'family'
    ];
  } else {
    return [
      'local-music',
      'networking',
      'workshops',
      'community',
      'food-drink',
      'arts-culture',
      'wellness',
      'tech',
      'family',
      'nightlife'
    ];
  }
}

export function getSourcePriority(source: string): number {
  const priorities = {
    'ticketmaster': 1,
    'eventbrite': 2,
    'songkick': 3,
    'meetup': 4
  };
  return priorities[source as keyof typeof priorities] || 5;
}

export function getCategoryDisplayInfo(categoryId: string) {
  return SCENESCOUT_CATEGORIES[categoryId] || SCENESCOUT_CATEGORIES['other'];
}