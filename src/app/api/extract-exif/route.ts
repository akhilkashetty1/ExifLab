import { NextRequest, NextResponse } from 'next/server';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';

// Pure JavaScript EXIF parser - no external dependencies needed
class ExifParser {
  private buffer: Buffer;
  private offset: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  private readUint16(littleEndian: boolean = false): number {
    const value = littleEndian 
      ? this.buffer.readUInt16LE(this.offset)
      : this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  private readUint32(littleEndian: boolean = false): number {
    const value = littleEndian 
      ? this.buffer.readUInt32LE(this.offset)
      : this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  private readString(length: number): string {
    const value = this.buffer.subarray(this.offset, this.offset + length).toString('ascii');
    this.offset += length;
    return value.replace(/\0/g, ''); // Remove null terminators
  }

  private readRational(littleEndian: boolean = false): number {
    const numerator = this.readUint32(littleEndian);
    const denominator = this.readUint32(littleEndian);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  private convertDMSToDecimal(degrees: number, minutes: number, seconds: number): number {
    return degrees + minutes / 60 + seconds / 3600;
  }

  public parse(): Record<string, any> {
    const tags: Record<string, any> = {};
    
    try {
      // Check for JPEG format
      if (this.buffer[0] !== 0xFF || this.buffer[1] !== 0xD8) {
        console.log('Not a JPEG file, trying alternative parsing...');
        return this.parseAlternativeFormats();
      }

      // Find EXIF marker
      this.offset = 2;
      let foundExif = false;

      while (this.offset < this.buffer.length - 1) {
        if (this.buffer[this.offset] === 0xFF && this.buffer[this.offset + 1] === 0xE1) {
          this.offset += 2;
          const segmentLength = this.readUint16();
          const exifHeader = this.readString(4);
          
          if (exifHeader === 'Exif') {
            this.offset += 2; // Skip null bytes
            foundExif = true;
            break;
          } else {
            this.offset += segmentLength - 6;
          }
        } else {
          this.offset++;
        }
      }

      if (!foundExif) {
        console.log('No EXIF data found in JPEG');
        return tags;
      }

      // Parse TIFF header
      const tiffStart = this.offset;
      const byteOrder = this.readString(2);
      const littleEndian = byteOrder === 'II';
      
      if (byteOrder !== 'II' && byteOrder !== 'MM') {
        console.log('Invalid TIFF header');
        return tags;
      }

      const magic = this.readUint16(littleEndian);
      if (magic !== 42) {
        console.log('Invalid TIFF magic number');
        return tags;
      }

      const ifdOffset = this.readUint32(littleEndian);
      this.offset = tiffStart + ifdOffset;

      // Parse IFD (Image File Directory)
      this.parseIFD(tags, tiffStart, littleEndian);

    } catch (error) {
      console.error('EXIF parsing error:', error);
    }

    return tags;
  }

  private parseIFD(tags: Record<string, any>, tiffStart: number, littleEndian: boolean): void {
    const entryCount = this.readUint16(littleEndian);
    
    for (let i = 0; i < entryCount; i++) {
      const tag = this.readUint16(littleEndian);
      const type = this.readUint16(littleEndian);
      const count = this.readUint32(littleEndian);
      const valueOffset = this.readUint32(littleEndian);

      const tagInfo = this.getTagInfo(tag);
      if (tagInfo) {
        const value = this.readTagValue(type, count, valueOffset, tiffStart, littleEndian);
        tags[tagInfo.name] = value;
        
        // Handle GPS sub-IFD
        if (tag === 0x8825 && typeof value === 'number') {
          this.parseGPSData(tags, tiffStart + value, littleEndian);
        }
      }
    }

    // Check for next IFD
    const nextIFDOffset = this.readUint32(littleEndian);
    if (nextIFDOffset !== 0) {
      this.offset = tiffStart + nextIFDOffset;
      this.parseIFD(tags, tiffStart, littleEndian);
    }
  }

  private parseGPSData(tags: Record<string, any>, gpsOffset: number, littleEndian: boolean): void {
    const currentOffset = this.offset;
    this.offset = gpsOffset;
    
    try {
      const entryCount = this.readUint16(littleEndian);
      
      for (let i = 0; i < entryCount; i++) {
        const tag = this.readUint16(littleEndian);
        const type = this.readUint16(littleEndian);
        const count = this.readUint32(littleEndian);
        const valueOffset = this.readUint32(littleEndian);

        const gpsTagInfo = this.getGPSTagInfo(tag);
        if (gpsTagInfo) {
          const value = this.readTagValue(type, count, valueOffset, gpsOffset - this.offset + currentOffset, littleEndian);
          tags[gpsTagInfo.name] = value;
        }
      }
    } catch (error) {
      console.error('GPS parsing error:', error);
    }
    
    this.offset = currentOffset;
  }

  private readTagValue(type: number, count: number, valueOffset: number, tiffStart: number, littleEndian: boolean): any {
    const currentOffset = this.offset;
    
    // If value fits in 4 bytes, it's stored directly in valueOffset
    const dataSize = this.getTypeSize(type) * count;
    if (dataSize <= 4) {
      this.offset = currentOffset - 4; // Go back to value field
      return this.readValueByType(type, count, littleEndian);
    } else {
      this.offset = tiffStart + valueOffset;
      const value = this.readValueByType(type, count, littleEndian);
      this.offset = currentOffset;
      return value;
    }
  }

  private readValueByType(type: number, count: number, littleEndian: boolean): any {
    switch (type) {
      case 1: // BYTE
        return count === 1 ? this.buffer[this.offset++] : Array.from(this.buffer.subarray(this.offset, this.offset += count));
      
      case 2: // ASCII
        return this.readString(count);
      
      case 3: // SHORT
        return count === 1 ? this.readUint16(littleEndian) : 
               Array.from({length: count}, () => this.readUint16(littleEndian));
      
      case 4: // LONG
        return count === 1 ? this.readUint32(littleEndian) : 
               Array.from({length: count}, () => this.readUint32(littleEndian));
      
      case 5: // RATIONAL
        if (count === 1) {
          return this.readRational(littleEndian);
        } else {
          return Array.from({length: count}, () => this.readRational(littleEndian));
        }
      
      case 7: // UNDEFINED
        return this.buffer.subarray(this.offset, this.offset += count);
      
      case 9: // SLONG
        const value = littleEndian ? this.buffer.readInt32LE(this.offset) : this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return value;
      
      case 10: // SRATIONAL
        const num = littleEndian ? this.buffer.readInt32LE(this.offset) : this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        const den = littleEndian ? this.buffer.readInt32LE(this.offset) : this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return den !== 0 ? num / den : 0;
      
      default:
        this.offset += this.getTypeSize(type) * count;
        return null;
    }
  }

  private getTypeSize(type: number): number {
    const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    return sizes[type] || 1;
  }

  private getTagInfo(tag: number): { name: string } | null {
    const tags: Record<number, string> = {
      0x010F: 'Make',
      0x0110: 'Model',
      0x0112: 'Orientation',
      0x011A: 'XResolution',
      0x011B: 'YResolution',
      0x0128: 'ResolutionUnit',
      0x0131: 'Software',
      0x0132: 'DateTime',
      0x013B: 'Artist',
      0x013E: 'WhitePoint',
      0x013F: 'PrimaryChromaticities',
      0x0211: 'YCbCrCoefficients',
      0x0213: 'YCbCrPositioning',
      0x0214: 'ReferenceBlackWhite',
      0x8298: 'Copyright',
      0x8769: 'ExifIFDPointer',
      0x8825: 'GPSIFDPointer',
      0x829A: 'ExposureTime',
      0x829D: 'FNumber',
      0x8827: 'ISO',
      0x9000: 'ExifVersion',
      0x9003: 'DateTimeOriginal',
      0x9004: 'DateTimeDigitized',
      0x9101: 'ComponentsConfiguration',
      0x9102: 'CompressedBitsPerPixel',
      0x9201: 'ShutterSpeedValue',
      0x9202: 'ApertureValue',
      0x9203: 'BrightnessValue',
      0x9204: 'ExposureBiasValue',
      0x9205: 'MaxApertureValue',
      0x9206: 'SubjectDistance',
      0x9207: 'MeteringMode',
      0x9208: 'LightSource',
      0x9209: 'Flash',
      0x920A: 'FocalLength',
      0x9286: 'UserComment',
      0xA000: 'FlashpixVersion',
      0xA001: 'ColorSpace',
      0xA002: 'ExifImageWidth',
      0xA003: 'ExifImageHeight',
      0xA005: 'InteroperabilityIFDPointer',
      0xA20E: 'FocalPlaneXResolution',
      0xA20F: 'FocalPlaneYResolution',
      0xA210: 'FocalPlaneResolutionUnit',
      0xA215: 'ExposureIndex',
      0xA217: 'SensingMethod',
      0xA300: 'FileSource',
      0xA301: 'SceneType',
      0xA302: 'CFAPattern',
      0xA401: 'CustomRendered',
      0xA402: 'ExposureMode',
      0xA403: 'WhiteBalance',
      0xA404: 'DigitalZoomRatio',
      0xA405: 'FocalLengthIn35mmFormat',
      0xA406: 'SceneCaptureType',
      0xA407: 'GainControl',
      0xA408: 'Contrast',
      0xA409: 'Saturation',
      0xA40A: 'Sharpness',
      0xA40C: 'SubjectDistanceRange',
      0xA420: 'ImageUniqueID',
      0xA430: 'CameraOwnerName',
      0xA431: 'BodySerialNumber',
      0xA432: 'LensSpecification',
      0xA433: 'LensMake',
      0xA434: 'LensModel',
      0xA435: 'LensSerialNumber',
    };

    return tags[tag] ? { name: tags[tag] } : null;
  }

  private getGPSTagInfo(tag: number): { name: string } | null {
    const gpsTags: Record<number, string> = {
      0x0000: 'GPSVersionID',
      0x0001: 'GPSLatitudeRef',
      0x0002: 'GPSLatitude',
      0x0003: 'GPSLongitudeRef',
      0x0004: 'GPSLongitude',
      0x0005: 'GPSAltitudeRef',
      0x0006: 'GPSAltitude',
      0x0007: 'GPSTimeStamp',
      0x0008: 'GPSSatellites',
      0x0009: 'GPSStatus',
      0x000A: 'GPSMeasureMode',
      0x000B: 'GPSDOP',
      0x000C: 'GPSSpeedRef',
      0x000D: 'GPSSpeed',
      0x000E: 'GPSTrackRef',
      0x000F: 'GPSTrack',
      0x0010: 'GPSImgDirectionRef',
      0x0011: 'GPSImgDirection',
      0x0012: 'GPSMapDatum',
      0x0013: 'GPSDestLatitudeRef',
      0x0014: 'GPSDestLatitude',
      0x0015: 'GPSDestLongitudeRef',
      0x0016: 'GPSDestLongitude',
      0x0017: 'GPSDestBearingRef',
      0x0018: 'GPSDestBearing',
      0x0019: 'GPSDestDistanceRef',
      0x001A: 'GPSDestDistance',
      0x001B: 'GPSProcessingMethod',
      0x001C: 'GPSAreaInformation',
      0x001D: 'GPSDateStamp',
      0x001E: 'GPSDifferential',
    };

    return gpsTags[tag] ? { name: gpsTags[tag] } : null;
  }

  private parseAlternativeFormats(): Record<string, any> {
    // Basic fallback for non-JPEG formats
    const tags: Record<string, any> = {};
    
    // Try to detect PNG
    if (this.buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
      tags.FileType = 'PNG';
      // PNG doesn't typically have EXIF, but could have text chunks
    }
    
    // Try to detect TIFF
    if (this.buffer.subarray(0, 2).toString('ascii') === 'II' || 
        this.buffer.subarray(0, 2).toString('ascii') === 'MM') {
      tags.FileType = 'TIFF';
      // Could try to parse TIFF EXIF here
    }

    return tags;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] === PURE JS EXIF API CALLED ===`);
  console.log(`📅 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Parse form data
    console.log(`📝 [${requestId}] Step 1: Parsing form data...`);
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided', requestId },
        { status: 400 }
      );
    }

    console.log(`📁 [${requestId}] File details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Step 2: Validate file
    if (!file.type.startsWith('image/')) {
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

    // Step 4: Parse EXIF with pure JavaScript
    console.log(`🔧 [${requestId}] Step 4: Parsing EXIF with pure JavaScript...`);
    const parser = new ExifParser(buffer);
    const tags = parser.parse();
    console.log(`✅ [${requestId}] Pure JS EXIF extraction completed!`);
    console.log(`📊 [${requestId}] Found ${Object.keys(tags).length} EXIF tags`);

    // Step 5: Get image dimensions with Sharp (if available) or basic detection
    console.log(`📏 [${requestId}] Step 5: Getting image dimensions...`);
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
      imageWidth = tags.ExifImageWidth || tags.ImageWidth || 0;
      imageHeight = tags.ExifImageHeight || tags.ImageHeight || 0;
    }

    // Add basic file info to tags
    tags.FileName = file.name;
    tags.FileSize = file.size;
    tags.FileType = format;
    tags.MIMEType = file.type;
    if (imageWidth) tags.ImageWidth = imageWidth;
    if (imageHeight) tags.ImageHeight = imageHeight;

    // Step 6: Process EXIF data
    console.log(`⚙️ [${requestId}] Step 6: Processing EXIF data...`);
    const processedTags = processExifData(tags);
    console.log(`✅ [${requestId}] Processed ${processedTags.length} tags`);

    // Step 7: Extract GPS data with improved logic
    console.log(`🗺️ [${requestId}] Step 7: Extracting GPS data...`);
    let gpsData = undefined;

    const convertGPSToDecimal = (coord: any, ref: string): number | null => {
      // Handle array format [degrees, minutes, seconds]
      if (Array.isArray(coord) && coord.length >= 3) {
        const [deg, min, sec] = coord.map(Number);
        if (!isNaN(deg) && !isNaN(min) && !isNaN(sec)) {
          let decimal = deg + min / 60 + sec / 3600;
          return (ref === 'S' || ref === 'W') ? -decimal : decimal;
        }
      }
      
      // Handle direct decimal
      if (typeof coord === 'number') {
        return (ref === 'S' || ref === 'W') ? -coord : coord;
      }
      
      // Handle string
      if (typeof coord === 'string') {
        const num = parseFloat(coord);
        if (!isNaN(num)) {
          return (ref === 'S' || ref === 'W') ? -num : num;
        }
      }
      
      return null;
    };

    const gpsLat = tags.GPSLatitude;
    const gpsLon = tags.GPSLongitude;
    const gpsLatRef = tags.GPSLatitudeRef || 'N';
    const gpsLonRef = tags.GPSLongitudeRef || 'E';
    const gpsAlt = tags.GPSAltitude;

    console.log(`🔍 [${requestId}] GPS raw data:`, {
      lat: gpsLat,
      lon: gpsLon,
      latRef: gpsLatRef,
      lonRef: gpsLonRef,
      alt: gpsAlt
    });

    if (gpsLat !== undefined && gpsLon !== undefined) {
      const latitude = convertGPSToDecimal(gpsLat, gpsLatRef);
      const longitude = convertGPSToDecimal(gpsLon, gpsLonRef);
      
      if (latitude !== null && longitude !== null) {
        gpsData = {
          latitude,
          longitude,
          altitude: gpsAlt ? (typeof gpsAlt === 'number' ? gpsAlt : parseFloat(String(gpsAlt))) : undefined,
        };
        console.log(`📍 [${requestId}] GPS data successfully extracted:`, gpsData);
      }
    }

    // Step 8: Prepare response
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
    });

    return NextResponse.json(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 [${requestId}] ERROR (after ${processingTime}ms):`, error);
    
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