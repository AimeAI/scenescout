export const STICKY_CATEGORIES = {
  // Phase 1: Core Sticky (Launch)
  core: [
    {
      id: 'food-drinks',
      name: 'Food & Drinks',
      icon: '🍽️',
      frequency: 'daily',
      stickiness: 'high',
      subcategories: ['happy-hour', 'food-festival', 'wine-tasting', 'popup-restaurant']
    },
    {
      id: 'nightlife',
      name: 'Nightlife & Social',
      icon: '🌃',
      frequency: 'weekly',
      stickiness: 'high',
      subcategories: ['rooftop-party', 'club-event', 'networking', 'singles-event']
    },
    {
      id: 'free-events',
      name: 'Free Events',
      icon: '🆓',
      frequency: 'daily',
      stickiness: 'high',
      subcategories: ['outdoor-movie', 'market', 'festival', 'community-event']
    }
  ],
  
  // Phase 2: Habit Forming
  habit: [
    {
      id: 'fitness',
      name: 'Fitness & Wellness',
      icon: '💪',
      frequency: 'routine',
      stickiness: 'medium',
      subcategories: ['yoga', 'running-group', 'outdoor-workout', 'meditation']
    },
    {
      id: 'after-work',
      name: 'After Work',
      icon: '⏰',
      frequency: 'weekday',
      stickiness: 'medium',
      subcategories: ['lunch-event', 'happy-hour', 'weekday-social', 'quick-activity']
    },
    {
      id: 'weekend',
      name: 'Weekend Adventures',
      icon: '🏞️',
      frequency: 'weekly',
      stickiness: 'medium',
      subcategories: ['day-trip', 'outdoor-activity', 'brunch', 'market']
    }
  ],
  
  // Phase 3: Engagement Boosters
  engagement: [
    {
      id: 'arts-culture',
      name: 'Arts & Culture',
      icon: '🎨',
      frequency: 'monthly',
      stickiness: 'low',
      subcategories: ['gallery-opening', 'theater', 'live-performance', 'exhibition']
    },
    {
      id: 'learning',
      name: 'Learning & Skills',
      icon: '📚',
      frequency: 'routine',
      stickiness: 'medium',
      subcategories: ['workshop', 'class', 'seminar', 'language-exchange']
    }
  ]
}

export const CATEGORY_PRIORITIES = {
  launch: ['food-drinks', 'nightlife', 'free-events'],
  growth: ['fitness', 'after-work', 'weekend'],
  retention: ['arts-culture', 'learning']
}
