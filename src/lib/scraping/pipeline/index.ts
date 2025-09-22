// Data Processing Pipeline Exports

// Main processor
export { DataProcessor } from './DataProcessor';
export type { 
  ProcessingOptions, 
  ProcessingResult, 
  ProcessedEvent, 
  BatchProcessingResult 
} from './DataProcessor';

// Individual components
export { DataCleaner } from './DataCleaner';
export type { 
  CleaningOptions, 
  CleaningResult, 
  ValidationError 
} from './DataCleaner';

export { EventNormalizer } from './EventNormalizer';
export type { 
  NormalizationOptions, 
  NormalizedEvent, 
  NormalizationResult 
} from './EventNormalizer';

export { GeocodingService } from './GeocodingService';
export type { 
  Coordinates, 
  GeocodingResult, 
  GeocodingOptions 
} from './GeocodingService';

export { CategoryClassifier } from './CategoryClassifier';
export type { 
  ClassificationResult, 
  ClassificationOptions, 
  EventData 
} from './CategoryClassifier';

export { ImageProcessor } from './ImageProcessor';
export type { 
  ImageProcessingOptions, 
  ProcessedImage, 
  ImageProcessingResult 
} from './ImageProcessor';

export { QualityScorer } from './QualityScorer';
export type { 
  QualityMetrics, 
  QualityScore, 
  ScoringOptions, 
  EventContext 
} from './QualityScorer';

// Utility function to create a configured data processor
export function createDataProcessor(options: ProcessingOptions = {}) {
  return new DataProcessor(options);
}

// Utility function to create individual components
export function createPipelineComponents(options: {
  cleaning?: CleaningOptions;
  normalization?: NormalizationOptions;
  geocoding?: GeocodingOptions;
  classification?: ClassificationOptions;
  imageProcessing?: ImageProcessingOptions;
  scoring?: ScoringOptions;
} = {}) {
  return {
    dataCleaner: new DataCleaner(options.cleaning),
    eventNormalizer: new EventNormalizer(options.normalization),
    geocodingService: new GeocodingService(options.geocoding),
    categoryClassifier: new CategoryClassifier(options.classification),
    imageProcessor: new ImageProcessor(options.imageProcessing),
    qualityScorer: new QualityScorer(options.scoring)
  };
}

// Export all types
export type {
  ProcessingOptions,
  ProcessingResult,
  ProcessedEvent,
  BatchProcessingResult,
  CleaningOptions,
  CleaningResult,
  ValidationError,
  NormalizationOptions,
  NormalizedEvent,
  NormalizationResult,
  Coordinates,
  GeocodingResult,
  GeocodingOptions,
  ClassificationResult,
  ClassificationOptions,
  EventData,
  ImageProcessingOptions,
  ProcessedImage,
  ImageProcessingResult,
  QualityMetrics,
  QualityScore,
  ScoringOptions,
  EventContext
} from './DataProcessor';