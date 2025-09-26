// Test script to verify loadCategory temporal dead zone issue is fixed
const puppeteer = require('puppeteer')

async function testLoadCategoryFix() {
  console.log('🧪 Testing loadCategory fix...')
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to true for headless mode
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text())
    }
  })
  
  // Listen for JavaScript errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message)
  })
  
  try {
    // Navigate to the homepage
    console.log('📍 Navigating to homepage...')
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait for the main container to load
    console.log('⏳ Waiting for page to load...')
    await page.waitForSelector('.min-h-screen', { timeout: 10000 })
    
    // Check for the presence of category rows (indicates loadCategoryEvents worked)
    console.log('🔍 Checking for category content...')
    
    // Wait a bit for initial loading
    await page.waitForTimeout(3000)
    
    // Check if there are any JavaScript errors related to loadCategory
    const errors = await page.evaluate(() => {
      return window.console._errors || []
    })
    
    console.log('📊 JavaScript errors found:', errors.length)
    
    // Look for category loading indicators
    const loadingIndicators = await page.$$('.animate-spin')
    console.log('🔄 Loading spinners found:', loadingIndicators.length)
    
    // Look for category titles
    const categoryTitles = await page.$$eval('h2', els => els.map(el => el.textContent))
    console.log('📂 Category titles found:', categoryTitles.length)
    console.log('📝 First few categories:', categoryTitles.slice(0, 5))
    
    // Check for successful category loading by looking for event cards
    await page.waitForTimeout(5000) // Give time for events to load
    
    const eventCards = await page.$$('.cursor-pointer')
    console.log('🎫 Event cards found:', eventCards.length)
    
    if (eventCards.length > 0) {
      console.log('✅ SUCCESS: Events loaded successfully, loadCategory issue appears fixed!')
    } else {
      console.log('⚠️ WARNING: No event cards found, may need more investigation')
    }
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: '/Users/allthishappiness/Documents/scenescoutv1/tests/homepage-test.png', fullPage: true })
    console.log('📸 Screenshot saved to tests/homepage-test.png')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await browser.close()
  }
}

// Run the test
testLoadCategoryFix().catch(console.error)