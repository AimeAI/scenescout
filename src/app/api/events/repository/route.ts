import { NextRequest, NextResponse } from 'next/server'
import { FileEventRepository } from '@/lib/file-event-repository'

export const dynamic = 'force-dynamic'

const repository = new FileEventRepository()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchQuery = searchParams.get('q') || ''
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined

    console.log(`📚 Repository query: category=${category}, q="${searchQuery}", limit=${limit}, offset=${offset}`)

    // Get events from repository
    const events = await repository.getEvents({
      category: category === 'all' ? undefined : category,
      limit,
      offset,
      searchQuery,
      minPrice,
      maxPrice
    })

    // Get total count for pagination
    const totalCount = await repository.getEventCount(category === 'all' ? undefined : category)
    const hasMore = offset + limit < totalCount

    console.log(`✅ Repository: Found ${events.length} events, total ${totalCount}, hasMore: ${hasMore}`)

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      totalCount,
      hasMore,
      source: 'repository',
      category,
      searchQuery
    })

  } catch (error) {
    console.error('Repository API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events from repository', details: error.message },
      { status: 500 }
    )
  }
}
