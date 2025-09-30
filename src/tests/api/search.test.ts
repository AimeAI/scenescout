
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

describe('API - Search Functionality', () => {

  // Test 1: Search API for Halloween events
  test('should find Halloween events via the search API', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/search-events`, {
        params: {
          q: 'halloween haunted houses',
          location: 'toronto'
        },
        timeout: 15000
      });

      const data = response.data;

      expect(data.success).toBe(true);
      expect(data.events.length).toBeGreaterThan(0);

      // Check for real venues
      const realVenues = data.events.filter(e => 
        e.source === 'verified_venue' || 
        e.venue_name.includes('Casa Loma') || 
        e.venue_name.includes('Screemers')
      );
      expect(realVenues.length).toBeGreaterThan(0);

      // Check for external links
      const withLinks = data.events.filter(e => e.external_url && e.external_url.startsWith('http'));
      expect(withLinks.length).toBeGreaterThan(0);

    } catch (error) {
      // Fail the test if the API call throws an error
      throw new Error(`API call failed: ${error.message}`);
    }
  });

  // Test 2: Search Page Load
  test('should load the main search page successfully', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/search`, { timeout: 10000 });
      expect(response.status).toBe(200);
    } catch (error) {
      throw new Error(`Search page load failed: ${error.message}`);
    }
  });
});
