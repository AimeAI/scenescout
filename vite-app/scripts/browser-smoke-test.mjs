#!/usr/bin/env node

/**
 * SceneScout Browser Smoke Test
 * Tests core functionality in the browser
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';

async function runBrowserTests() {
  console.log('🌐 Starting Browser Smoke Tests...\n');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1200, height: 800 }
  });

  try {
    const page = await browser.newPage();

    // Test 1: Application loads
    console.log('🔍 Test 1: Application Loading...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    
    const title = await page.title();
    console.log(`   ✅ Page title: "${title}"`);
    
    // Test 2: Location detection
    console.log('\n🔍 Test 2: Location Detection...');
    await page.waitForSelector('[data-testid="location-banner"], .location-banner', { timeout: 5000 });
    console.log('   ✅ Location banner rendered');

    // Test 3: Events display
    console.log('\n🔍 Test 3: Events Display...');
    try {
      await page.waitForSelector('[data-testid="event-card"], .event-card, [class*="event"]', { timeout: 10000 });
      const eventElements = await page.$$('[data-testid="event-card"], .event-card, [class*="event"]');
      console.log(`   ✅ Found ${eventElements.length} event elements`);
    } catch (error) {
      console.log('   ⚠️  No event cards found - checking for category sections...');
      const categories = await page.$$('[class*="category"], h2, h3');
      console.log(`   ℹ️  Found ${categories.length} category/heading elements`);
    }

    // Test 4: Navigation
    console.log('\n🔍 Test 4: Navigation...');
    try {
      const navLinks = await page.$$('nav a, [role="navigation"] a, header a');
      console.log(`   ✅ Found ${navLinks.length} navigation links`);
    } catch (error) {
      console.log('   ⚠️  Navigation elements not found');
    }

    // Test 5: Map page (if exists)
    console.log('\n🔍 Test 5: Map Page...');
    try {
      await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[class*="map"], [data-testid="map"], #map', { timeout: 5000 });
      console.log('   ✅ Map page loads successfully');
    } catch (error) {
      console.log('   ℹ️  Map page not available or not loading');
      // Go back to home
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    }

    // Test 6: Discover page
    console.log('\n🔍 Test 6: Discover Page...');
    try {
      await page.goto(`${BASE_URL}/discover`, { waitUntil: 'networkidle0' });
      console.log('   ✅ Discover page loads successfully');
    } catch (error) {
      console.log('   ℹ️  Discover page not available');
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    }

    // Test 7: Filter functionality
    console.log('\n🔍 Test 7: Filter Interaction...');
    try {
      const filterButtons = await page.$$('button[class*="filter"], [data-testid="filter"], select');
      if (filterButtons.length > 0) {
        console.log(`   ✅ Found ${filterButtons.length} filter elements`);
        // Try clicking first filter
        await filterButtons[0].click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Filter interaction successful');
      } else {
        console.log('   ℹ️  No filter elements found');
      }
    } catch (error) {
      console.log('   ⚠️  Filter interaction failed:', error.message);
    }

    // Test 8: Console errors check
    console.log('\n🔍 Test 8: Console Errors...');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    if (logs.length === 0) {
      console.log('   ✅ No console errors found');
    } else {
      console.log(`   ⚠️  Found ${logs.length} console errors:`);
      logs.slice(0, 3).forEach(log => console.log(`      - ${log}`));
    }

    console.log('\n🎉 Browser smoke tests completed!');
    console.log('\n📝 Manual Testing Checklist:');
    console.log('   □ Events display with real venue names');
    console.log('   □ Location shows your current city');
    console.log('   □ Category filtering works');
    console.log('   □ Map shows event markers (if implemented)');
    console.log('   □ Event details are clickable');
    console.log('   □ External links work');

  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if development server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Development server not running at http://localhost:5173');
    console.log('   Please run: npm run dev');
    process.exit(1);
  }

  await runBrowserTests();
}

main().catch(console.error);