import { promises as fs } from 'fs';
import path from 'path';
import { VenueConfiguration, ChainConfiguration } from '../types/venue';
import { VENUE_CONFIGURATIONS, CHAIN_CONFIGURATIONS } from './venue-configs';

export interface ConfigurationManager {
  loadVenueConfigs(): Promise<VenueConfiguration[]>;
  loadChainConfigs(): Promise<ChainConfiguration[]>;
  saveVenueConfig(config: VenueConfiguration): Promise<void>;
  deleteVenueConfig(venueId: string): Promise<void>;
  addVenueLocation(venueId: string, location: any): Promise<void>;
  updateVenueConfig(venueId: string, updates: Partial<VenueConfiguration>): Promise<void>;
  validateConfig(config: VenueConfiguration): Promise<string[]>;
  exportConfigs(filePath: string): Promise<void>;
  importConfigs(filePath: string): Promise<void>;
}

export class FileConfigurationManager implements ConfigurationManager {
  private configDir: string;
  private venueConfigsCache: VenueConfiguration[] | null = null;
  private chainConfigsCache: ChainConfiguration[] | null = null;

  constructor(configDir: string = './config/venues') {
    this.configDir = configDir;
  }

  /**
   * Load venue configurations from files or default config
   */
  public async loadVenueConfigs(): Promise<VenueConfiguration[]> {
    if (this.venueConfigsCache) {
      return this.venueConfigsCache;
    }

    try {
      await fs.access(this.configDir);
      
      const files = await fs.readdir(this.configDir);
      const venueFiles = files.filter(file => 
        file.endsWith('.json') && !file.startsWith('chain-')
      );

      const configs: VenueConfiguration[] = [];

      for (const file of venueFiles) {
        try {
          const filePath = path.join(this.configDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const config = JSON.parse(content) as VenueConfiguration;
          
          // Validate configuration
          const errors = await this.validateConfig(config);
          if (errors.length === 0) {
            configs.push(config);
          } else {
            console.warn(`Invalid config in ${file}:`, errors);
          }
        } catch (error) {
          console.warn(`Failed to load config from ${file}:`, error);
        }
      }

      this.venueConfigsCache = configs.length > 0 ? configs : VENUE_CONFIGURATIONS;
      return this.venueConfigsCache;

    } catch (error) {
      // Config directory doesn't exist, use defaults
      this.venueConfigsCache = VENUE_CONFIGURATIONS;
      return this.venueConfigsCache;
    }
  }

  /**
   * Load chain configurations from files or default config
   */
  public async loadChainConfigs(): Promise<ChainConfiguration[]> {
    if (this.chainConfigsCache) {
      return this.chainConfigsCache;
    }

    try {
      await fs.access(this.configDir);
      
      const files = await fs.readdir(this.configDir);
      const chainFiles = files.filter(file => 
        file.startsWith('chain-') && file.endsWith('.json')
      );

      const configs: ChainConfiguration[] = [];

      for (const file of chainFiles) {
        try {
          const filePath = path.join(this.configDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const config = JSON.parse(content) as ChainConfiguration;
          configs.push(config);
        } catch (error) {
          console.warn(`Failed to load chain config from ${file}:`, error);
        }
      }

      this.chainConfigsCache = configs.length > 0 ? configs : CHAIN_CONFIGURATIONS;
      return this.chainConfigsCache;

    } catch (error) {
      // Config directory doesn't exist, use defaults
      this.chainConfigsCache = CHAIN_CONFIGURATIONS;
      return this.chainConfigsCache;
    }
  }

  /**
   * Save a venue configuration to file
   */
  public async saveVenueConfig(config: VenueConfiguration): Promise<void> {
    // Validate before saving
    const errors = await this.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }

    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    const filePath = path.join(this.configDir, `${config.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));

    // Update cache
    if (this.venueConfigsCache) {
      const index = this.venueConfigsCache.findIndex(c => c.id === config.id);
      if (index >= 0) {
        this.venueConfigsCache[index] = config;
      } else {
        this.venueConfigsCache.push(config);
      }
    }
  }

  /**
   * Delete a venue configuration
   */
  public async deleteVenueConfig(venueId: string): Promise<void> {
    const filePath = path.join(this.configDir, `${venueId}.json`);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, which is fine
    }

    // Update cache
    if (this.venueConfigsCache) {
      this.venueConfigsCache = this.venueConfigsCache.filter(c => c.id !== venueId);
    }
  }

  /**
   * Add a location to an existing venue configuration
   */
  public async addVenueLocation(venueId: string, location: any): Promise<void> {
    const configs = await this.loadVenueConfigs();
    const config = configs.find(c => c.id === venueId);
    
    if (!config) {
      throw new Error(`Venue configuration not found: ${venueId}`);
    }

    // Check if location ID already exists
    if (config.locations.some(l => l.id === location.id)) {
      throw new Error(`Location ID already exists: ${location.id}`);
    }

    config.locations.push(location);
    await this.saveVenueConfig(config);
  }

  /**
   * Update an existing venue configuration
   */
  public async updateVenueConfig(
    venueId: string, 
    updates: Partial<VenueConfiguration>
  ): Promise<void> {
    const configs = await this.loadVenueConfigs();
    const config = configs.find(c => c.id === venueId);
    
    if (!config) {
      throw new Error(`Venue configuration not found: ${venueId}`);
    }

    const updatedConfig = { ...config, ...updates };
    await this.saveVenueConfig(updatedConfig);
  }

  /**
   * Validate a venue configuration
   */
  public async validateConfig(config: VenueConfiguration): Promise<string[]> {
    const errors: string[] = [];

    // Required fields
    if (!config.id || config.id.trim().length === 0) {
      errors.push('ID is required');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!config.baseUrl || !this.isValidUrl(config.baseUrl)) {
      errors.push('Valid base URL is required');
    }

    if (!config.locations || config.locations.length === 0) {
      errors.push('At least one location is required');
    }

    // Validate locations
    config.locations?.forEach((location, index) => {
      if (!location.id || location.id.trim().length === 0) {
        errors.push(`Location ${index}: ID is required`);
      }

      if (!location.url || !this.isValidUrl(location.url)) {
        errors.push(`Location ${index}: Valid URL is required`);
      }

      if (!location.city || location.city.trim().length === 0) {
        errors.push(`Location ${index}: City is required`);
      }

      if (!location.country || location.country.trim().length === 0) {
        errors.push(`Location ${index}: Country is required`);
      }
    });

    // Validate scrape configuration
    if (!config.scrapeConfig) {
      errors.push('Scrape configuration is required');
    } else {
      if (!config.scrapeConfig.listingSelectors) {
        errors.push('Listing selectors are required');
      } else {
        if (!config.scrapeConfig.listingSelectors.container) {
          errors.push('Container selector is required');
        }
        if (!config.scrapeConfig.listingSelectors.eventItem) {
          errors.push('Event item selector is required');
        }
      }

      if (!config.scrapeConfig.eventSelectors) {
        errors.push('Event selectors are required');
      } else {
        if (!config.scrapeConfig.eventSelectors.title) {
          errors.push('Title selector is required');
        }
        if (!config.scrapeConfig.eventSelectors.date) {
          errors.push('Date selector is required');
        }
      }

      if (!config.scrapeConfig.rateLimit) {
        errors.push('Rate limit configuration is required');
      } else {
        if (config.scrapeConfig.rateLimit.requestsPerMinute <= 0) {
          errors.push('Requests per minute must be positive');
        }
        if (config.scrapeConfig.rateLimit.delayBetweenRequests < 0) {
          errors.push('Delay between requests must be non-negative');
        }
      }
    }

    return errors;
  }

  /**
   * Export all configurations to a file
   */
  public async exportConfigs(filePath: string): Promise<void> {
    const venueConfigs = await this.loadVenueConfigs();
    const chainConfigs = await this.loadChainConfigs();

    const exportData = {
      venues: venueConfigs,
      chains: chainConfigs,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Import configurations from a file
   */
  public async importConfigs(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(content);

    if (!importData.venues || !Array.isArray(importData.venues)) {
      throw new Error('Invalid import file: venues array is required');
    }

    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Import venue configurations
    for (const config of importData.venues) {
      const errors = await this.validateConfig(config);
      if (errors.length === 0) {
        await this.saveVenueConfig(config);
      } else {
        console.warn(`Skipping invalid venue config ${config.id}:`, errors);
      }
    }

    // Import chain configurations if present
    if (importData.chains && Array.isArray(importData.chains)) {
      for (const config of importData.chains) {
        const filePath = path.join(this.configDir, `chain-${config.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(config, null, 2));
      }
    }

    // Clear caches to force reload
    this.venueConfigsCache = null;
    this.chainConfigsCache = null;
  }

