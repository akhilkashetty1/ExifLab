import { NextRequest, NextResponse } from 'next/server';
import { processExifData } from '@/lib/exif-categories';
import { ProcessedExifData } from '@/types/exif';

// Robust EXIF parser based on research findings
class RobustExifParser {
  private buffer: Buffer;
  private view: DataView;
  private offset: number = 0;
  private tiffStart: number = 0;
  private littleEndian: boolean = false;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  private checkBounds(offset: number, length: number = 1): boolean {
    return offset >= 0 && (offset + length) <= this.buffer.length;
  }

  private safeReadUint8(offset: number): number | null {
    if (!this.checkBounds(offset, 1)) return null;
    return this.view.getUint8(offset);
  }

  private safeReadUint16(offset: number, littleEndian: boolean = false): number | null {
    if (!this.checkBounds(offset, 2)) return null;
    return this.view.getUint16(offset, littleEndian);
  }

  private safeReadUint32(offset: number, littleEndian: boolean = false): number | null {
    if (!this.checkBounds(offset, 4)) return null;
    return this.view.getUint32(offset, littleEndian);
  }

  private safeReadString(offset: number, length: number): string | null {
    if (!this.checkBounds(offset, length)) return null;
    let result = '';
    for (let i = 0; i < length; i++) {
      const byte = this.safeReadUint8(offset + i);
      if (byte === null) return null;
      if (byte === 0) break; // Null terminator
      result += String.fromCharCode(byte);
    }
    return result;
  }

  private readRational(offset: number): number | null {
    const numerator = this.safeReadUint32(offset, this.littleEndian);
    const denominator = this.safeReadUint32(offset + 4, this.littleEndian);
    if (numerator === null || denominator === null || denominator === 0) return null;
    return numerator / denominator;
  }

