// Configuration exports
export * from './venue-configs';
export * from './config-loader';

// Types
export * from '../types/venue';

// Main scraper
export * from '../sources/venues';

// Parser
export * from '../parsers/adaptive-parser';

// Convenience re-exports for easy imports
export {
  VenueScraper,
  scrapeVenue,
  scrapeAllVenues,
  scrapeByCity,
  scrapeByType
} from '../sources/venues';

export {
  configManager,
  addNewVenue,
  updateVenue,
  removeVenue,
  getAllVenueConfigs,
  getVenueConfig,
  createVenueTemplate,
  createLocationTemplate
} from './config-loader';

export {
  VENUE_CONFIGURATIONS,
  CHAIN_CONFIGURATIONS,
  getVenueConfig as getStaticVenueConfig,
  getChainConfig,
  getVenuesByType,
  getVenuesByCity,
  getAllEnabledVenues
} from './venue-configs';