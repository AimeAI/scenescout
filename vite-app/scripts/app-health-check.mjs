#!/usr/bin/env node

/**
 * SceneScout Application Health Check
 * Verifies the application is running and responsive
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5173';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, prefix, message) {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`);
}

async function checkApplicationHealth() {
  console.log(`${colors.cyan}🏥 SceneScout Application Health Check${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}\n`);

  try {
    // Test 1: Basic connectivity
    log('blue', 'TEST', 'Checking application connectivity...');
    const response = await fetch(BASE_URL, { 
      method: 'GET',
      timeout: 10000 
    });
    
    if (response.ok) {
      log('green', 'PASS', `Application responding (${response.status})`);
      
      // Check if it's actually the Vite dev server
      const html = await response.text();
      if (html.includes('vite') || html.includes('SceneScout') || html.includes('root')) {
        log('green', 'PASS', 'Vite development server detected');
      }
      
    } else {
      log('red', 'FAIL', `Application returned ${response.status}`);
      return false;
    }

    // Test 2: Check for common routes
    log('blue', 'TEST', 'Testing common application routes...');
    
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/discover', name: 'Discover' },
      { path: '/map', name: 'Map' },
      { path: '/venues', name: 'Venues' }
    ];

    for (const route of routes) {
      try {
        const routeResponse = await fetch(`${BASE_URL}${route.path}`, { 
          timeout: 5000,
          redirect: 'follow'
        });
        
        if (routeResponse.ok) {
          log('green', 'PASS', `${route.name} route accessible`);
        } else if (routeResponse.status === 404) {
          log('yellow', 'WARN', `${route.name} route returns 404 (may not be implemented)`);
        } else {
          log('yellow', 'WARN', `${route.name} route returns ${routeResponse.status}`);
        }
      } catch (error) {
        log('yellow', 'WARN', `${route.name} route test failed: ${error.message}`);
      }
    }

    // Test 3: Performance check
    log('blue', 'TEST', 'Performance check...');
    const startTime = Date.now();
    await fetch(BASE_URL, { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      log('green', 'PASS', `Fast response time: ${responseTime}ms`);
    } else if (responseTime < 3000) {
      log('yellow', 'WARN', `Slow response time: ${responseTime}ms`);
    } else {
      log('red', 'FAIL', `Very slow response time: ${responseTime}ms`);
    }

    return true;

  } catch (error) {
    log('red', 'FAIL', `Application health check failed: ${error.message}`);
    return false;
  }
}

async function checkDatabaseConnectivity() {
  console.log(`\n${colors.blue}📊 Database Connectivity Check${colors.reset}`);
  console.log(`${colors.blue}==============================${colors.reset}\n`);

  try {
    // Import and test database connection
    const { createClient } = await import('@supabase/supabase-js');
    const dotenv = await import('dotenv');
    dotenv.config();

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Test basic query
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    if (error) {
      log('red', 'FAIL', `Database query failed: ${error.message}`);
      return false;
    } else {
      log('green', 'PASS', 'Database connectivity working');
      
      // Get event count
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      
      log('green', 'INFO', `Database contains ${count || 0} events`);
      return true;
    }

  } catch (error) {
    log('red', 'FAIL', `Database connectivity check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  let allHealthy = true;

  // Check application health
  const appHealthy = await checkApplicationHealth();
  if (!appHealthy) allHealthy = false;

  // Check database connectivity  
  const dbHealthy = await checkDatabaseConnectivity();
  if (!dbHealthy) allHealthy = false;

  // Final status
  console.log(`\n${'='.repeat(50)}`);
  
  if (allHealthy) {
    log('green', 'PASS', 'All health checks passed! ✨');
    console.log(`${colors.green}🚀 SceneScout is ready for testing!${colors.reset}`);
    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`1. Open browser to: ${BASE_URL}`);
    console.log(`2. Test location detection and event display`);
    console.log(`3. Navigate to Discover, Map, and filter events`);
    console.log(`4. Verify real events show with working links`);
  } else {
    log('red', 'FAIL', 'Some health checks failed! ❌');
    console.log(`${colors.red}Please fix the issues above before browser testing.${colors.reset}`);
  }
  
  process.exit(allHealthy ? 0 : 1);
}

main().catch(console.error);