  private readSignedRational(offset: number): number | null {
    if (!this.checkBounds(offset, 8)) return null;
    const numerator = this.view.getInt32(offset, this.littleEndian);
    const denominator = this.view.getInt32(offset + 4, this.littleEndian);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  public parse(): Record<string, any> {
    const tags: Record<string, any> = {};
    
    try {
      // Check for JPEG SOI marker
      if (!this.checkBounds(0, 2) || this.safeReadUint16(0) !== 0xFFD8) {
        console.log('Not a JPEG file');
        return tags;
      }

      // Find APP1 marker containing EXIF
      let currentOffset = 2;
      let foundExif = false;

      while (currentOffset < this.buffer.length - 1) {
        if (!this.checkBounds(currentOffset, 4)) break;

        const marker = this.safeReadUint16(currentOffset);
        if (marker === null) break;

        if ((marker & 0xFF00) !== 0xFF00) break; // Not a valid marker

        if (marker === 0xFFE1) { // APP1 marker
          const segmentLength = this.safeReadUint16(currentOffset + 2);
          if (segmentLength === null || segmentLength < 14) {
            currentOffset += 4;
            continue;
          }

          // Check for "Exif\0\0" header
          const exifHeader = this.safeReadString(currentOffset + 4, 6);
          if (exifHeader === 'Exif\0\0') {
            this.tiffStart = currentOffset + 10;
            foundExif = true;
            break;
          }

          currentOffset += 2 + segmentLength;
        } else if (marker === 0xFFDA) { // Start of Scan - no more metadata
          break;
        } else {
          // Skip this segment
          const segmentLength = this.safeReadUint16(currentOffset + 2);
          if (segmentLength === null) break;
          currentOffset += 2 + segmentLength;
        }
      }

      if (!foundExif) {
        console.log('No EXIF data found');
        return tags;
      }

      // Parse TIFF header
      if (!this.checkBounds(this.tiffStart, 8)) {
        console.log('Invalid TIFF header bounds');
        return tags;
      }

      // Check byte order
      const byteOrder = this.safeReadUint16(this.tiffStart);
      if (byteOrder === 0x4949) {
        this.littleEndian = true; // Intel format
      } else if (byteOrder === 0x4D4D) {
        this.littleEndian = false; // Motorola format
      } else {
        console.log('Invalid byte order');
        return tags;
      }

      // Check TIFF magic number
      const magic = this.safeReadUint16(this.tiffStart + 2, this.littleEndian);
      if (magic !== 42) {
        console.log('Invalid TIFF magic number');
        return tags;
      }

      // Get offset to first IFD
      const ifd0Offset = this.safeReadUint32(this.tiffStart + 4, this.littleEndian);
      if (ifd0Offset === null) {
        console.log('Invalid IFD0 offset');
        return tags;
      }

      // Parse IFD0
      this.parseIFD(this.tiffStart + ifd0Offset, tags, 'IFD0');

    } catch (error) {
      console.error('EXIF parsing error:', error);
    }

    return tags;
  }

  private parseIFD(ifdOffset: number, tags: Record<string, any>, ifdName: string): void {
    if (!this.checkBounds(ifdOffset, 2)) {
      console.log(`Invalid ${ifdName} offset: ${ifdOffset}`);
      return;
    }

    const entryCount = this.safeReadUint16(ifdOffset, this.littleEndian);
    if (entryCount === null || entryCount > 100) { // Sanity check
      console.log(`Invalid entry count in ${ifdName}: ${entryCount}`);
      return;
    }

    console.log(`Parsing ${ifdName} with ${entryCount} entries`);

    let currentOffset = ifdOffset + 2;

    for (let i = 0; i < entryCount; i++) {
      if (!this.checkBounds(currentOffset, 12)) {
        console.log(`Entry ${i} out of bounds in ${ifdName}`);
        break;
      }

      const tag = this.safeReadUint16(currentOffset, this.littleEndian);
      const type = this.safeReadUint16(currentOffset + 2, this.littleEndian);
      const count = this.safeReadUint32(currentOffset + 4, this.littleEndian);
      const valueOffset = this.safeReadUint32(currentOffset + 8, this.littleEndian);

      if (tag === null || type === null || count === null || valueOffset === null) {
        currentOffset += 12;
        continue;
      }

      const tagInfo = this.getTagInfo(tag);
      if (tagInfo) {
        const value = this.readTagValue(type, count, valueOffset, currentOffset + 8);
        if (value !== null) {
          tags[tagInfo.name] = value;
          
          // Handle special tags that point to sub-IFDs
          if (tag === 0x8769 && typeof value === 'number') { // ExifOffset
            this.parseIFD(this.tiffStart + value, tags, 'ExifIFD');
          } else if (tag === 0x8825 && typeof value === 'number') { // GPSOffset
            this.parseIFD(this.tiffStart + value, tags, 'GPSIFD');
          }
        }
      }

      currentOffset += 12;
    }

    // Check for next IFD
    if (this.checkBounds(currentOffset, 4)) {
      const nextIFDOffset = this.safeReadUint32(currentOffset, this.littleEndian);
      if (nextIFDOffset !== null && nextIFDOffset !== 0) {
        this.parseIFD(this.tiffStart + nextIFDOffset, tags, 'IFD1');
      }
    }
  }

  private readTagValue(type: number, count: number, valueOffset: number, valueFieldOffset: number): any {
    const typeSize = this.getTypeSize(type);
    if (typeSize === 0) return null;

    const totalSize = typeSize * count;
    let dataOffset: number;

    // If data fits in 4 bytes, it's stored in the value field itself
    if (totalSize <= 4) {
      dataOffset = valueFieldOffset;
    } else {
      dataOffset = this.tiffStart + valueOffset;
      if (!this.checkBounds(dataOffset, totalSize)) {
        console.log(`Data offset out of bounds: ${dataOffset}, size: ${totalSize}`);
        return null;
      }
    }

    return this.readValueByType(type, count, dataOffset);
  }

  private readValueByType(type: number, count: number, offset: number): any {
    if (count === 0) return null;

    switch (type) {
      case 1: // BYTE
        if (count === 1) {
          return this.safeReadUint8(offset);
        } else {
          const result = [];
          for (let i = 0; i < count; i++) {
            const value = this.safeReadUint8(offset + i);
            if (value === null) break;
            result.push(value);
          }
          return result.length > 0 ? result : null;
        }

      case 2: // ASCII
        return this.safeReadString(offset, count);

      case 3: // SHORT
        if (count === 1) {
          return this.safeReadUint16(offset, this.littleEndian);
        } else {
          const result = [];
          for (let i = 0; i < count; i++) {
            const value = this.safeReadUint16(offset + i * 2, this.littleEndian);
            if (value === null) break;
            result.push(value);
          }
          return result.length > 0 ? result : null;
        }

      case 4: // LONG
        if (count === 1) {
          return this.safeReadUint32(offset, this.littleEndian);
        } else {
          const result = [];
          for (let i = 0; i < count; i++) {
            const value = this.safeReadUint32(offset + i * 4, this.littleEndian);
            if (value === null) break;
            result.push(value);
          }
          return result.length > 0 ? result : null;
        }

      case 5: // RATIONAL
        if (count === 1) {
          return this.readRational(offset);
        } else {
          const result = [];
          for (let i = 0; i < count; i++) {
            const value = this.readRational(offset + i * 8);
            if (value === null) break;
            result.push(value);
          }
          return result.length > 0 ? result : null;
        }

      case 7: // UNDEFINED
        if (!this.checkBounds(offset, count)) return null;
        return Array.from(this.buffer.subarray(offset, offset + count));

      case 9: // SLONG
        if (!this.checkBounds(offset, 4)) return null;
        return this.view.getInt32(offset, this.littleEndian);

      case 10: // SRATIONAL
        if (count === 1) {
          return this.readSignedRational(offset);
        } else {
          const result = [];
          for (let i = 0; i < count; i++) {
            const value = this.readSignedRational(offset + i * 8);
            if (value === null) break;
            result.push(value);
          }
          return result.length > 0 ? result : null;
        }

      default:
        console.log(`Unsupported type: ${type}`);
        return null;
    }
  }

  private getTypeSize(type: number): number {
    const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    return sizes[type] || 0;
  }

  private getTagInfo(tag: number): { name: string } | null {
    // Comprehensive tag mapping including GPS tags
    const tags: Record<number, string> = {
      // Basic TIFF tags
      0x010F: 'Make',
      0x0110: 'Model',
      0x0112: 'Orientation',
      0x011A: 'XResolution',
      0x011B: 'YResolution',
      0x0128: 'ResolutionUnit',
      0x0131: 'Software',
      0x0132: 'DateTime',
      0x013B: 'Artist',
      0x8298: 'Copyright',
      0x8769: 'ExifOffset',
      0x8825: 'GPSOffset',

      // EXIF tags
      0x829A: 'ExposureTime',
      0x829D: 'FNumber',
      0x8827: 'ISO',
      0x9000: 'ExifVersion',
      0x9003: 'DateTimeOriginal',
      0x9004: 'DateTimeDigitized',
      0x9201: 'ShutterSpeedValue',
      0x9202: 'ApertureValue',
      0x9204: 'ExposureBiasValue',
      0x9205: 'MaxApertureValue',
      0x9207: 'MeteringMode',
      0x9208: 'LightSource',
      0x9209: 'Flash',
      0x920A: 'FocalLength',
      0x9286: 'UserComment',
      0xA000: 'FlashpixVersion',
      0xA001: 'ColorSpace',
      0xA002: 'ExifImageWidth',
      0xA003: 'ExifImageHeight',
      0xA402: 'ExposureMode',
      0xA403: 'WhiteBalance',
      0xA405: 'FocalLengthIn35mmFormat',
      0xA430: 'CameraOwnerName',
      0xA431: 'BodySerialNumber',
      0xA432: 'LensSpecification',
      0xA433: 'LensMake',
      0xA434: 'LensModel',
      0xA435: 'LensSerialNumber',

      // GPS tags
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
      0x001D: 'GPSDateStamp',
      0x001E: 'GPSDifferential',
    };

    return tags[tag] ? { name: tags[tag] } : null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] === ROBUST EXIF API CALLED ===`);
  
  try {
    // Parse form data
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [${requestId}] Buffer created - size: ${buffer.length} bytes`);

