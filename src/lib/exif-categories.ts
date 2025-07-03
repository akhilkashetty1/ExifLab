import { ExifTag } from '@/types/exif';

// EXIF tag categorization based on privacy and security implications
export const EXIF_CATEGORIES = {
  // Most Sensitive (High Risk)
  high: [
    'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
    'GPSAltitude', 'GPSAltitudeRef', 'GPSTimeStamp', 'GPSDateStamp',
    'GPSProcessingMethod', 'GPSAreaInformation', 'GPSDestLatitude',
    'GPSDestLongitude', 'GPSImgDirection', 'GPSMapDatum',
    'DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate',
    'ModifyDate', 'FileModifyDate', 'FileAccessDate', 'FileCreateDate',
    'Artist', 'Copyright', 'OwnerName', 'CameraOwnerName',
    'SerialNumber', 'LensSerialNumber', 'InternalSerialNumber',
    'UserComment', 'ImageDescription', 'DocumentName', 'ImageUniqueID',
    'Software', 'ProcessingSoftware', 'HostComputer', 'Creator',
    'Publisher', 'Rights', 'Subject', 'Title', 'Description',
    // AI-generated content
    'Prompt', 'GeneratedBy', 'Model', 'Seed', 'Steps', 'CFGScale',
    'Sampler', 'NegativePrompt', 'Parameters',
  ],

  // Moderate Sensitivity (Medium Risk)
  medium: [
    'Make', 'Model', 'LensMake', 'LensModel', 'LensInfo',
    'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit',
    'FNumber', 'ExposureTime', 'ISO', 'ISOSpeedRatings', 'SensitivityType',
    'FocalLength', 'FocalLengthIn35mmFormat', 'MaxApertureValue',
    'ApertureValue', 'ShutterSpeedValue', 'ExposureMode', 'ExposureProgram',
    'ExposureBiasValue', 'MeteringMode', 'LightSource', 'Flash',
    'FlashMode', 'WhiteBalance', 'DigitalZoomRatio', 'SceneCaptureType',
    'GainControl', 'Contrast', 'Saturation', 'Sharpness',
    'SubjectDistanceRange', 'ImageNumber', 'FileNumber',
    'FirmwareVersion', 'LensType', 'ColorSpace', 'ExifVersion',
    'FlashpixVersion', 'ComponentsConfiguration', 'CompressedBitsPerPixel',
  ],

  // Safe (Low Risk)
  safe: [
    'ImageWidth', 'ImageHeight', 'ImageSize', 'Megapixels',
    'BitsPerSample', 'Compression', 'PhotometricInterpretation',
    'SamplesPerPixel', 'PlanarConfiguration', 'YCbCrSubSampling',
    'YCbCrPositioning', 'ReferenceBlackWhite', 'ColorComponents',
    'EncodingProcess', 'JFIFVersion', 'XMPToolkit', 'ThumbnailImage',
    'ThumbnailLength', 'ThumbnailOffset', 'PreviewImage', 'FileType',
    'FileTypeExtension', 'MIMEType', 'ExifByteOrder', 'CurrentIPTCDigest',
    'CodedCharacterSet', 'ApplicationRecordVersion', 'FileSize',
  ],
};

