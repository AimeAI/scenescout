#!/usr/bin/env node

// External URL Verification Script
// Ensures all event external URLs are working and accessible
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyExternalLinks() {
  console.log('🔍 Starting External URL Verification...');
  
  try {
    // Get all events with external URLs
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, external_url, source')
      .not('external_url', 'is', null)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  No events with external URLs found');
      return;
    }

    console.log(`📊 Found ${events.length} events with external URLs`);
    console.log('🌐 Verifying URLs...\n');

    const results = {
      total: events.length,
      working: 0,
      broken: 0,
      redirected: 0,
      timeout: 0,
      by_source: {}
    };

    const brokenUrls = [];
    const workingUrls = [];

    // Verify each URL with timeout and retry
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const progress = `[${i + 1}/${events.length}]`;
      
      try {
        console.log(`${progress} Checking: ${event.title.substring(0, 50)}...`);
        
        const response = await fetch(event.external_url, {
          method: 'HEAD',
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'SceneScout-Verification-Bot/1.0'
          }
        });

        // Track by source
        if (!results.by_source[event.source]) {
          results.by_source[event.source] = { working: 0, broken: 0, total: 0 };
        }
        results.by_source[event.source].total++;

        if (response.ok) {
          results.working++;
          results.by_source[event.source].working++;
          workingUrls.push({
            id: event.id,
            title: event.title,
            url: event.external_url,
            source: event.source,
            status: response.status
          });
          console.log(`  ✅ Working (${response.status})`);
          
          if (response.status === 301 || response.status === 302) {
            results.redirected++;
          }
        } else {
          results.broken++;
          results.by_source[event.source].broken++;
          brokenUrls.push({
            id: event.id,
            title: event.title,
            url: event.external_url,
            source: event.source,
            status: response.status,
            error: `HTTP ${response.status}`
          });
          console.log(`  ❌ Broken (${response.status})`);
        }

      } catch (error) {
        results.broken++;
        if (!results.by_source[event.source]) {
          results.by_source[event.source] = { working: 0, broken: 0, total: 0 };
        }
        results.by_source[event.source].total++;
        results.by_source[event.source].broken++;

        const errorType = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ? 'Timeout' : 'Connection Error';
        
        if (errorType === 'Timeout') {
          results.timeout++;
        }

        brokenUrls.push({
          id: event.id,
          title: event.title,
          url: event.external_url,
          source: event.source,
          error: `${errorType}: ${error.message}`
        });
        console.log(`  ❌ ${errorType}`);
      }

      // Rate limiting - be nice to external servers
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    // Generate comprehensive report
    console.log('\n📈 External URL Verification Report');
    console.log('====================================');
    console.log(`Total URLs checked: ${results.total}`);
    console.log(`✅ Working: ${results.working} (${Math.round(results.working/results.total*100)}%)`);
    console.log(`❌ Broken: ${results.broken} (${Math.round(results.broken/results.total*100)}%)`);
    console.log(`🔄 Redirected: ${results.redirected}`);
    console.log(`⏱️  Timeouts: ${results.timeout}`);

    console.log('\n📊 Results by Source:');
    for (const [source, stats] of Object.entries(results.by_source)) {
      const successRate = Math.round(stats.working/stats.total*100);
      console.log(`  ${source}: ${stats.working}/${stats.total} working (${successRate}%)`);
    }

    // Show sample working URLs
    if (workingUrls.length > 0) {
      console.log('\n✅ Sample Working URLs:');
      workingUrls.slice(0, 5).forEach(url => {
        console.log(`  - ${url.title} (${url.source})`);
        console.log(`    ${url.url}`);
      });
    }

    // Show broken URLs for fixing
    if (brokenUrls.length > 0) {
      console.log('\n❌ Broken URLs (need attention):');
      brokenUrls.forEach(url => {
        console.log(`  - ${url.title} (${url.source})`);
        console.log(`    ${url.url}`);
        console.log(`    Error: ${url.error}`);
      });
    }

    // Update verification status in database
    if (workingUrls.length > 0) {
      console.log('\n🔄 Updating verification status in database...');
      
      for (const url of workingUrls) {
        await supabase
          .from('events')
          .update({ 
            last_verified: new Date().toISOString(),
            verification_count: supabase.raw('verification_count + 1')
          })
          .eq('id', url.id);
      }
      
      console.log(`✅ Updated verification status for ${workingUrls.length} working URLs`);
    }

    // Final assessment
    const overallHealth = results.working / results.total;
    if (overallHealth >= 0.95) {
      console.log('\n🎉 Excellent! Your event external URLs are in great shape!');
    } else if (overallHealth >= 0.80) {
      console.log('\n👍 Good! Most of your external URLs are working properly.');
    } else if (overallHealth >= 0.60) {
      console.log('\n⚠️  Fair. Some external URLs need attention.');
    } else {
      console.log('\n🚨 Alert! Many external URLs are broken and need immediate attention.');
    }

    console.log('\n✨ External URL verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyExternalLinks()
  .then(() => {
    console.log('\n🎯 All external URLs verified!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });