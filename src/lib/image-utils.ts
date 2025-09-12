// Helper function to generate optimized image URLs
export function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number
    quality?: number
  } = {}
): string {
  const { width, quality = 75 } = options
  
  const params = new URLSearchParams({
    url: originalUrl,
    q: quality.toString(),
  })
  
  if (width) {
    params.set('w', width.toString())
  }
  
  return `/api/img?${params.toString()}`
}