import { ExifTag } from '@/types/exif';

// COMPREHENSIVE EXIF Privacy Classification based on research findings
export const EXIF_PRIVACY_CATEGORIES = {
  // MOST SENSITIVE (High Risk) - Can lead to stalking, harassment, identity theft
  high: [
    // GPS/Location Data - PRIMARY PRIVACY THREAT
    'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
    'GPSAltitude', 'GPSAltitudeRef', 'GPSTimeStamp', 'GPSDateStamp', 'GPSProcessingMethod', 
    'GPSAreaInformation', 'GPSDestLatitude', 'GPSDestLongitude', 'GPSImgDirection', 'GPSMapDatum',
    'GPSSatellites', 'GPSStatus', 'GPSMeasureMode', 'GPSDOP', 'GPSSpeed', 'GPSTrack',

    // Date/Time - Can reveal personal patterns and routines
    'DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate', 'ModifyDate',
    'FileModifyDate', 'FileAccessDate', 'FileCreateDate',

    // Personal/Identity Information
    'Artist', 'Copyright', 'OwnerName', 'CameraOwnerName', 'Creator', 'Publisher', 'Rights',
    'Author', 'By-line', 'CopyrightNotice', 'Credit', 'Source',

    // Device Serial Numbers - Can be used for device fingerprinting
    'SerialNumber', 'LensSerialNumber', 'InternalSerialNumber', 'BodySerialNumber',
    'CameraSerialNumber', 'ImageUniqueID',

    // User-Generated Content - Often contains personal information
    'UserComment', 'ImageDescription', 'DocumentName', 'Title', 'Description', 'Subject',
    'Keywords', 'Comment', 'Instructions', 'XPComment', 'XPSubject', 'XPTitle', 'XPKeywords',

    // AI-Generated Content - May contain prompts revealing personal interests
    'Prompt', 'GeneratedBy', 'Model', 'Seed', 'Steps', 'CFGScale', 'Sampler', 'NegativePrompt', 
    'Parameters', 'AIModel', 'GenerationSettings',

    // Software/System Information - Can reveal security vulnerabilities  
    'Software', 'ProcessingSoftware', 'HostComputer', 'OperatingSystem', 'SoftwareVersion',
  ],

  // MODERATE SENSITIVITY (Medium Risk) - Technical metadata that can reveal equipment/habits
  medium: [
    // Camera Equipment - Can reveal expensive equipment ownership
    'Make', 'Model', 'LensMake', 'LensModel', 'LensInfo', 'LensType', 'LensSpecification',
    'CameraModelName', 'LensModelName',

    // Camera Settings - Photography technique fingerprinting
    'FNumber', 'ExposureTime', 'ISO', 'ISOSpeedRatings', 'SensitivityType', 'FocalLength',
    'FocalLengthIn35mmFormat', 'MaxApertureValue', 'ApertureValue', 'ShutterSpeedValue',
    'ExposureMode', 'ExposureProgram', 'ExposureBiasValue', 'MeteringMode', 'LightSource',
    'Flash', 'FlashMode', 'WhiteBalance', 'DigitalZoomRatio', 'SceneCaptureType',
    'GainControl', 'Contrast', 'Saturation', 'Sharpness', 'SubjectDistanceRange',

    // Technical Image Data
    'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit', 'ColorSpace',
    'ExifVersion', 'FlashpixVersion', 'ComponentsConfiguration', 'CompressedBitsPerPixel',
    'FirmwareVersion', 'LensType',

    // File Metadata
    'FileName', 'ImageNumber', 'FileNumber', 'ShutterCount',
  ],

  // SAFE (Low Risk) - Technical specifications with minimal privacy impact
  safe: [
    // Basic Image Properties
    'ImageWidth', 'ImageHeight', 'ImageSize', 'Megapixels', 'ExifImageWidth', 'ExifImageHeight',
    'BitsPerSample', 'Compression', 'PhotometricInterpretation', 'SamplesPerPixel',
    'PlanarConfiguration', 'YCbCrSubSampling', 'YCbCrPositioning', 'ReferenceBlackWhite',
    'ColorComponents', 'EncodingProcess',

    // File Format Information  
    'FileType', 'FileTypeExtension', 'MIMEType', 'ExifByteOrder', 'FileSize',

    // Standard Format Tags
    'JFIFVersion', 'XMPToolkit', 'CurrentIPTCDigest', 'CodedCharacterSet', 
    'ApplicationRecordVersion',

    // Thumbnail Data
    'ThumbnailImage', 'ThumbnailLength', 'ThumbnailOffset', 'PreviewImage',

    // Color Profile Data
    'ColorProfile', 'ICCProfile', 'ColorMode', 'ColorTemperature',
  ],
};

