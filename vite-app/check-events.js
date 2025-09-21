import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('events').select('title, description, image_url, external_url, price_min, price_max, source').limit(5);
if (error) {
  console.error('Error:', error);
} else {
  console.log('=== SAMPLE EVENTS ===');
  data.forEach((event, i) => {
    console.log(`\n--- EVENT ${i+1} ---`);
    console.log('Title:', event.title);
    console.log('Source:', event.source);
    console.log('Description length:', event.description?.length || 'No description');
    console.log('Description preview:', event.description?.substring(0, 100) + '...');
    console.log('Has image:', !!event.image_url);
    console.log('Image URL:', event.image_url?.substring(0, 50) + '...');
    console.log('Has ticket URL:', !!event.external_url);
    console.log('Ticket URL:', event.external_url?.substring(0, 50) + '...');
    console.log('Price range:', event.price_min, '-', event.price_max);
  });
}