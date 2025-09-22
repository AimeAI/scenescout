import { logger } from '@/lib/utils/logger';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  generateThumbnails?: boolean;
  thumbnailSizes?: Array<{ width: number; height: number; suffix: string }>;
  watermark?: {
    enabled: boolean;
    text?: string;
    opacity?: number;
  };
}

export interface ProcessedImage {
  originalUrl: string;
  processedUrl?: string;
  thumbnails?: Array<{
    url: string;
    width: number;
    height: number;
    size: number;
  }>;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    aspectRatio: number;
  };
  processing: {
    compressed: boolean;
    resized: boolean;
    optimized: boolean;
    watermarked: boolean;
  };
}

export interface ImageProcessingResult {
  images: ProcessedImage[];
  totalSizeBefore: number;
  totalSizeAfter: number;
  compressionRatio: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  channels: number;
}

export class ImageProcessor {
  private supabase?: any;
  
  private readonly defaultOptions: ImageProcessingOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp',
    generateThumbnails: true,
    thumbnailSizes: [
      { width: 150, height: 150, suffix: 'thumb' },
      { width: 400, height: 300, suffix: 'medium' },
      { width: 800, height: 600, suffix: 'large' }
    ],
    watermark: {
      enabled: false,
      opacity: 0.3
    }
  };

  constructor(private options: ImageProcessingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    
    // Initialize Supabase if credentials are available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }
  }

  async processImages(imageUrls: string[]): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedImages: ProcessedImage[] = [];
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    logger.info('Starting image processing', { count: imageUrls.length });

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      try {
        const result = await this.processImage(imageUrl, i);
        processedImages.push(result.image);
        totalSizeBefore += result.sizeBefore;
        totalSizeAfter += result.sizeAfter;
        warnings.push(...result.warnings);
      } catch (error) {
        const errorMessage = `Failed to process image ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        logger.error(errorMessage, error);
        
        // Add a basic entry for failed image
        processedImages.push({
          originalUrl: imageUrl,
          metadata: {
            width: 0,
            height: 0,
            format: 'unknown',
            size: 0,
            aspectRatio: 0
          },
          processing: {
            compressed: false,
            resized: false,
            optimized: false,
            watermarked: false
          }
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const compressionRatio = totalSizeBefore > 0 ? (totalSizeBefore - totalSizeAfter) / totalSizeBefore : 0;

    logger.info('Image processing completed', {
      processedCount: processedImages.length,
      errorsCount: errors.length,
      totalSizeBefore,
      totalSizeAfter,
      compressionRatio: Math.round(compressionRatio * 100),
      processingTime
    });

    return {
      images: processedImages,
      totalSizeBefore,
      totalSizeAfter,
      compressionRatio,
      processingTime,
      errors,
      warnings
    };
  }

  private async processImage(imageUrl: string, index: number): Promise<{
    image: ProcessedImage;
    sizeBefore: number;
    sizeAfter: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Download the image
    const imageBuffer = await this.downloadImage(imageUrl);
    const originalSize = imageBuffer.length;
    
    // Get metadata
    const metadata = await this.getImageMetadata(imageBuffer);
    
    // Check if processing is needed
    const needsProcessing = this.needsProcessing(metadata);
    
    let processedBuffer = imageBuffer;
    let processedUrl: string | undefined;
    let thumbnails: ProcessedImage['thumbnails'] = [];
    const processing = {
      compressed: false,
      resized: false,
      optimized: false,
      watermarked: false
    };

    if (needsProcessing) {
      // Optimize the main image
      const optimizeResult = await this.optimizeImage(imageBuffer, metadata);
      processedBuffer = optimizeResult.buffer;
      processing.compressed = optimizeResult.compressed;
      processing.resized = optimizeResult.resized;
      processing.optimized = true;
      
      // Add watermark if enabled
      if (this.options.watermark?.enabled) {
        processedBuffer = await this.addWatermark(processedBuffer);
        processing.watermarked = true;
      }
      
      // Upload processed image
      if (this.supabase) {
        processedUrl = await this.uploadImage(processedBuffer, `processed_${index}.${this.options.format}`);
      } else {
        warnings.push('No Supabase configuration, processed image not uploaded');
      }
    }

    // Generate thumbnails if enabled
    if (this.options.generateThumbnails && this.options.thumbnailSizes) {
      thumbnails = await this.generateThumbnails(processedBuffer || imageBuffer, index);
    }

    // Update metadata for processed image
    const finalMetadata = processedBuffer !== imageBuffer ? 
      await this.getImageMetadata(processedBuffer) : metadata;

    return {
      image: {
        originalUrl: imageUrl,
        processedUrl,
        thumbnails,
        metadata: finalMetadata,
        processing
      },
      sizeBefore: originalSize,
      sizeAfter: processedBuffer.length,
      warnings
    };
  }

  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SceneScout/1.0 ImageProcessor'
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      throw new Error(`Failed to download image from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        channels: metadata.channels || 0
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private needsProcessing(metadata: ImageMetadata): boolean {
    const { maxWidth = 1920, maxHeight = 1080, format = 'webp' } = this.options;
    
    // Check if image is too large
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      return true;
    }
    
    // Check if format conversion is needed
    if (metadata.format !== format && format !== 'png') {
      return true;
    }
    
    // Check if file size is too large (>2MB)
    if (metadata.size > 2 * 1024 * 1024) {
      return true;
    }
    
    return false;
  }

  private async optimizeImage(buffer: Buffer, metadata: ImageMetadata): Promise<{
    buffer: Buffer;
    compressed: boolean;
    resized: boolean;
  }> {
    let image = sharp(buffer);
    let compressed = false;
    let resized = false;
    
    const { maxWidth = 1920, maxHeight = 1080, quality = 80, format = 'webp' } = this.options;
    
    // Resize if necessary
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
      resized = true;
    }
    
    // Convert format and compress
    switch (format) {
      case 'webp':
        image = image.webp({ quality });
        compressed = true;
        break;
      case 'jpeg':
        image = image.jpeg({ quality, mozjpeg: true });
        compressed = true;
        break;
      case 'png':
        image = image.png({ compressionLevel: 9 });
        compressed = metadata.format !== 'png';
        break;
    }
    
    // Apply additional optimizations
    image = image.removeMetadata(); // Remove EXIF data
    
    const optimizedBuffer = await image.toBuffer();
    
    return {
      buffer: optimizedBuffer,
      compressed,
      resized
    };
  }

  private async addWatermark(buffer: Buffer): Promise<Buffer> {
    try {
      const { watermark } = this.options;
      if (!watermark?.enabled) return buffer;
      
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (watermark.text) {
        // Create text watermark
        const fontSize = Math.max(20, Math.min(60, (metadata.width || 800) / 20));
        const textSvg = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <text x="50%" y="95%" 
                  font-family="Arial, sans-serif" 
                  font-size="${fontSize}" 
                  fill="white" 
                  fill-opacity="${watermark.opacity || 0.3}" 
                  text-anchor="middle" 
                  dominant-baseline="baseline">
              ${watermark.text}
            </text>
          </svg>
        `;
        
        return await image
          .composite([
            {
              input: Buffer.from(textSvg),
              top: 0,
              left: 0
            }
          ])
          .toBuffer();
      }
      
      return buffer;
    } catch (error) {
      logger.warn('Failed to add watermark:', error);
      return buffer; // Return original if watermarking fails
    }
  }

  private async generateThumbnails(buffer: Buffer, index: number): Promise<ProcessedImage['thumbnails']> {
    const thumbnails: ProcessedImage['thumbnails'] = [];
    
    if (!this.options.thumbnailSizes) return thumbnails;
    
    for (const size of this.options.thumbnailSizes) {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 75 })
          .toBuffer();
        
        let thumbnailUrl: string | undefined;
        
        if (this.supabase) {
          thumbnailUrl = await this.uploadImage(
            thumbnailBuffer, 
            `thumbnail_${index}_${size.suffix}.webp`
          );
        }
        
        if (thumbnailUrl) {
          thumbnails.push({
            url: thumbnailUrl,
            width: size.width,
            height: size.height,
            size: thumbnailBuffer.length
          });
        }
      } catch (error) {
        logger.warn(`Failed to generate ${size.suffix} thumbnail:`, error);
      }
    }
    
    return thumbnails;
  }

  private async uploadImage(buffer: Buffer, fileName: string): Promise<string | undefined> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    try {
      const { data, error } = await this.supabase.storage
        .from('event-images')
        .upload(`processed/${fileName}`, buffer, {
          contentType: `image/${this.options.format}`,
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('event-images')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      logger.error('Failed to upload image to Supabase:', error);
      return undefined;
    }
  }

  // Utility method to validate image URLs
  async validateImageUrl(url: string): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: {
      size: number;
      type: string;
    };
  }> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        return {
          valid: false,
          reason: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      if (!contentType || !contentType.startsWith('image/')) {
        return {
          valid: false,
          reason: `Invalid content type: ${contentType}`
        };
      }
      
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      
      // Check file size (max 10MB)
      if (size > 10 * 1024 * 1024) {
        return {
          valid: false,
          reason: `File too large: ${Math.round(size / 1024 / 1024)}MB`
        };
      }
      
      return {
        valid: true,
        metadata: {
          size,
          type: contentType
        }
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Batch validate image URLs
  async validateImageUrls(urls: string[]): Promise<Array<{
    url: string;
    valid: boolean;
    reason?: string;
  }>> {
    const validationPromises = urls.map(async (url) => {
      const result = await this.validateImageUrl(url);
      return {
        url,
        valid: result.valid,
        reason: result.reason
      };
    });
    
    return Promise.all(validationPromises);
  }

  // Get processing statistics
  getProcessingStats(): {
    supportedFormats: string[];
    maxDimensions: { width: number; height: number };
    compressionQuality: number;
    thumbnailSizes: Array<{ width: number; height: number }>;
  } {
    return {
      supportedFormats: ['webp', 'jpeg', 'png'],
      maxDimensions: {
        width: this.options.maxWidth || 1920,
        height: this.options.maxHeight || 1080
      },
      compressionQuality: this.options.quality || 80,
      thumbnailSizes: (this.options.thumbnailSizes || []).map(size => ({
        width: size.width,
        height: size.height
      }))
    };
  }
}