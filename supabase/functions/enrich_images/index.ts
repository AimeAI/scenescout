import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface ImageAnalysisResult {
  description: string;
  tags: string[];
  color_palette: string[];
  objects: string[];
  text_content: string[];
  mood: string;
  style: string;
  quality_score: number;
  is_appropriate: boolean;
  confidence: number;
}

interface EnhancedImage {
  original_url: string;
  enhanced_url?: string;
  thumbnail_url?: string;
  alt_text: string;
  analysis: ImageAnalysisResult;
  enhancement_applied: boolean;
  processing_time_ms: number;
}

/**
 * Analyze image using OpenAI Vision API
 */
async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this event/venue image and provide a detailed analysis in JSON format with the following structure:
{
  "description": "A detailed description of what's shown in the image",
  "tags": ["relevant", "tags", "for", "the", "image"],
  "color_palette": ["dominant", "colors", "in", "hex"],
  "objects": ["main", "objects", "visible"],
  "text_content": ["any", "text", "visible", "in", "image"],
  "mood": "overall mood (energetic, calm, festive, etc.)",
  "style": "visual style (modern, vintage, artistic, etc.)",
  "quality_score": 85,
  "is_appropriate": true,
  "confidence": 95
}

Focus on event-relevant details like atmosphere, crowd, lighting, venue features, activities, and overall vibe. Rate quality_score 0-100, is_appropriate (safe for all audiences), and confidence 0-100.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No analysis content received from OpenAI');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from OpenAI response');
    }

    const analysis: ImageAnalysisResult = JSON.parse(jsonMatch[0]);
    
    // Validate required fields and provide defaults
    return {
      description: analysis.description || 'Event or venue image',
      tags: Array.isArray(analysis.tags) ? analysis.tags : [],
      color_palette: Array.isArray(analysis.color_palette) ? analysis.color_palette : [],
      objects: Array.isArray(analysis.objects) ? analysis.objects : [],
      text_content: Array.isArray(analysis.text_content) ? analysis.text_content : [],
      mood: analysis.mood || 'neutral',
      style: analysis.style || 'unknown',
      quality_score: typeof analysis.quality_score === 'number' ? analysis.quality_score : 50,
      is_appropriate: typeof analysis.is_appropriate === 'boolean' ? analysis.is_appropriate : true,
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 50
    };

  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    // Return basic fallback analysis
    return {
      description: 'Event or venue image',
      tags: [],
      color_palette: [],
      objects: [],
      text_content: [],
      mood: 'neutral',
      style: 'unknown',
      quality_score: 50,
      is_appropriate: true,
      confidence: 0
    };
  }
}

/**
 * Enhance image using AI upscaling service (placeholder for actual service)
 */
async function enhanceImage(imageUrl: string): Promise<{ enhanced_url: string; thumbnail_url: string } | null> {
  // This is a placeholder for image enhancement services like:
  // - Real-ESRGAN for upscaling
  // - Cloudinary for automatic enhancement
  // - Adobe Creative SDK
  // - Custom AI models
  
  try {
    // For now, we'll use Cloudinary transformations as an example
    const cloudinaryCloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    if (!cloudinaryCloudName) {
      console.log('Cloudinary not configured, skipping enhancement');
      return null;
    }

    // Extract image ID/path from URL for processing
    const imageId = encodeURIComponent(imageUrl);
    
    // Generate enhanced and thumbnail URLs using Cloudinary transformations
    const enhanced_url = `https://res.cloudinary.com/${cloudinaryCloudName}/image/fetch/q_auto:best,f_auto,dpr_2.0,w_1200,h_800,c_fill,g_auto/${imageUrl}`;
    const thumbnail_url = `https://res.cloudinary.com/${cloudinaryCloudName}/image/fetch/q_auto:good,f_auto,w_300,h_200,c_fill,g_auto/${imageUrl}`;

    return {
      enhanced_url,
      thumbnail_url
    };

  } catch (error) {
    console.error('Error enhancing image:', error);
    return null;
  }
}

/**
 * Generate alt text for accessibility
 */
function generateAltText(analysis: ImageAnalysisResult, eventTitle?: string): string {
  let altText = '';

  if (eventTitle) {
    altText += `Image for ${eventTitle}. `;
  }

  altText += analysis.description;

  // Add mood and style context
  if (analysis.mood !== 'neutral') {
    altText += ` The image has a ${analysis.mood} atmosphere`;
  }

  // Limit length for accessibility
  if (altText.length > 125) {
    altText = altText.substring(0, 122) + '...';
  }

  return altText;
}

/**
 * Rate limiting for AI API calls
 */
