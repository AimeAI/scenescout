import { NextRequest, NextResponse } from 'next/server'
import { scraperHealthChecker } from '@/lib/scraping/health-check'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Running scraper health check...')
    
    const report = await scraperHealthChecker.checkAllSources()
    
    console.log(scraperHealthChecker.formatReport(report))
    
    return NextResponse.json({
      success: true,
      ...report
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: 'Health check failed', details: error.message },
      { status: 500 }
    )
  }
}