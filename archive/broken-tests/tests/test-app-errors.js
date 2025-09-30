// Test script to check if the app loads without errors
const puppeteer = require('puppeteer');

async function testAppErrors() {
  console.log('🧪 Testing app for console errors...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning' && text.includes('Cannot update a component')) {
      errors.push(text);
    }
    
    consoleMessages.push({ type, text });
  });
  
  page.on('pageerror', error => {
    errors.push(error.toString());
  });
  
  try {
    console.log('📱 Loading app at http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(3000);
    
    if (errors.length === 0) {
      console.log('✅ No console errors found!');
    } else {
      console.log('❌ Found console errors:');
      errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error}`);
      });
    }
    
    // Log all console messages for debugging
    console.log('\n📋 All console messages:');
    consoleMessages.forEach(({ type, text }) => {
      if (type === 'error' || (type === 'warning' && text.includes('Cannot update'))) {
        console.log(`[${type.toUpperCase()}] ${text}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testAppErrors();
} catch (e) {
  console.log('📦 Puppeteer not installed. Install it with: npm install puppeteer');
  console.log('\nAlternatively, manually check the app at http://localhost:3000 for console errors.');
}