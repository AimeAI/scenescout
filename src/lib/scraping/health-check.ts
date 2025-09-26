import axios from 'axios'

interface SourceHealthStatus {
  name: string
  url: string
  status: 'healthy' | 'degraded' | 'down'
  statusCode?: number
  responseTime?: number
  lastChecked: string
  error?: string
}

interface HealthReport {
  timestamp: string
  totalSources: number
  healthySources: number
  degradedSources: number
  downSources: number
  sources: SourceHealthStatus[]
}

export class ScraperHealthChecker {
  private readonly SOURCES = [
    { name: 'Eventbrite', url: 'https://www.eventbrite.ca/d/canada--toronto/events/' },
    { name: 'Ticketmaster', url: 'https://www.ticketmaster.ca/browse/concerts-catid-10001/music-rid-10001?city=Toronto' },
    { name: 'Songkick', url: 'https://www.songkick.com/metro-areas/27396-canada-toronto' },
    { name: 'Bandsintown', url: 'https://www.bandsintown.com/c/toronto' },
    { name: 'BlogTO', url: 'https://www.blogto.com/events/' },
    { name: 'Toronto.com', url: 'https://www.toronto.com/events/' },
    { name: 'Meetup', url: 'https://www.meetup.com/find/tech/?location=Toronto%2C+ON' },
    { name: 'ROM', url: 'https://www.rom.on.ca/en/whats-on' },
    { name: 'AGO', url: 'https://ago.ca/events' },
  ]

  async checkAllSources(): Promise<HealthReport> {
    const results = await Promise.all(
      this.SOURCES.map(source => this.checkSource(source))
    )

    const healthySources = results.filter(r => r.status === 'healthy').length
    const degradedSources = results.filter(r => r.status === 'degraded').length
    const downSources = results.filter(r => r.status === 'down').length

    return {
      timestamp: new Date().toISOString(),
      totalSources: this.SOURCES.length,
      healthySources,
      degradedSources,
      downSources,
      sources: results
    }
  }

  private async checkSource(source: { name: string; url: string }): Promise<SourceHealthStatus> {
    const startTime = Date.now()
    
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true // Accept any status
      })

      const responseTime = Date.now() - startTime
      const { status } = response

      let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
      
      if (status >= 500) {
        healthStatus = 'down'
      } else if (status >= 400) {
        healthStatus = 'degraded'
      } else if (responseTime > 5000) {
        healthStatus = 'degraded'
      }

      return {
        name: source.name,
        url: source.url,
        status: healthStatus,
        statusCode: status,
        responseTime,
        lastChecked: new Date().toISOString(),
        error: status >= 400 ? `HTTP ${status}` : undefined
      }
    } catch (error: any) {
      return {
        name: source.name,
        url: source.url,
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.code || error.message
      }
    }
  }

  async getHealthySources(): Promise<string[]> {
    const report = await this.checkAllSources()
    return report.sources
      .filter(s => s.status === 'healthy')
      .map(s => s.name)
  }

  formatReport(report: HealthReport): string {
    const summary = [
      `Scraper Health Check - ${new Date(report.timestamp).toLocaleString()}`,
      ``,
      `Summary:`,
      `✅ Healthy: ${report.healthySources}/${report.totalSources}`,
      `⚠️  Degraded: ${report.degradedSources}/${report.totalSources}`,
      `❌ Down: ${report.downSources}/${report.totalSources}`,
      ``,
      `Sources:`
    ]

    for (const source of report.sources) {
      const statusEmoji = source.status === 'healthy' ? '✅' : source.status === 'degraded' ? '⚠️' : '❌'
      const responseTime = source.responseTime ? `${source.responseTime}ms` : 'N/A'
      const statusCode = source.statusCode || 'N/A'
      
      summary.push(
        `${statusEmoji} ${source.name}: ${source.status} (HTTP ${statusCode}, ${responseTime})`
      )
      
      if (source.error) {
        summary.push(`   Error: ${source.error}`)
      }
    }

    return summary.join('\n')
  }
}

// Export singleton instance
export const scraperHealthChecker = new ScraperHealthChecker()