/**
 * Test Script: Performance Optimization Validation
 *
 * Run this script to validate that all performance optimizations are working correctly.
 *
 * Usage:
 *   npx tsx scripts/test-performance-optimization.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface TestResult {
  name: string
  passed: boolean
  duration?: number
  details?: string
}

const results: TestResult[] = []

/**
 * Measure query execution time
 */
async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<{ data: T | null; duration: number }> {
  const startTime = Date.now()

  try {
    const data = await queryFn()
    const duration = Date.now() - startTime
    return { data, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Error in ${name}:`, error)
    return { data: null, duration }
  }
}

/**
 * Test 1: Verify indexes exist
 */
async function testIndexesExist() {
  console.log('\n📊 Test 1: Checking if indexes exist...')

  const expectedIndexes = [
    'idx_saved_events_user_created',
    'idx_saved_events_event_created',
    'idx_event_reminders_pending',
    'idx_event_reminders_user_future',
    'idx_push_subscriptions_active',
    'idx_push_subscriptions_endpoint',
    'idx_events_future_date',
    'idx_events_category_date_time',
    'idx_events_featured',
  ]

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `
  }).catch(() => {
    // Fallback: query directly if RPC not available
    return { data: null, error: 'RPC not available - manual check required' }
  })

  if (error) {
    results.push({
      name: 'Indexes Exist',
      passed: false,
      details: `Manual verification required. Expected indexes: ${expectedIndexes.join(', ')}`
    })
    console.log('⚠️ Cannot query pg_indexes directly. Please verify manually.')
    return
  }

  const foundIndexes = data?.map((row: any) => row.indexname) || []
  const missing = expectedIndexes.filter(idx => !foundIndexes.includes(idx))

  if (missing.length === 0) {
    results.push({
      name: 'Indexes Exist',
      passed: true,
      details: `All ${expectedIndexes.length} indexes found`
    })
    console.log(`✅ All ${expectedIndexes.length} indexes exist`)
  } else {
    results.push({
      name: 'Indexes Exist',
      passed: false,
      details: `Missing indexes: ${missing.join(', ')}`
    })
    console.log(`❌ Missing ${missing.length} indexes: ${missing.join(', ')}`)
  }
}

/**
 * Test 2: Query performance - Saved Events
 */
async function testSavedEventsPerformance() {
  console.log('\n⏱️ Test 2: Testing saved_events query performance...')

  const testUserId = 'test-user-' + Date.now()

  // Insert test data
  await supabase.from('saved_events').insert({
    user_id: testUserId,
    event_id: 'test-event-1',
    event_data: { title: 'Test Event' }
  })

  // Measure query with index
  const { data, duration } = await measureQuery(
    'saved_events query',
    async () => {
      const { data } = await supabase
        .from('saved_events')
        .select('id, user_id, event_id, created_at')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(100)

      return data
    }
  )

  // Cleanup
  await supabase
    .from('saved_events')
    .delete()
    .eq('user_id', testUserId)

  const passed = duration < 200 // Should be under 200ms
  results.push({
    name: 'Saved Events Performance',
    passed,
    duration,
    details: `Query took ${duration}ms (target: <200ms)`
  })

  if (passed) {
    console.log(`✅ Saved events query: ${duration}ms (target: <200ms)`)
  } else {
    console.log(`⚠️ Saved events query: ${duration}ms (slower than expected)`)
  }
}

/**
 * Test 3: Query performance - Event Reminders
 */
async function testRemindersPerformance() {
  console.log('\n⏱️ Test 3: Testing event_reminders query performance...')

  const testUserId = 'test-user-' + Date.now()
  const futureDate = new Date(Date.now() + 3600000).toISOString()

  // Insert test data
  await supabase.from('event_reminders').insert({
    user_id: testUserId,
    event_id: 'test-event-1',
    event_data: { title: 'Test Event' },
    remind_at: futureDate,
    sent: false
  })

  // Measure query with index
  const { data, duration } = await measureQuery(
    'reminders query',
    async () => {
      const { data } = await supabase
        .from('event_reminders')
        .select('id, user_id, event_id, remind_at, sent')
        .eq('user_id', testUserId)
        .eq('sent', false)
        .gte('remind_at', new Date().toISOString())
        .order('remind_at', { ascending: true })
        .limit(50)

      return data
    }
  )

  // Cleanup
  await supabase
    .from('event_reminders')
    .delete()
    .eq('user_id', testUserId)

  const passed = duration < 200
  results.push({
    name: 'Reminders Performance',
    passed,
    duration,
    details: `Query took ${duration}ms (target: <200ms)`
  })

  if (passed) {
    console.log(`✅ Reminders query: ${duration}ms (target: <200ms)`)
  } else {
    console.log(`⚠️ Reminders query: ${duration}ms (slower than expected)`)
  }
}

