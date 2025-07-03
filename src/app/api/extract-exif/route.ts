import { NextRequest, NextResponse } from 'next/server';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  let tempFilePath: string | null = null;
  
  console.log(`🚀 [${requestId}] === EXIF API CALLED ===`);
  console.log(`📅 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🌍 [${requestId}] Environment: ${process.env.NODE_ENV}`);
  console.log(`⚡ [${requestId}] Runtime: ${process.env.VERCEL_ENV || 'local'}`);
  
  try {
    // Step 1: Parse form data
    console.log(`📝 [${requestId}] Step 1: Parsing form data...`);
    const formData = await request.formData();
    console.log(`✅ [${requestId}] Form data parsed successfully`);
    
    const file = formData.get('image') as File;
    
    if (!file) {
      console.log(`❌ [${requestId}] No file in form data`);
      return NextResponse.json(
        { error: 'No image file provided', requestId },
        { status: 400 }
      );
    }

    console.log(`📁 [${requestId}] File details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Step 2: Validate file
    if (!file.type.startsWith('image/')) {
      console.log(`❌ [${requestId}] Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'File must be an image', requestId },
        { status: 400 }
      );
    }

    // Step 3: Convert to buffer
    console.log(`🔄 [${requestId}] Step 3: Converting file to buffer...`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [${requestId}] Buffer created - size: ${buffer.length} bytes`);

    // Step 4: Create temporary file
    console.log(`📁 [${requestId}] Step 4: Creating temporary file...`);
    try {
      const tempDir = mkdtempSync(join(tmpdir(), 'exiflab-'));
      const fileExtension = file.name.split('.').pop() || 'jpg';
      tempFilePath = join(tempDir, `temp.${fileExtension}`);
      
      console.log(`📂 [${requestId}] Temp directory: ${tempDir}`);
      console.log(`📄 [${requestId}] Temp file path: ${tempFilePath}`);
      
      writeFileSync(tempFilePath, buffer);
      console.log(`✅ [${requestId}] Temp file written successfully`);
    } catch (tempError) {
      console.error(`❌ [${requestId}] Temp file creation failed:`, tempError);
      throw new Error(`Temp file creation failed: ${tempError}`);
    }

    // Step 5: Try ExifTool extraction
    console.log(`🔧 [${requestId}] Step 5: Attempting ExifTool extraction...`);
    let tags: any = {};
    let exiftoolSuccess = false;
    
    try {
      console.log(`📦 [${requestId}] Importing exiftool-vendored...`);
      const { exiftool } = await import('exiftool-vendored');
      console.log(`✅ [${requestId}] ExifTool imported successfully`);
      
      console.log(`🔍 [${requestId}] Reading EXIF data from: ${tempFilePath}`);
      tags = await exiftool.read(tempFilePath);
      console.log(`✅ [${requestId}] ExifTool extraction successful!`);
      console.log(`📊 [${requestId}] Found ${Object.keys(tags).length} EXIF tags`);
      
      // Log some key tags for debugging
      const keyTags = ['Make', 'Model', 'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'];
      const foundKeyTags: any = {};
      keyTags.forEach(tag => {
        if (tags[tag]) foundKeyTags[tag] = tags[tag];
      });
      console.log(`🏷️ [${requestId}] Key tags found:`, foundKeyTags);
      
      exiftoolSuccess = true;
      
    } catch (exiftoolError) {
      console.error(`❌ [${requestId}] ExifTool failed:`, {
        message: exiftoolError instanceof Error ? exiftoolError.message : 'Unknown error',
        stack: exiftoolError instanceof Error ? exiftoolError.stack : 'No stack',
        name: exiftoolError instanceof Error ? exiftoolError.name : 'Unknown'
      });
      
      // Fallback: Create basic tags from file info
      console.log(`🔄 [${requestId}] Using fallback - basic file info only`);
      tags = {
        FileName: file.name,
        FileSize: file.size,
        FileType: file.type.split('/')[1] || 'unknown',
        MIMEType: file.type,
      };
    }

    // Step 6: Try Sharp for image dimensions (fallback or supplement)
    console.log(`📏 [${requestId}] Step 6: Getting image dimensions...`);
    try {
      console.log(`📦 [${requestId}] Importing Sharp...`);
      const sharp = (await import('sharp')).default;
      console.log(`✅ [${requestId}] Sharp imported successfully`);
      
      const metadata = await sharp(buffer).metadata();
      console.log(`📐 [${requestId}] Sharp metadata:`, {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorspace: metadata.space
      });
      
      // Add or supplement dimensions
      if (metadata.width) tags.ImageWidth = metadata.width;
      if (metadata.height) tags.ImageHeight = metadata.height;
      if (metadata.format) tags.Format = metadata.format;
      
    } catch (sharpError) {
      console.error(`❌ [${requestId}] Sharp failed:`, sharpError);
      // Not critical, continue without dimensions
    }

    // Step 7: Process EXIF data
    console.log(`⚙️ [${requestId}] Step 7: Processing EXIF data...`);
    const processedTags = processExifData(tags);
    console.log(`✅ [${requestId}] Processed ${processedTags.length} tags`);

    // Step 8: Extract GPS data (IMPROVED GPS EXTRACTION)
    console.log(`🗺️ [${requestId}] Step 8: Checking for GPS data...`);
    let gpsData = undefined;
    
    // Function to convert GPS coordinates to decimal
    const convertGPSToDecimal = (coord: any, ref: string): number | null => {
      if (typeof coord === 'number') {
        // Already in decimal format
        return (ref === 'S' || ref === 'W') ? -coord : coord;
      }
      
      if (typeof coord === 'string') {
        // Try to parse string coordinate
        const num = parseFloat(coord);
        if (!isNaN(num)) {
          return (ref === 'S' || ref === 'W') ? -num : num;
        }
      }
      
      // Handle DMS format if it's an array or object
      if (Array.isArray(coord) && coord.length >= 3) {
        const [deg, min, sec] = coord.map(Number);
        if (!isNaN(deg) && !isNaN(min) && !isNaN(sec)) {
          let decimal = deg + min / 60 + sec / 3600;
          return (ref === 'S' || ref === 'W') ? -decimal : decimal;
        }
      }
      
      return null;
    };
    
    // Check multiple possible GPS tag formats
    const gpsLat = tags.GPSLatitude || tags.gpsLatitude;
    const gpsLon = tags.GPSLongitude || tags.gpsLongitude;
    const gpsLatRef = tags.GPSLatitudeRef || tags.gpsLatitudeRef || 'N';
    const gpsLonRef = tags.GPSLongitudeRef || tags.gpsLongitudeRef || 'E';
    const gpsAlt = tags.GPSAltitude || tags.gpsAltitude;
    
    console.log(`🔍 [${requestId}] GPS raw data:`, {
      lat: gpsLat,
      lon: gpsLon,
      latRef: gpsLatRef,
      lonRef: gpsLonRef,
      alt: gpsAlt
    });
    
    if (gpsLat !== undefined && gpsLon !== undefined) {
      try {
        const latitude = convertGPSToDecimal(gpsLat, gpsLatRef);
        const longitude = convertGPSToDecimal(gpsLon, gpsLonRef);
        
        if (latitude !== null && longitude !== null) {
          gpsData = {
            latitude,
            longitude,
            altitude: gpsAlt ? (typeof gpsAlt === 'number' ? gpsAlt : parseFloat(String(gpsAlt))) : undefined,
          };
          console.log(`📍 [${requestId}] GPS data successfully extracted:`, gpsData);
        } else {
          console.log(`❌ [${requestId}] GPS coordinate conversion failed`);
        }
      } catch (gpsError) {
        console.error(`❌ [${requestId}] GPS parsing failed:`, gpsError);
        gpsData = undefined;
      }
    } else {
      console.log(`📍 [${requestId}] No GPS data found`);
    }

    // Step 9: Prepare response
    console.log(`📦 [${requestId}] Step 9: Preparing response...`);
    const result: ProcessedExifData = {
      tags: processedTags,
      imageInfo: {
        format: String(tags.FileType || tags.Format || file.type.split('/')[1] || 'unknown'),
        width: Number(tags.ImageWidth || tags.ExifImageWidth || 0),
        height: Number(tags.ImageHeight || tags.ExifImageHeight || 0),
        size: file.size,
        filename: file.name,
      },
      gpsData,
      errors: exiftoolSuccess ? [] : ['ExifTool unavailable - using fallback data'],
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] SUCCESS! Processing completed in ${processingTime}ms`);
    console.log(`📊 [${requestId}] Response summary:`, {
      tagsCount: result.tags.length,
      hasGPS: !!result.gpsData,
      imageFormat: result.imageInfo.format,
      imageDimensions: `${result.imageInfo.width}x${result.imageInfo.height}`,
      exiftoolWorked: exiftoolSuccess
    });

    return NextResponse.json(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 [${requestId}] === CRITICAL ERROR === (after ${processingTime}ms)`);
    console.error(`💥 [${requestId}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`💥 [${requestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`💥 [${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Additional debugging info
    console.error(`💥 [${requestId}] Environment debug:`, {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      tempFilePath,
      tmpdir: tmpdir(),
      cwd: process.cwd()
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('File format error') || error.message.includes('Unknown file type')) {
        console.log(`🔄 [${requestId}] Handling as file format error`);
        return NextResponse.json(
          { error: 'Unsupported image format. Please try a different image.', requestId },
          { status: 400 }
        );
      }
      
      if (error.message.includes('File not found') || error.message.includes('Permission denied')) {
        console.log(`🔄 [${requestId}] Handling as file access error`);
        return NextResponse.json(
          { error: 'Unable to read the image file. Please try again.', requestId },
          { status: 400 }
        );
      }
      
      if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
        console.log(`🔄 [${requestId}] Handling as ExifTool binary missing error`);
        return NextResponse.json(
          { error: 'ExifTool service unavailable. Please try again later.', requestId },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to extract EXIF data. Server processing error.',
        requestId,
        timestamp: new Date().toISOString(),
        processingTime,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
    
  } finally {
    // Step 10: Cleanup
    if (tempFilePath) {
      console.log(`🧹 [${requestId}] Step 10: Cleaning up temp file...`);
      try {
        unlinkSync(tempFilePath);
        console.log(`✅ [${requestId}] Temp file deleted: ${tempFilePath}`);
        
        // Try to remove temp directory
        const tempDir = tempFilePath.substring(0, tempFilePath.lastIndexOf('/'));
        try {
          const { rmdirSync } = require('fs');
          rmdirSync(tempDir);
          console.log(`✅ [${requestId}] Temp directory deleted: ${tempDir}`);
        } catch (dirError) {
          console.warn(`⚠️ [${requestId}] Could not delete temp directory:`, dirError);
        }
      } catch (cleanupError) {
        console.error(`❌ [${requestId}] Cleanup failed:`, cleanupError);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`🏁 [${requestId}] === REQUEST COMPLETED === Total time: ${totalTime}ms`);
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;