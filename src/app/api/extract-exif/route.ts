import { NextRequest, NextResponse } from 'next/server';
import { exiftool } from 'exiftool-vendored';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create temporary file for exiftool
    const tempDir = mkdtempSync(join(tmpdir(), 'exiflab-'));
    const fileExtension = file.name.split('.').pop() || 'jpg';
    tempFilePath = join(tempDir, `temp.${fileExtension}`);
    
    // Write buffer to temporary file
    writeFileSync(tempFilePath, buffer);

    // Extract EXIF data using exiftool-vendored
    const tags = await exiftool.read(tempFilePath);

    // Process and categorize the EXIF data
    const processedTags = processExifData(tags);

    // Extract GPS data if available
    let gpsData = undefined;
    if (tags.GPSLatitude && tags.GPSLongitude) {
      gpsData = {
        latitude: typeof tags.GPSLatitude === 'number' ? tags.GPSLatitude : parseFloat(String(tags.GPSLatitude)),
        longitude: typeof tags.GPSLongitude === 'number' ? tags.GPSLongitude : parseFloat(String(tags.GPSLongitude)),
        altitude: tags.GPSAltitude ? (typeof tags.GPSAltitude === 'number' ? tags.GPSAltitude : parseFloat(String(tags.GPSAltitude))) : undefined,
      };
    }

    // Prepare response data
    const result: ProcessedExifData = {
      tags: processedTags,
      imageInfo: {
        format: String(tags.FileType || file.type.split('/')[1] || 'unknown'),
        width: Number(tags.ImageWidth || tags.ExifImageWidth || 0),
        height: Number(tags.ImageHeight || tags.ExifImageHeight || 0),
        size: file.size,
        filename: file.name,
      },
      gpsData,
      errors: [],
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('EXIF extraction error:', error);
    
    // Handle specific exiftool errors
    if (error instanceof Error) {
      if (error.message.includes('File format error') || error.message.includes('Unknown file type')) {
        return NextResponse.json(
          { error: 'Unsupported image format. Please try a different image.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('File not found') || error.message.includes('Permission denied')) {
        return NextResponse.json(
          { error: 'Unable to read the image file. Please try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to extract EXIF data. The image may not contain metadata or may be corrupted.' },
      { status: 500 }
    );
  } finally {
    // Cleanup: Remove temporary file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath);
        // Also try to remove the temp directory
        const tempDir = tempFilePath.substring(0, tempFilePath.lastIndexOf('/'));
        try {
          const { rmdirSync } = require('fs');
          rmdirSync(tempDir);
        } catch (dirError) {
          // Directory might not be empty or already removed, ignore
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
    }
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;