// EXIF Tag ID to human-readable name mapping
export const EXIF_TAG_NAMES: Record<string, string> = {
  // GPS Tags
  '0': 'GPSVersionID', '1': 'GPSLatitudeRef', '2': 'GPSLatitude', '3': 'GPSLongitudeRef', 
  '4': 'GPSLongitude', '5': 'GPSAltitudeRef', '6': 'GPSAltitude', '7': 'GPSTimeStamp',
  '8': 'GPSSatellites', '9': 'GPSStatus', '10': 'GPSMeasureMode', '11': 'GPSDOP',
  '12': 'GPSSpeedRef', '13': 'GPSSpeed', '14': 'GPSTrackRef', '15': 'GPSTrack',
  '16': 'GPSImgDirectionRef', '17': 'GPSImgDirection', '18': 'GPSMapDatum',
  '19': 'GPSDestLatitudeRef', '20': 'GPSDestLatitude', '21': 'GPSDestLongitudeRef',
  '22': 'GPSDestLongitude', '29': 'GPSDateStamp',

  // Basic TIFF Tags
  '271': 'Make', '272': 'Model', '274': 'Orientation', '282': 'XResolution', 
  '283': 'YResolution', '296': 'ResolutionUnit', '305': 'Software', '306': 'DateTime',
  '315': 'Artist', '33432': 'Copyright',

  // EXIF Tags  
  '33434': 'ExposureTime', '33437': 'FNumber', '34855': 'ISO', '34850': 'ExposureProgram',
  '36864': 'ExifVersion', '36867': 'DateTimeOriginal', '36868': 'DateTimeDigitized',
  '37121': 'ComponentsConfiguration', '37377': 'ShutterSpeedValue', '37378': 'ApertureValue',
  '37380': 'ExposureBiasValue', '37381': 'MaxApertureValue', '37383': 'MeteringMode',
  '37384': 'LightSource', '37385': 'Flash', '37386': 'FocalLength', '37510': 'UserComment',
  '40960': 'FlashpixVersion', '40961': 'ColorSpace', '40962': 'ExifImageWidth', 
  '40963': 'ExifImageHeight', '41728': 'FileSource', '41729': 'SceneType',
  '41985': 'CustomRendered', '41986': 'ExposureMode', '41987': 'WhiteBalance',
  '41988': 'DigitalZoomRatio', '41989': 'FocalLengthIn35mmFormat', '41990': 'SceneCaptureType',
  '41991': 'GainControl', '41992': 'Contrast', '41993': 'Saturation', '41994': 'Sharpness',
  '41996': 'SubjectDistanceRange', '42032': 'CameraOwnerName', '42033': 'BodySerialNumber',
  '42034': 'LensSpecification', '42035': 'LensMake', '42036': 'LensModel',
  '42037': 'LensSerialNumber',

  // Common numeric tags
  '531': 'YCbCrPositioning',

  // Already human-readable tags (pass through)
  'latitude': 'GPSLatitude', 'longitude': 'GPSLongitude', 'altitude': 'GPSAltitude',
  'FileName': 'FileName', 'FileSize': 'FileSize', 'FileType': 'FileType',
  'MIMEType': 'MIMEType', 'ImageWidth': 'ImageWidth', 'ImageHeight': 'ImageHeight',
};