export function categorizeExifTag(tagName: string): 'high' | 'medium' | 'safe' {
  const lowerTag = tagName.toLowerCase();
  
  // Check high sensitivity tags
  for (const highTag of EXIF_CATEGORIES.high) {
    if (lowerTag.includes(highTag.toLowerCase()) || 
        tagName === highTag ||
        lowerTag === highTag.toLowerCase()) {
      return 'high';
    }
  }
  
  // Check medium sensitivity tags
  for (const mediumTag of EXIF_CATEGORIES.medium) {
    if (lowerTag.includes(mediumTag.toLowerCase()) || 
        tagName === mediumTag ||
        lowerTag === mediumTag.toLowerCase()) {
      return 'medium';
    }
  }
  
  // Check if it's a known safe tag
  for (const safeTag of EXIF_CATEGORIES.safe) {
    if (lowerTag.includes(safeTag.toLowerCase()) || 
        tagName === safeTag ||
        lowerTag === safeTag.toLowerCase()) {
      return 'safe';
    }
  }
  
  // Special pattern matching for unknown tags
  if (lowerTag.includes('gps') || 
      lowerTag.includes('location') || 
      lowerTag.includes('coordinate')) {
    return 'high';
  }
  
  if (lowerTag.includes('date') || 
      lowerTag.includes('time') || 
      lowerTag.includes('owner') || 
      lowerTag.includes('artist') || 
      lowerTag.includes('serial')) {
    return 'high';
  }
  
  if (lowerTag.includes('camera') || 
      lowerTag.includes('lens') || 
      lowerTag.includes('exposure') || 
      lowerTag.includes('iso') || 
      lowerTag.includes('focal')) {
    return 'medium';
  }
  
  // Default to medium for unknown tags to be safe
  return 'medium';
}

export function getTagDescription(tagName: string, value: any): string {
  const descriptions: Record<string, string> = {
    // GPS Tags
    'GPSLatitude': 'Geographical latitude where the image was captured',
    'GPSLongitude': 'Geographical longitude where the image was captured',
    'GPSAltitude': 'Altitude above sea level where the image was captured',
    'DateTimeOriginal': 'Date and time when the image was originally captured',
    'DateTimeDigitized': 'Date and time when the image was digitized',
    'DateTime': 'Date and time when the image file was last modified',
    
    // Camera Info
    'Make': 'Camera manufacturer',
    'Model': 'Camera model',
    'LensMake': 'Lens manufacturer',
    'LensModel': 'Lens model',
    'SerialNumber': 'Camera serial number',
    
    // Technical Settings
    'FNumber': 'Aperture f-stop value',
    'ExposureTime': 'Shutter speed',
    'ISO': 'ISO sensitivity setting',
    'FocalLength': 'Lens focal length',
    'Flash': 'Flash mode used',
    'WhiteBalance': 'White balance setting',
    
    // Image Properties
    'ImageWidth': 'Image width in pixels',
    'ImageHeight': 'Image height in pixels',
    'Orientation': 'Image orientation',
    'ColorSpace': 'Color space used',
    'Compression': 'Compression method',
    
    // Software
    'Software': 'Software used to create/edit the image',
    'Artist': 'Name of the image creator',
    'Copyright': 'Copyright information',
    'UserComment': 'User-entered comment',
    'ImageDescription': 'Description of the image',
    
    // AI-Generated
    'Prompt': 'Text prompt used to generate the image',
    'Models': 'AI model used for generation',
    'Seed': 'Random seed used for generation',
    'Steps': 'Number of generation steps',
  };
  
  return descriptions[tagName] || `EXIF tag: ${tagName}`;
}

export function processExifData(rawData: Record<string, any>): ExifTag[] {
  const processedTags: ExifTag[] = [];
  
  // Filter out undefined, null, and empty values
  const cleanData = Object.entries(rawData).filter(([key, value]) => 
    value !== undefined && 
    value !== null && 
    value !== '' &&
    !key.startsWith('_') // Remove internal properties
  );
  
  for (const [tagName, value] of cleanData) {
    const category = categorizeExifTag(tagName);
    const description = getTagDescription(tagName, value);
    
    // Format the value for display
    let displayValue = value;
    if (typeof value === 'object' && value !== null) {
      displayValue = JSON.stringify(value);
    } else if (typeof value === 'number' && value % 1 !== 0) {
      displayValue = Number(value.toFixed(6));
    }
    
    processedTags.push({
      tag: tagName,
      value: displayValue,
      description,
      category,
    });
  }
  
  // Sort by category (high risk first) and then alphabetically
  return processedTags.sort((a, b) => {
    const categoryOrder = { high: 0, medium: 1, safe: 2 };
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    return a.tag.localeCompare(b.tag);
  });
}