class AIRateLimit {
  private requests: number[] = [];
  private maxRequestsPerMinute = 60; // Adjust based on your OpenAI plan
  private windowMs = 60 * 1000;

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`AI rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimit = new AIRateLimit();

/**
 * Supabase Edge Function for AI image analysis and enhancement
 * Analyzes event images using AI to extract metadata, enhance quality, and generate alt text
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request parameters
    const url = new URL(req.url);
    const method = req.method;

    if (method === 'POST') {
      // Process specific image(s)
      const { image_urls, event_id, venue_id } = await req.json();
      
      if (!image_urls || !Array.isArray(image_urls)) {
        return new Response(
          JSON.stringify({ error: 'image_urls array is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const results = [];

      for (const imageUrl of image_urls) {
        try {
          const startTime = Date.now();
          
          // Apply rate limiting
          await rateLimit.waitIfNeeded();

          // Analyze image with AI
          console.log(`Analyzing image: ${imageUrl}`);
          const analysis = await analyzeImage(imageUrl);

          // Enhance image if quality is low or if requested
          let enhanced_url = null;
          let thumbnail_url = null;
          let enhancement_applied = false;

          if (analysis.quality_score < 70 || url.searchParams.get('enhance') === 'true') {
            const enhancement = await enhanceImage(imageUrl);
            if (enhancement) {
              enhanced_url = enhancement.enhanced_url;
              thumbnail_url = enhancement.thumbnail_url;
              enhancement_applied = true;
            }
          }

          // Generate alt text
          const eventTitle = event_id ? `Event ${event_id}` : venue_id ? `Venue ${venue_id}` : undefined;
          const alt_text = generateAltText(analysis, eventTitle);

          const result: EnhancedImage = {
            original_url: imageUrl,
            enhanced_url,
            thumbnail_url,
            alt_text,
            analysis,
            enhancement_applied,
            processing_time_ms: Date.now() - startTime
          };

          results.push(result);

          // Store results in database if event_id or venue_id provided
          if (event_id) {
            await supabase
              .from('event_images')
              .upsert({
                event_id,
                original_url: imageUrl,
                enhanced_url,
                thumbnail_url,
                alt_text,
                analysis_data: analysis,
                enhancement_applied,
                processed_at: new Date().toISOString()
              }, { 
                onConflict: 'event_id,original_url' 
              });
          }

          if (venue_id) {
            await supabase
              .from('venue_images')
              .upsert({
                venue_id,
                original_url: imageUrl,
                enhanced_url,
                thumbnail_url,
                alt_text,
                analysis_data: analysis,
                enhancement_applied,
                processed_at: new Date().toISOString()
              }, { 
                onConflict: 'venue_id,original_url' 
              });
          }

          console.log(`✅ Processed image ${imageUrl} in ${Date.now() - startTime}ms`);

        } catch (error) {
          console.error(`Error processing image ${imageUrl}:`, error);
          results.push({
            original_url: imageUrl,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          results
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else if (method === 'GET') {
      // Process batch of unprocessed images from database
      const batchSize = parseInt(url.searchParams.get('batch_size') || '10');
      const processEvents = url.searchParams.get('events') !== 'false';
      const processVenues = url.searchParams.get('venues') !== 'false';

      const results = {
        events_processed: 0,
        venues_processed: 0,
        total_images: 0,
        errors: [] as string[]
      };

      // Process event images
      if (processEvents) {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, title, image_url')
          .not('image_url', 'is', null)
          .is('image_processed', null)
          .limit(batchSize);

        if (eventsError) {
          console.error('Error fetching events for image processing:', eventsError);
        } else if (events) {
          for (const event of events) {
            try {
              await rateLimit.waitIfNeeded();

              const analysis = await analyzeImage(event.image_url);
              const enhancement = await enhanceImage(event.image_url);
              const alt_text = generateAltText(analysis, event.title);

              // Update event with processed image data
              await supabase
                .from('events')
                .update({
                  image_alt_text: alt_text,
                  image_analysis: analysis,
                  image_enhanced_url: enhancement?.enhanced_url || null,
                  image_thumbnail_url: enhancement?.thumbnail_url || null,
                  image_processed: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', event.id);

              results.events_processed++;
              results.total_images++;

              console.log(`Processed image for event: ${event.title}`);

            } catch (error) {
              console.error(`Error processing event ${event.id} image:`, error);
              results.errors.push(`Event ${event.id}: ${error.message}`);

              // Mark as processed even if failed to avoid reprocessing
              await supabase
                .from('events')
                .update({
                  image_processed: true,
                  image_alt_text: `Image for ${event.title}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', event.id);
            }
          }
        }
      }

      // Process venue images
      if (processVenues) {
        const { data: venues, error: venuesError } = await supabase
          .from('venues')
          .select('id, name, photos')
          .not('photos', 'is', null)
          .is('images_processed', null)
          .limit(batchSize);

        if (venuesError) {
          console.error('Error fetching venues for image processing:', venuesError);
        } else if (venues) {
          for (const venue of venues) {
            try {
              const photos = venue.photos || [];
              if (photos.length === 0) continue;

              // Process first photo as main image
              const mainPhoto = photos[0];
              if (mainPhoto && mainPhoto.url) {
                await rateLimit.waitIfNeeded();

                const analysis = await analyzeImage(mainPhoto.url);
                const enhancement = await enhanceImage(mainPhoto.url);
                const alt_text = generateAltText(analysis, venue.name);

                // Update venue with processed image data
                const updatedPhotos = photos.map((photo, index) => {
                  if (index === 0) {
                    return {
                      ...photo,
                      alt_text,
                      analysis,
                      enhanced_url: enhancement?.enhanced_url || photo.url,
                      thumbnail_url: enhancement?.thumbnail_url || photo.url
                    };
                  }
                  return photo;
                });

                await supabase
                  .from('venues')
                  .update({
                    photos: updatedPhotos,
                    images_processed: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', venue.id);

                results.venues_processed++;
                results.total_images++;

                console.log(`Processed main image for venue: ${venue.name}`);
              }

            } catch (error) {
              console.error(`Error processing venue ${venue.id} images:`, error);
              results.errors.push(`Venue ${venue.id}: ${error.message}`);

              // Mark as processed even if failed
              await supabase
                .from('venues')
                .update({
                  images_processed: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', venue.id);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          ...results
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in enrich_images function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});