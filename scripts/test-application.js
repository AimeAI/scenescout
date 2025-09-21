#!/usr/bin/env node
/**
 * Comprehensive Application Test Script
 * Tests all major functionality and workflows
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

const tests = [
  {
    name: 'Homepage',
    path: '/',
    expectedContent: ['SceneScout', 'Discover']
  },
  {
    name: 'Feed Page',
    path: '/feed',
    expectedContent: ['Events']
  },
  {
    name: 'Map Page', 
    path: '/map',
    expectedContent: ['map']
  },
  {
    name: 'Submit Page',
    path: '/submit',
    expectedContent: ['Submit']
  },
  {
    name: 'Pipeline API',
    path: '/api/pipeline',
    expectedContent: ['Event Pipeline API', 'version']
  },
  {
    name: 'Pipeline Health',
    path: '/api/pipeline?action=health',
    expectedContent: ['status', 'uptime']
  },
  {
    name: 'Pipeline WebSocket Info',
    path: '/api/pipeline/websocket',
    expectedContent: ['WebSocket endpoint']
  }
];

async function testEndpoint(test) {
  try {
    const response = await fetch(`${BASE_URL}${test.path}`);
    const content = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check for expected content
    const missingContent = test.expectedContent.filter(expected => 
      !content.toLowerCase().includes(expected.toLowerCase())
    );

    if (missingContent.length > 0) {
      throw new Error(`Missing expected content: ${missingContent.join(', ')}`);
    }

    return { success: true, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting SceneScout Application Tests...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    const result = await testEndpoint(test);
    
    if (result.success) {
      console.log(`✅ PASSED (${result.status})`);
      passed++;
    } else {
      console.log(`❌ FAILED - ${result.error}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Application is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    return false;
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch(BASE_URL);
    return true;
  } catch (error) {
    console.log('❌ Development server is not running on http://localhost:3000');
    console.log('Please start the server with: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);