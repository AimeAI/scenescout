import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key)

async function testSaveFlow() {
  console.log('🧪 Testing save flow...\n')

  // Check saved_events table
  const { data: savedEvents, error: savedError } = await supabase
    .from('saved_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (savedError) {
    console.error('❌ Error querying saved_events:', savedError.message)
  } else {
    console.log(`✅ saved_events table: ${savedEvents?.length || 0} events`)
    if (savedEvents && savedEvents.length > 0) {
      console.log('\n📋 Recent saved events:')
      savedEvents.forEach(event => {
        console.log(`  - ${event.event_data.title} (${event.event_id})`)
        console.log(`    User: ${event.user_id}, Saved: ${new Date(event.created_at).toLocaleString()}`)
      })
    }
  }

  console.log('\n---\n')

  // Check event_reminders table
  const { data: reminders, error: reminderError } = await supabase
    .from('event_reminders')
    .select('*')
    .order('remind_at', { ascending: true })
    .limit(10)

  if (reminderError) {
    console.error('❌ Error querying event_reminders:', reminderError.message)
  } else {
    console.log(`✅ event_reminders table: ${reminders?.length || 0} reminders`)
    if (reminders && reminders.length > 0) {
      console.log('\n📅 Upcoming reminders:')
      reminders.forEach(reminder => {
        const remindDate = new Date(reminder.remind_at)
        const eventTitle = reminder.event_data.title
        console.log(`  - ${eventTitle}`)
        console.log(`    Remind at: ${remindDate.toLocaleString()}`)
        console.log(`    Sent: ${reminder.sent ? 'Yes' : 'No'}`)
      })
    }
  }

  console.log('\n---\n')

  // Check push_subscriptions table
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, created_at, last_used_at')

  if (subError) {
    console.error('❌ Error querying push_subscriptions:', subError.message)
  } else {
    console.log(`✅ push_subscriptions table: ${subscriptions?.length || 0} subscriptions`)
    if (subscriptions && subscriptions.length > 0) {
      console.log('\n📬 Active subscriptions:')
      subscriptions.forEach(sub => {
        console.log(`  - User: ${sub.user_id}`)
        console.log(`    Created: ${new Date(sub.created_at).toLocaleString()}`)
        console.log(`    Last used: ${new Date(sub.last_used_at).toLocaleString()}`)
      })
    }
  }

  console.log('\n✅ Test complete!')
}

testSaveFlow()
