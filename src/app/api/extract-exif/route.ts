import { NextRequest, NextResponse } from 'next/server';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] EXIF extraction started`);
  
  try {
    // Parse form data with timeout protection
    const formData = await Promise.race([
      request.formData(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      )
    ]);

    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided', requestId },
        { status: 400 }
      );
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image', requestId },
        { status: 400 }
      );
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.', requestId },
        { status: 413 }
      );
    }

    console.log(`📁 [${requestId}] Processing: ${file.name} (${Math.round(file.size / 1024)}KB)`);

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse EXIF with EXIFR library (with error handling)
    let exifData: any = {};
    let gpsData: any = undefined;
    
    try {
      const exifr = (await import('exifr')).default;
      
      // Extract EXIF data with optimized options
      exifData = await exifr.parse(buffer, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true,
        mergeOutput: true,
        translateKeys: false,
        translateValues: false,
        reviveValues: true,
        sanitize: true,
        chunked: true,
        firstChunkSize: 40960,
        chunkSize: 65536
      }) || {};

      // Extract GPS coordinates separately for better reliability
      try {
        const gpsCoords = await exifr.gps(buffer);
        if (gpsCoords?.latitude && gpsCoords?.longitude) {
          gpsData = {
            latitude: gpsCoords.latitude,
            longitude: gpsCoords.longitude,
            altitude: gpsCoords.altitude || undefined,
          };
          console.log(`📍 [${requestId}] GPS found: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
        }
      } catch (gpsError) {
        // GPS extraction failure is not critical
        console.log(`⚠️ [${requestId}] GPS extraction failed (non-critical)`);
      }

    } catch (exifrError) {
      console.error(`❌ [${requestId}] EXIFR failed:`, exifrError instanceof Error ? exifrError.message : exifrError);
      
      // Continue with basic file info even if EXIFR fails
      exifData = {};
    }

    // Get image dimensions
    let imageWidth = 0;
    let imageHeight = 0;
    let format = file.type.split('/')[1] || 'unknown';

    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(buffer).metadata();
      imageWidth = metadata.width || 0;
      imageHeight = metadata.height || 0;
      format = metadata.format || format;
    } catch (sharpError) {
      // Fallback to EXIF dimensions
      imageWidth = exifData?.ExifImageWidth || exifData?.ImageWidth || 0;
      imageHeight = exifData?.ExifImageHeight || exifData?.ImageHeight || 0;
    }

    // Prepare tags for processing
    const tags: Record<string, any> = {
      FileName: file.name,
      FileSize: file.size,
      FileType: format,
      MIMEType: file.type,
      ImageWidth: imageWidth,
      ImageHeight: imageHeight,
      ...exifData
    };

    // Process EXIF data with categorization
    const processedTags = processExifData(tags);
    
    // Count privacy categories
    const categoryCounts = processedTags.reduce((acc, tag) => {
      acc[tag.category] = (acc[tag.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Prepare final response
    const result: ProcessedExifData = {
      tags: processedTags,
      imageInfo: {
        format,
        width: imageWidth,
        height: imageHeight,
        size: file.size,
        filename: file.name,
      },
      gpsData,
      errors: [],
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Success: ${processedTags.length} tags, ${!!gpsData ? 'GPS found' : 'no GPS'} (${processingTime}ms)`);

    // CRITICAL: Ensure we always return valid JSON
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`💥 [${requestId}] Error (${processingTime}ms):`, errorMessage);

    // Handle specific error types
    let userMessage = 'Failed to process image';
    let statusCode = 500;

    if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
      userMessage = 'Request timed out. Please try with a smaller image.';
      statusCode = 408;
    } else if (errorMessage.includes('file format') || errorMessage.includes('Unsupported')) {
      userMessage = 'Unsupported image format. Please try JPEG, PNG, or TIFF.';
      statusCode = 400;
    } else if (errorMessage.includes('Malformed') || errorMessage.includes('Corrupted')) {
      userMessage = 'Image file appears to be corrupted.';
      statusCode = 400;
    } else if (errorMessage.includes('size') || errorMessage.includes('large')) {
      userMessage = 'Image file is too large.';
      statusCode = 413;
    }

    // CRITICAL: Always return valid JSON response
    const errorResponse = {
      error: userMessage,
      requestId,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    };

    return new NextResponse(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;

// Add request size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};