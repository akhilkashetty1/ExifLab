import { NextRequest, NextResponse } from 'next/server';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] === EXIFR API CALLED ===`);
  console.log(`📅 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Parse form data
    console.log(`📝 [${requestId}] Step 1: Parsing form data...`);
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided', requestId },
        { status: 400 }
      );
    }

    console.log(`📁 [${requestId}] File: ${file.name}, ${file.size} bytes, ${file.type}`);

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image', requestId },
        { status: 400 }
      );
    }

    // Convert to buffer
    console.log(`🔄 [${requestId}] Step 2: Converting file to buffer...`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [${requestId}] Buffer created - size: ${buffer.length} bytes`);

    // Parse EXIF with EXIFR library
    console.log(`🔧 [${requestId}] Step 3: Parsing EXIF with EXIFR library...`);
    
    // Import EXIFR dynamically
    const exifr = (await import('exifr')).default;
    console.log(`📦 [${requestId}] EXIFR library imported successfully`);

    // Extract all EXIF data
    const exifData = await exifr.parse(buffer, {
      // Enable all data extraction
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      icc: true,
      jfif: true,
      ihdr: true,
      // Extract GPS coordinates as decimal degrees
      mergeOutput: true,
      // Include all available tags
      pick: undefined,
      skip: undefined,
      // Keep raw data for debugging
      translateKeys: false,
      translateValues: false,
      reviveValues: true,
      sanitize: true,
      // Enable chunked reading for large files
      chunked: true,
      firstChunkSize: 40960,
      chunkSize: 65536
    });

    console.log(`✅ [${requestId}] EXIFR parsing completed!`);
    console.log(`📊 [${requestId}] Raw EXIF data keys:`, Object.keys(exifData || {}));

    // Also extract GPS specifically (EXIFR has optimized GPS extraction)
    let gpsData = undefined;
    try {
      const gpsCoords = await exifr.gps(buffer);
      if (gpsCoords && gpsCoords.latitude && gpsCoords.longitude) {
        gpsData = {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          altitude: gpsCoords.altitude || undefined,
        };
        console.log(`📍 [${requestId}] GPS coordinates extracted:`, gpsData);
      } else {
        console.log(`📍 [${requestId}] No GPS coordinates found`);
      }
    } catch (gpsError) {
      console.log(`⚠️ [${requestId}] GPS extraction failed:`, gpsError);
    }

    // Get image dimensions with Sharp (fallback to EXIFR data)
    let imageWidth = 0;
    let imageHeight = 0;
    let format = file.type.split('/')[1] || 'unknown';

    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(buffer).metadata();
      imageWidth = metadata.width || 0;
      imageHeight = metadata.height || 0;
      format = metadata.format || format;
      console.log(`📐 [${requestId}] Sharp metadata: ${imageWidth}x${imageHeight}, format: ${format}`);
    } catch (sharpError) {
      console.log(`⚠️ [${requestId}] Sharp not available, using EXIF dimensions`);
      imageWidth = exifData?.ExifImageWidth || exifData?.ImageWidth || exifData?.width || 0;
      imageHeight = exifData?.ExifImageHeight || exifData?.ImageHeight || exifData?.height || 0;
    }

    // Prepare tags for processing
    const tags: Record<string, any> = {
      // Basic file info
      FileName: file.name,
      FileSize: file.size,
      FileType: format,
      MIMEType: file.type,
      ImageWidth: imageWidth,
      ImageHeight: imageHeight,
      // Add all EXIFR extracted data
      ...(exifData || {})
    };

    // Log specific GPS-related tags for debugging
    const gpsKeys = Object.keys(tags).filter(key => 
      key.toLowerCase().includes('gps') || 
      key.toLowerCase().includes('latitude') || 
      key.toLowerCase().includes('longitude')
    );
    
    if (gpsKeys.length > 0) {
      console.log(`📍 [${requestId}] GPS-related tags found:`, 
        gpsKeys.map(key => `${key}: ${JSON.stringify(tags[key])}`).join(', ')
      );
    }

    // Process EXIF data with our categorization system
    console.log(`⚙️ [${requestId}] Step 4: Processing and categorizing EXIF data...`);
    const processedTags = processExifData(tags);
    console.log(`✅ [${requestId}] Processed ${processedTags.length} tags`);

    // Count tags by privacy category
    const categoryCounts = processedTags.reduce((acc, tag) => {
      acc[tag.category] = (acc[tag.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`📊 [${requestId}] Tag categories:`, categoryCounts);

    // Prepare response
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
    console.log(`✅ [${requestId}] SUCCESS! Processing completed in ${processingTime}ms`);
    console.log(`📊 [${requestId}] Response summary:`, {
      tagsCount: result.tags.length,
      hasGPS: !!result.gpsData,
      imageFormat: result.imageInfo.format,
      imageDimensions: `${result.imageInfo.width}x${result.imageInfo.height}`,
      privacyBreakdown: categoryCounts
    });

    return NextResponse.json(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 [${requestId}] ERROR (after ${processingTime}ms):`, error);
    
    // Handle specific EXIFR errors
    if (error instanceof Error) {
      if (error.message.includes('Unknown file format') || error.message.includes('Unsupported file')) {
        return NextResponse.json(
          { error: 'Unsupported image format. Please try a JPEG, TIFF, or other standard image format.', requestId },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Malformed') || error.message.includes('Corrupted')) {
        return NextResponse.json(
          { error: 'Image file appears to be corrupted or malformed.', requestId },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to extract EXIF data. Processing error.',
        requestId,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;