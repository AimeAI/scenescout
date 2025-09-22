const { spawn } = require('child_process')
const path = require('path')

// Run the scraper every 30 minutes
const SCRAPE_INTERVAL = 30 * 60 * 1000 // 30 minutes

function runScraper() {
  console.log(`🕐 ${new Date().toLocaleString()} - Running Toronto event scraper...`)
  
  const scraper = spawn('node', ['scripts/scrape-toronto-events.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  })
  
  scraper.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Scraper completed successfully')
    } else {
      console.error(`❌ Scraper failed with code ${code}`)
    }
    
    // Schedule next run
    setTimeout(runScraper, SCRAPE_INTERVAL)
  })
  
  scraper.on('error', (error) => {
    console.error('❌ Scraper error:', error)
    // Schedule next run even on error
    setTimeout(runScraper, SCRAPE_INTERVAL)
  })
}

console.log('🚀 Starting automated Toronto event scraper...')
console.log(`📅 Will run every ${SCRAPE_INTERVAL / 60000} minutes`)

// Run immediately, then every 30 minutes
runScraper()
