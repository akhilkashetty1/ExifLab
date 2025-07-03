import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SUPPORTED_FORMATS } from '@/types/exif';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const targetFormat = formData.get('format') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!targetFormat) {
      return NextResponse.json(
        { error: 'No target format specified' },
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

    // Validate target format
    const formatInfo = SUPPORTED_FORMATS.find(f => f.extension === targetFormat);
    if (!formatInfo) {
      return NextResponse.json(
        { error: 'Unsupported target format' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Initialize Sharp instance
    let sharpInstance = sharp(buffer);

    // Configure conversion based on target format
    let convertedBuffer: Buffer;
    
    switch (targetFormat) {
      case 'jpeg':
      case 'jpg':
        convertedBuffer = await sharpInstance
          .jpeg({ 
            quality: formatInfo.quality || 85,
            progressive: true,
            mozjpeg: true 
          })
          .toBuffer();
        break;
        
      case 'png':
        convertedBuffer = await sharpInstance
          .png({ 
            compressionLevel: 9,
            progressive: true
          })
          .toBuffer();
        break;
        
      case 'webp':
        convertedBuffer = await sharpInstance
          .webp({ 
            quality: formatInfo.quality || 85,
            effort: 6
          })
          .toBuffer();
        break;
        
      case 'avif':
        convertedBuffer = await sharpInstance
          .avif({ 
            quality: formatInfo.quality || 85,
            effort: 9
          })
          .toBuffer();
        break;
        
      case 'tiff':
        convertedBuffer = await sharpInstance
          .tiff({ 
            compression: 'lzw',
            quality: 85
          })
          .toBuffer();
        break;
        
      case 'gif':
        // Note: Sharp doesn't support GIF output, so we'll convert to PNG
        convertedBuffer = await sharpInstance
          .png({ 
            compressionLevel: 9
          })
          .toBuffer();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Conversion to this format is not supported' },
          { status: 400 }
        );
    }

    // Return the converted image
    return new NextResponse(convertedBuffer, {
      status: 200,
      headers: {
        'Content-Type': formatInfo.mimeType,
        'Content-Length': convertedBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="converted.${targetFormat}"`,
      },
    });

  } catch (error) {
    console.error('Image conversion error:', error);
    
    // Handle specific Sharp errors
    if (error instanceof Error) {
      if (error.message.includes('Input file contains unsupported image format')) {
        return NextResponse.json(
          { error: 'Unsupported input image format. Please try a different image.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Input buffer contains unsupported image format')) {
        return NextResponse.json(
          { error: 'The image file appears to be corrupted or in an unsupported format.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Image is too large')) {
        return NextResponse.json(
          { error: 'The image is too large to process. Please try a smaller image.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to convert image. Please try again with a different image.' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;