// EXIF Tag descriptions for better user understanding
export const EXIF_TAG_DESCRIPTIONS: Record<string, string> = {
  // GPS/Location (HIGH RISK)
  'GPSLatitude': 'Exact geographical latitude where the image was captured - MAJOR PRIVACY RISK',
  'GPSLongitude': 'Exact geographical longitude where the image was captured - MAJOR PRIVACY RISK',
  'GPSAltitude': 'Altitude above sea level where the image was captured',
  'GPSLatitudeRef': 'Direction reference (North/South) for latitude coordinates',
  'GPSLongitudeRef': 'Direction reference (East/West) for longitude coordinates',
  'GPSTimeStamp': 'Exact time when GPS coordinates were recorded',
  'GPSDateStamp': 'Date when GPS coordinates were recorded',
  'GPSMapDatum': 'Geodetic coordinate system used for GPS positioning',
  'GPSSatellites': 'GPS satellites used for position calculation',

  // Date/Time (HIGH RISK)
  'DateTimeOriginal': 'Date and time when the image was originally captured - can reveal personal patterns',
  'DateTimeDigitized': 'Date and time when the image was digitized',
  'DateTime': 'Date and time when the image file was last modified',

  // Personal Information (HIGH RISK)
  'Artist': 'Name of the image creator or photographer',
  'Copyright': 'Copyright information that may contain personal details',
  'CameraOwnerName': 'Name of the camera owner',
  'BodySerialNumber': 'Camera body serial number - can be used for device tracking',
  'LensSerialNumber': 'Lens serial number - can be used for device tracking',
  'UserComment': 'User-entered comment that may contain personal information',

  // Camera Equipment (MEDIUM RISK)
  'Make': 'Camera manufacturer (e.g., Canon, Nikon, Apple)',
  'Model': 'Camera model - can indicate expensive equipment ownership',
  'LensMake': 'Lens manufacturer',
  'LensModel': 'Lens model and specifications',
  'Software': 'Software used to create or edit the image',

  // Camera Settings (MEDIUM RISK)
  'FNumber': 'Aperture f-stop value used (affects depth of field)',
  'ExposureTime': 'Shutter speed used for the exposure',
  'ISO': 'ISO sensitivity setting used',
  'FocalLength': 'Lens focal length used for the shot',
  'Flash': 'Flash mode and settings used',
  'WhiteBalance': 'White balance setting used',
  'ExposureMode': 'Exposure mode (manual, auto, etc.)',
  'MeteringMode': 'Light metering mode used',

  // Image Properties (SAFE)
  'ImageWidth': 'Image width in pixels',
  'ImageHeight': 'Image height in pixels',
  'Orientation': 'Image orientation (rotation)',
  'XResolution': 'Horizontal resolution',
  'YResolution': 'Vertical resolution',
  'ColorSpace': 'Color space used (sRGB, Adobe RGB, etc.)',
  'FileSize': 'File size in bytes',
  'FileType': 'Image file format (JPEG, PNG, etc.)',
  'MIMEType': 'MIME type of the image file',
  'FileName': 'Original filename of the image',
};

export function categorizeExifTag(tagName: string): 'high' | 'medium' | 'safe' {
  const lowerTag = tagName.toLowerCase();
  
  // Check high sensitivity tags first (most important)
  for (const highTag of EXIF_PRIVACY_CATEGORIES.high) {
    if (lowerTag === highTag.toLowerCase() || 
        lowerTag.includes(highTag.toLowerCase()) ||
        tagName === highTag) {
      return 'high';
    }
  }
  
  // Special pattern matching for GPS and location data
  if (lowerTag.includes('gps') || 
      lowerTag.includes('location') || 
      lowerTag.includes('coordinate') ||
      lowerTag.includes('latitude') ||
      lowerTag.includes('longitude')) {
    return 'high';
  }
  
  // Date/time patterns
  if (lowerTag.includes('date') || 
      lowerTag.includes('time') && !lowerTag.includes('timezone')) {
    return 'high';
  }
  
  // Personal information patterns
  if (lowerTag.includes('owner') || 
      lowerTag.includes('artist') || 
      lowerTag.includes('serial') ||
      lowerTag.includes('comment') ||
      lowerTag.includes('author') ||
      lowerTag.includes('copyright')) {
    return 'high';
  }
  
  // Check medium sensitivity tags
  for (const mediumTag of EXIF_PRIVACY_CATEGORIES.medium) {
    if (lowerTag === mediumTag.toLowerCase() || 
        lowerTag.includes(mediumTag.toLowerCase()) ||
        tagName === mediumTag) {
      return 'medium';
    }
  }
  
  // Camera equipment patterns
  if (lowerTag.includes('camera') || 
      lowerTag.includes('lens') || 
      lowerTag.includes('make') ||
      lowerTag.includes('model') && !lowerTag.includes('color')) {
    return 'medium';
  }
  
  // Technical photography patterns
  if (lowerTag.includes('exposure') || 
      lowerTag.includes('iso') || 
      lowerTag.includes('focal') ||
      lowerTag.includes('aperture') ||
      lowerTag.includes('shutter') ||
      lowerTag.includes('flash') ||
      lowerTag.includes('white') ||
      lowerTag.includes('orientation')) {
    return 'medium';
  }
  
  // Check safe tags
  for (const safeTag of EXIF_PRIVACY_CATEGORIES.safe) {
    if (lowerTag === safeTag.toLowerCase() || 
        lowerTag.includes(safeTag.toLowerCase()) ||
        tagName === safeTag) {
      return 'safe';
    }
  }
  
  // Default to medium for unknown tags (better safe than sorry)
  return 'medium';
}

