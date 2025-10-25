import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scenescout.app'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/near-me`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/saved`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/surprise-me`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/offline`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Dynamic event pages
  try {
    // Fetch recent events for sitemap
    const response = await fetch(`${baseUrl}/api/events?limit=100`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (response.ok) {
      const data = await response.json()
      const events = data.events || []

      const eventPages: MetadataRoute.Sitemap = events.map((event: any) => ({
        url: `${baseUrl}/events/${event.id}`,
        lastModified: new Date(event.updated_at || event.created_at),
        changeFrequency: 'daily' as const,
        priority: event.is_featured ? 0.8 : 0.6,
      }))

      return [...staticPages, ...eventPages]
    }
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  return staticPages
}
