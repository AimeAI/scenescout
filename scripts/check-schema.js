const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  try {
    // Try to get existing events to see the actual schema
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('Existing event columns:', Object.keys(data[0]))
    } else {
      console.log('No events found, checking table info...')
      
      // Try a simple insert to see what columns are expected
      const { error: insertError } = await supabase
        .from('events')
        .insert([{ name: 'test' }])
      
      console.log('Insert error (shows required columns):', insertError)
    }
    
  } catch (error) {
    console.error('Schema check failed:', error)
  }
}

checkSchema()