    // Parse EXIF with robust parser
    console.log(`🔧 [${requestId}] Parsing EXIF with robust parser...`);
    const parser = new RobustExifParser(buffer);
    const tags = parser.parse();
    console.log(`✅ [${requestId}] EXIF parsing completed! Found ${Object.keys(tags).length} tags`);

    // Log found tags for debugging
    const foundTags = Object.keys(tags);
    console.log(`🏷️ [${requestId}] Found tags:`, foundTags);

    // Get image dimensions with Sharp
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
      console.log(`⚠️ [${requestId}] Sharp not available, using EXIF dimensions`);
      imageWidth = tags.ExifImageWidth || tags.ImageWidth || 0;
      imageHeight = tags.ExifImageHeight || tags.ImageHeight || 0;
    }

    // Add basic file info
    tags.FileName = file.name;
    tags.FileSize = file.size;
    tags.FileType = format;
    tags.MIMEType = file.type;
    if (imageWidth) tags.ImageWidth = imageWidth;
    if (imageHeight) tags.ImageHeight = imageHeight;

    // Process EXIF data
    const processedTags = processExifData(tags);
    console.log(`✅ [${requestId}] Processed ${processedTags.length} tags`);

    // Extract GPS data
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
    } else {
      console.log(`📍 [${requestId}] No GPS coordinates found`);
    }

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