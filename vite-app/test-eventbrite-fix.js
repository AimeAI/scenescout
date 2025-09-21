#!/usr/bin/env node

/**
 * Test and Fix Eventbrite API Integration
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

console.log('🎫 Testing Eventbrite API endpoints...\n');

const token = process.env.EVENTBRITE_PRIVATE_TOKEN;

if (!token) {
  console.log('❌ No Eventbrite token found');
  process.exit(1);
}

async function testEventbriteEndpoints() {
  const endpoints = [
    {
      name: 'User Info',
      url: 'https://www.eventbriteapi.com/v3/users/me/',
      method: 'GET'
    },
    {
      name: 'Public Events Search (Toronto)',
      url: 'https://www.eventbriteapi.com/v3/events/search/?location.address=Toronto&expand=venue,category',
      method: 'GET'
    },
    {
      name: 'Public Events Search (Location)',
      url: 'https://www.eventbriteapi.com/v3/events/search/?location.latitude=43.6532&location.longitude=-79.3832&location.within=25km&expand=venue',
      method: 'GET'
    },
    {
      name: 'User Organizations',
      url: 'https://www.eventbriteapi.com/v3/users/me/organizations/',
      method: 'GET'
    },
    {
      name: 'User Events',
      url: 'https://www.eventbriteapi.com/v3/users/me/events/',
      method: 'GET'
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (endpoint.name.includes('Events Search')) {
          console.log(`  Events found: ${data.events?.length || 0}`);
          if (data.events && data.events.length > 0) {
            console.log(`  Sample event: ${data.events[0].name?.text}`);
          }
        } else if (endpoint.name === 'User Info') {
          console.log(`  User: ${data.name || 'Unknown'}`);
          console.log(`  Email: ${data.emails?.[0]?.email || 'Unknown'}`);
        } else if (endpoint.name === 'User Organizations') {
          console.log(`  Organizations: ${data.organizations?.length || 0}`);
        } else if (endpoint.name === 'User Events') {
          console.log(`  User Events: ${data.events?.length || 0}`);
        }
        
        console.log('  ✅ Success');
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
    }
    console.log('');
  }
}

await testEventbriteEndpoints();

// Test categories
console.log('Testing Eventbrite categories...');
try {
  const response = await fetch('https://www.eventbriteapi.com/v3/categories/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Found ${data.categories?.length || 0} categories`);
    if (data.categories) {
      data.categories.slice(0, 5).forEach(cat => {
        console.log(`  - ${cat.name} (${cat.short_name})`);
      });
    }
  } else {
    console.log('❌ Categories failed:', response.status);
  }
} catch (error) {
  console.log('❌ Categories error:', error.message);
}