  /**
   * Get configuration statistics
   */
  public async getStats(): Promise<{
    totalVenues: number;
    totalLocations: number;
    venuesByType: Record<string, number>;
    enabledVenues: number;
    totalChains: number;
  }> {
    const venueConfigs = await this.loadVenueConfigs();
    const chainConfigs = await this.loadChainConfigs();

    const totalLocations = venueConfigs.reduce((sum, config) => 
      sum + config.locations.length, 0
    );

    const venuesByType = venueConfigs.reduce((acc, config) => {
      acc[config.type] = (acc[config.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const enabledVenues = venueConfigs.filter(c => c.enabled).length;

    return {
      totalVenues: venueConfigs.length,
      totalLocations,
      venuesByType,
      enabledVenues,
      totalChains: chainConfigs.length
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Default configuration manager instance
export const configManager = new FileConfigurationManager();

// Helper functions for common operations
export async function addNewVenue(config: VenueConfiguration): Promise<void> {
  return configManager.saveVenueConfig(config);
}

export async function updateVenue(
  venueId: string, 
  updates: Partial<VenueConfiguration>
): Promise<void> {
  return configManager.updateVenueConfig(venueId, updates);
}

export async function removeVenue(venueId: string): Promise<void> {
  return configManager.deleteVenueConfig(venueId);
}

export async function getAllVenueConfigs(): Promise<VenueConfiguration[]> {
  return configManager.loadVenueConfigs();
}

export async function getVenueConfig(venueId: string): Promise<VenueConfiguration | null> {
  const configs = await configManager.loadVenueConfigs();
  return configs.find(c => c.id === venueId) || null;
}

/**
 * Create a new venue configuration template
 */
export function createVenueTemplate(
  id: string,
  name: string,
  type: string,
  baseUrl: string
): VenueConfiguration {
  return {
    id,
    name,
    type: type as any,
    baseUrl,
    enabled: true,
    priority: 5,
    locations: [],
    scrapeConfig: {
      listingSelectors: {
        container: '.events, .shows, .calendar',
        eventItem: '.event, .show, .event-item'
      },
      eventSelectors: {
        title: ['.title', '.event-title', 'h2', 'h3'],
        date: ['.date', '.event-date', '[data-date]']
      },
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      },
      javascript: false
    },
    fallbacks: []
  };
}

/**
 * Create a location template
 */
export function createLocationTemplate(
  id: string,
  city: string,
  state: string,
  country: string,
  url: string
): any {
  return {
    id,
    city,
    state,
    country,
    url
  };
}