export function getTagDescription(tagName: string, value: any): string {
  // Check if we have a specific description
  if (EXIF_TAG_DESCRIPTIONS[tagName]) {
    return EXIF_TAG_DESCRIPTIONS[tagName];
  }
  
  // Generate contextual descriptions based on tag patterns
  const lowerTag = tagName.toLowerCase();
  
  if (lowerTag.includes('gps') || lowerTag.includes('latitude') || lowerTag.includes('longitude')) {
    return `GPS location data - reveals exact geographical coordinates where image was taken`;
  }
  
  if (lowerTag.includes('date') || lowerTag.includes('time')) {
    return `Date/time information - can reveal personal patterns and routines`;
  }
  
  if (lowerTag.includes('serial') || lowerTag.includes('id')) {
    return `Device identifier - can be used for tracking across multiple images`;
  }
  
  if (lowerTag.includes('make') || lowerTag.includes('model')) {
    return `Equipment information - reveals camera/device specifications`;
  }
  
  if (lowerTag.includes('software') || lowerTag.includes('version')) {
    return `Software information - reveals applications used to create or edit image`;
  }
  
  // Generic fallback
  return `EXIF metadata: ${tagName}`;
}

export function normalizeTagName(tagName: string): string {
  // Convert numeric tag IDs to human-readable names
  if (EXIF_TAG_NAMES[tagName]) {
    return EXIF_TAG_NAMES[tagName];
  }
  
  // Handle numeric-only tags that we don't recognize
  if (/^\d+$/.test(tagName)) {
    return `Unknown_Tag_${tagName}`;
  }
  
  // Return as-is if already human-readable
  return tagName;
}

export function processExifData(rawData: Record<string, any>): ExifTag[] {
  const processedTags: ExifTag[] = [];
  
  // Filter out undefined, null, empty values, and internal properties
  const cleanData = Object.entries(rawData).filter(([key, value]) => 
    value !== undefined && 
    value !== null && 
    value !== '' &&
    !key.startsWith('_') &&
    !key.startsWith('$') &&
    // Filter out complex objects that aren't useful for display
    typeof value !== 'object' || Array.isArray(value) || value instanceof Date
  );
  
  for (const [tagName, value] of cleanData) {
    // Normalize tag name (convert numeric IDs to human names)
    const normalizedName = normalizeTagName(tagName);
    
    // Skip if this became an "Unknown_Tag" and the value isn't meaningful
    if (normalizedName.startsWith('Unknown_Tag_') && 
        (typeof value === 'object' && !Array.isArray(value))) {
      continue;
    }
    
    const category = categorizeExifTag(normalizedName);
    const description = getTagDescription(normalizedName, value);
    
    // Format the value for display
    let displayValue = value;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // For arrays, show them nicely formatted
        displayValue = value;
      } else if (value instanceof Date) {
        displayValue = value.toISOString();
      } else {
        // For other objects, stringify but limit length
        const stringified = JSON.stringify(value);
        displayValue = stringified.length > 100 ? 
          stringified.substring(0, 100) + '...' : stringified;
      }
    } else if (typeof value === 'number' && value % 1 !== 0) {
      // Round long decimals
      displayValue = Number(value.toFixed(6));
    }
    
    processedTags.push({
      tag: normalizedName,
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