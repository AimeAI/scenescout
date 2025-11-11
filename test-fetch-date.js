const axios = require('axios');
const cheerio = require('cheerio');

async function fetchEventPageDate(eventUrl) {
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)

    // Extract from meta tag: <meta property="event:start_time" content="2026-08-25T09:00:00-04:00">
    const startTimeMeta = $('meta[property="event:start_time"]').attr('content')
    console.log('startTimeMeta:', startTimeMeta)

    if (startTimeMeta) {
      const eventDate = new Date(startTimeMeta)
      if (!isNaN(eventDate.getTime())) {
        const date = eventDate.toISOString().split('T')[0]
        const time = eventDate.toISOString().split('T')[1].substring(0, 8)
        console.log('Parsed date:', date, time)
        return { date, time }
      }
    }

    return null
  } catch (error) {
    console.error(`Failed to fetch event page: ${error.message}`)
    return null
  }
}

fetchEventPageDate('https://www.eventbrite.com/e/future-world-expo-toronto-tickets-1502956386009')
  .then(result => console.log('RESULT:', result))