/**
 * Test 4: Query performance - Events
 */
async function testEventsPerformance() {
  console.log('\n⏱️ Test 4: Testing events query performance...')

  const { data, duration } = await measureQuery(
    'events query',
    async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('events')
        .select('id, title, venue_name, city_name, category, date, start_time, image_url')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(100)

      return data
    }
  )

  const passed = duration < 300 // Events table might be larger
  results.push({
    name: 'Events Performance',
    passed,
    duration,
    details: `Query took ${duration}ms (target: <300ms)`
  })

  if (passed) {
    console.log(`✅ Events query: ${duration}ms (target: <300ms)`)
  } else {
    console.log(`⚠️ Events query: ${duration}ms (slower than expected)`)
  }
}

/**
 * Test 5: Test cache utility
 */
async function testCacheUtility() {
  console.log('\n💾 Test 5: Testing query cache utility...')

  try {
    const { queryCache, CACHE_KEYS, CACHE_TTL } = await import('../src/lib/query-cache')

    // Test set and get
    const testKey = 'test-key'
    const testData = { value: 'test-data', timestamp: Date.now() }

    queryCache.set(testKey, testData, 10)
    const retrieved = queryCache.get(testKey)

    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      console.log('✅ Cache set/get works correctly')
      results.push({
        name: 'Cache Utility',
        passed: true,
        details: 'Cache set/get functioning correctly'
      })
    } else {
      console.log('❌ Cache set/get failed')
      results.push({
        name: 'Cache Utility',
        passed: false,
        details: 'Cache data mismatch'
      })
    }

    // Test stats
    const stats = queryCache.getStats()
    console.log(`   Cache stats: ${stats.size} entries, max ${stats.maxSize}`)

    // Cleanup
    queryCache.delete(testKey)

  } catch (error) {
    console.log('❌ Cache utility import failed:', error)
    results.push({
      name: 'Cache Utility',
      passed: false,
      details: 'Failed to import cache module'
    })
  }
}

/**
 * Test 6: Test performance monitor
 */
async function testPerformanceMonitor() {
  console.log('\n📈 Test 6: Testing performance monitor...')

  try {
    const { performanceMonitor, measureQuery } = await import('../src/lib/performance-monitor')

    // Test measurement
    const { data, duration } = await measureQuery(
      '/test',
      'test operation',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return { success: true }
      }
    )

    const stats = performanceMonitor.getStats()

    if (stats.totalQueries > 0 && duration > 0) {
      console.log('✅ Performance monitor working correctly')
      console.log(`   Total queries: ${stats.totalQueries}, Avg: ${stats.avgDuration}ms`)
      results.push({
        name: 'Performance Monitor',
        passed: true,
        details: `Tracking ${stats.totalQueries} queries, avg ${stats.avgDuration}ms`
      })
    } else {
      console.log('⚠️ Performance monitor may not be tracking correctly')
      results.push({
        name: 'Performance Monitor',
        passed: false,
        details: 'Not tracking queries correctly'
      })
    }

  } catch (error) {
    console.log('❌ Performance monitor import failed:', error)
    results.push({
      name: 'Performance Monitor',
      passed: false,
      details: 'Failed to import monitor module'
    })
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE OPTIMIZATION TEST REPORT')
  console.log('='.repeat(60))

  const totalTests = results.length
  const passedTests = results.filter(r => r.passed).length
  const failedTests = totalTests - passedTests

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`${index + 1}. ${status} ${result.name}${duration}`)
    if (result.details) {
      console.log(`   ${result.details}`)
    }
  })

  console.log('\n' + '-'.repeat(60))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)
  console.log('='.repeat(60))

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Performance optimizations are working correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Review the details above.')
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Performance Optimization Tests...')
  console.log('Testing against:', SUPABASE_URL)

  try {
    await testIndexesExist()
    await testSavedEventsPerformance()
    await testRemindersPerformance()
    await testEventsPerformance()
    await testCacheUtility()
    await testPerformanceMonitor()
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
  }

  generateReport()
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Test suite completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test suite error:', error)
    process.exit(1)
  })
