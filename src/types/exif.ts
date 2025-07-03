export interface ExifTag {
  tag: string;
  value: any;
  description?: string;
  category: 'high' | 'medium' | 'safe';
  group?: string;
}

export interface ExifData {
  [key: string]: any;
}

export interface ProcessedExifData {
  tags: ExifTag[];
  imageInfo: {
    format: string;
    width: number;
    height: number;
    size: number;
    filename: string;
  };
  gpsData?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  errors?: string[];
}

export interface ImageFormat {
  extension: string;
  mimeType: string;
  name: string;
  quality?: number;
}

export interface ConversionProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface PuzzlePiece {
  id: number;
  currentPosition: number;
  correctPosition: number;
  imageData: string;
}

export interface PuzzleState {
  pieces: PuzzlePiece[];
  isComplete: boolean;
  moves: number;
  timeElapsed: number;
  gridSize: number;
}

export const SUPPORTED_FORMATS: ImageFormat[] = [
  { extension: 'jpeg', mimeType: 'image/jpeg', name: 'JPEG', quality: 85 },
  { extension: 'jpg', mimeType: 'image/jpeg', name: 'JPG', quality: 85 },
  { extension: 'png', mimeType: 'image/png', name: 'PNG' },
  { extension: 'webp', mimeType: 'image/webp', name: 'WebP', quality: 85 },
  { extension: 'avif', mimeType: 'image/avif', name: 'AVIF', quality: 85 },
  { extension: 'tiff', mimeType: 'image/tiff', name: 'TIFF' },
  { extension: 'gif', mimeType: 'image/gif', name: 'GIF' },
];

export const PRIVACY_CATEGORIES = {
  high: {
    label: 'Most Sensitive',
    color: 'red',
    description: 'High privacy/security risk',
    bgClass: 'privacy-high',
  },
  medium: {
    label: 'Moderate Sensitivity',
    color: 'yellow',
    description: 'Medium privacy risk',
    bgClass: 'privacy-medium',
  },
  safe: {
    label: 'Safe',
    color: 'green',
    description: 'Generally safe to share',
    bgClass: 'privacy-safe',
  },
} as const;