import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const gridSizeParam = formData.get('gridSize') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    const gridSize = parseInt(gridSizeParam) || 3;
    if (gridSize < 2 || gridSize > 8) {
      return NextResponse.json(
        { error: 'Grid size must be between 2 and 8' },
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

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Unable to read image dimensions' },
        { status: 400 }
      );
    }

    // Calculate puzzle piece dimensions
    const puzzleSize = 400; // Target puzzle size in pixels
    const pieceSize = Math.floor(puzzleSize / gridSize);
    const totalPuzzleSize = pieceSize * gridSize;

    // Resize image to fit puzzle dimensions while maintaining aspect ratio
    let resizedBuffer: Buffer;
    if (metadata.width > metadata.height) {
      // Landscape: fit to width
      resizedBuffer = await sharp(buffer)
        .resize(totalPuzzleSize, null, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      // Portrait or square: fit to height
      resizedBuffer = await sharp(buffer)
        .resize(null, totalPuzzleSize, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // Get final dimensions after resize
    const resizedMetadata = await sharp(resizedBuffer).metadata();
    const finalWidth = resizedMetadata.width!;
    const finalHeight = resizedMetadata.height!;

    // Calculate actual piece dimensions based on resized image
    const actualPieceWidth = Math.floor(finalWidth / gridSize);
    const actualPieceHeight = Math.floor(finalHeight / gridSize);

    // Create puzzle pieces
    const pieces: string[] = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const left = col * actualPieceWidth;
        const top = row * actualPieceHeight;
        
        // Ensure we don't go beyond image boundaries
        const width = Math.min(actualPieceWidth, finalWidth - left);
        const height = Math.min(actualPieceHeight, finalHeight - top);

        if (width > 0 && height > 0) {
          const pieceBuffer = await sharp(resizedBuffer)
            .extract({
              left,
              top,
              width,
              height
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Convert to base64 data URL
          const base64 = pieceBuffer.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          pieces.push(dataUrl);
        } else {
          // If piece is too small, create a blank piece
          const blankPiece = await sharp({
            create: {
              width: actualPieceWidth,
              height: actualPieceHeight,
              channels: 3,
              background: { r: 240, g: 240, b: 240 }
            }
          })
          .jpeg({ quality: 85 })
          .toBuffer();

          const base64 = blankPiece.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          pieces.push(dataUrl);
        }
      }
    }

    return NextResponse.json({
      pieces,
      gridSize,
      pieceWidth: actualPieceWidth,
      pieceHeight: actualPieceHeight,
      totalPieces: pieces.length,
    });

  } catch (error) {
    console.error('Image slicing error:', error);
    
    // Handle specific Sharp errors
    if (error instanceof Error) {
      if (error.message.includes('Input file contains unsupported image format')) {
        return NextResponse.json(
          { error: 'Unsupported image format. Please try a different image.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Input buffer contains unsupported image format')) {
        return NextResponse.json(
          { error: 'The image file appears to be corrupted.' },
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
      { error: 'Failed to create puzzle pieces. Please try again with a different image.' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;