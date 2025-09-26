import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  const width = searchParams.get('w')
  const quality = searchParams.get('q') || '75'

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
  }

  try {
    // Validate that the URL is from an allowed domain
    const allowedDomains = [
      'images.unsplash.com',
      'cdn.scenescout.com',
      'res.cloudinary.com',
      // Add your CDN domains here
    ]

    const urlObj = new URL(imageUrl)
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowedDomain) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'SceneScout/1.0',
      },
      // Add cache control
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type')
    
    // Validate content type
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    const imageBuffer = await response.arrayBuffer()

    // TODO: Implement image optimization using Sharp or similar
    // For now, we'll just proxy the image
    
    // If width is specified, you could resize the image here
    // const sharp = require('sharp')
    // let processedImage = sharp(imageBuffer)
    // 
    // if (width) {
    //   processedImage = processedImage.resize(parseInt(width), null, {
    //     withoutEnlargement: true,
    //   })
    // }
    // 
    // processedImage = processedImage.jpeg({
    //   quality: parseInt(quality),
    //   progressive: true,
    // })
    // 
    // const optimizedBuffer = await processedImage.toBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'CDN-Cache-Control': 'public, max-age=86400',
        'Vary': 'Accept',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // TODO: Implement image upload functionality
  // This could handle direct uploads to your CDN or cloud storage
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (e.g., 10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // TODO: Upload to your preferred storage solution
    // Examples:
    // - Cloudinary
    // - AWS S3
    // - Supabase Storage
    // - Vercel Blob
    
    // For now, return a mock response
    const mockUrl = `https://cdn.scenescout.com/uploads/${Date.now()}-${file.name}`
    
    return NextResponse.json({
      url: mockUrl,
      width: 1200, // These would come from actual image processing
      height: 800,
      size: file.size,
      format: file.type,
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}