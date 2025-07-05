"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/FileUpload";
import { LocationViewer } from "@/components/LocationViewer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  Eye, EyeOff, Search, AlertTriangle, Shield, ShieldAlert, 
  Image as ImageIcon, MapPin, Calendar, Camera, Settings 
} from "lucide-react";
import { ProcessedExifData, ExifTag } from "@/types/exif";
import { PRIVACY_CATEGORIES } from "@/types/exif";
import { formatFileSize, formatDate, getImagePreviewUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ExifViewerProps {
  uploadedImage: File | null;
  setUploadedImage: (file: File | null) => void;
}

export function ExifViewer({ uploadedImage, setUploadedImage }: ExifViewerProps) {
  const [exifData, setExifData] = useState<ProcessedExifData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRawData, setShowRawData] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'high' | 'medium' | 'safe'>('all');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Add refs and mobile detection
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedImage(file);
    setLoading(true);
    setError(null);
    setExifData(null);
    
    // Create preview URL
    const previewUrl = getImagePreviewUrl(file);
    setImagePreview(previewUrl);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/extract-exif', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: ProcessedExifData = await response.json();
      setExifData(result);
    } catch (err) {
      console.error('EXIF extraction error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Upload timed out. Please try with a smaller image.');
        } else if (err.message.includes('JSON')) {
          setError('Server error: Invalid response format. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [setUploadedImage]);

  // Optimized search with debouncing and memoization
  const handleSearchChange = useCallback((value: string) => {
    try {
      setSearchTerm(value);
    } catch (error) {
      console.error('Search error:', error);
      // Fallback: don't update search term if error occurs
    }
  }, []);

  // Memoized filtered tags with error protection
  const filteredTags = useMemo(() => {
    if (!exifData?.tags) return [];
    
    try {
      return exifData.tags.filter(tag => {
        // Safely convert values to strings
        let tagString = '';
        let valueString = '';
        
        try {
          tagString = String(tag.tag || '').toLowerCase();
          valueString = String(tag.value || '').toLowerCase();
        } catch (e) {
          // If conversion fails, skip this tag
          return false;
        }

        const matchesSearch = searchTerm === '' || 
          tagString.includes(searchTerm.toLowerCase()) ||
          valueString.includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      });
    } catch (error) {
      console.error('Filter error:', error);
      return exifData.tags; // Return all tags if filtering fails
    }
  }, [exifData?.tags, searchTerm, selectedCategory]);

  // Memoized category stats
  const categoryStats = useMemo(() => {
    if (!exifData?.tags) return { high: 0, medium: 0, safe: 0 };
    
    try {
      return exifData.tags.reduce((acc, tag) => {
        acc[tag.category] = (acc[tag.category] || 0) + 1;
        return acc;
      }, { high: 0, medium: 0, safe: 0 } as Record<'high' | 'medium' | 'safe', number>);
    } catch (error) {
      console.error('Category stats error:', error);
      return { high: 0, medium: 0, safe: 0 };
    }
  }, [exifData?.tags]);

  const getCategoryIcon = (category: 'high' | 'medium' | 'safe') => {
    switch (category) {
      case 'high': return <ShieldAlert className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'safe': return <Shield className="w-4 h-4" />;
    }
  };

  // Safe value display function
  const displayValue = useCallback((value: any, showRaw: boolean) => {
    try {
      if (showRaw) {
        return JSON.stringify(value);
      }
      
      // Handle different value types safely
      if (value === null || value === undefined) {
        return 'N/A';
      }
      
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    } catch (error) {
      console.error('Value display error:', error);
      return 'Display Error';
    }
  }, []);

  if (!uploadedImage) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">EXIF Data Viewer</h2>
          <p className="text-muted-foreground mb-6">
            Upload an image to analyze its metadata and discover hidden information
          </p>
        </div>
        
        <FileUpload 
          onFileUpload={handleFileUpload}
          acceptedTypes={["image/*"]}
          maxSize={50 * 1024 * 1024}
        />
        
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacy Notice:</strong> Images are processed securely and temporarily. 
            No data is permanently stored or shared.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Image Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Image Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview && (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Uploaded image"
                  className="w-full h-64 object-contain rounded-lg bg-muted"
                  loading="lazy"
                />
                {exifData?.imageInfo && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/80 text-white">
                      {exifData.imageInfo.format.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            {exifData?.imageInfo && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Filename:</span>
                  <p className="font-medium truncate">{exifData.imageInfo.filename}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{formatFileSize(exifData.imageInfo.size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dimensions:</span>
                  <p className="font-medium">
                    {exifData.imageInfo.width} × {exifData.imageInfo.height}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <p className="font-medium">{exifData.imageInfo.format}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Overview */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isMobile ? 'Processing... This may take a moment' : 'Processing image...'}
                </span>
              </div>
            )}
            
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {exifData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(PRIVACY_CATEGORIES).map(([key, category]) => (
                    <div key={key} className={cn("p-3 rounded-lg border", category.bgClass)}>
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(key as any)}
                        <span className="font-medium text-sm">{category.label}</span>
                      </div>
                      <p className="text-2xl font-bold">{categoryStats[key as keyof typeof categoryStats]}</p>
                      <p className="text-xs opacity-80">{category.description}</p>
                    </div>
                  ))}
                </div>
                
                {exifData.gpsData && (
                  <Alert className="bg-red-500/20 border-red-500/40">
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Location data detected!</strong> This image contains GPS coordinates.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GPS Map Viewer */}
      {exifData?.gpsData && (
        <LocationViewer gpsData={exifData.gpsData} />
      )}

      {/* EXIF Data Table */}
      {exifData && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                EXIF Metadata ({exifData.tags.length} tags)
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRawData(!showRawData)}
                  className="flex items-center gap-2"
                >
                  {showRawData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showRawData ? 'Hide Raw' : 'Show Raw'}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {['all', 'high', 'medium', 'safe'].map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category as any)}
                    className={cn(
                      "capitalize",
                      selectedCategory === category && category !== 'all' && {
                        'high': 'bg-red-500 hover:bg-red-600',
                        'medium': 'bg-yellow-500 hover:bg-yellow-600',
                        'safe': 'bg-green-500 hover:bg-green-600',
                      }[category]
                    )}
                  >
                    {category}
                    {category !== 'all' && (
                      <Badge variant="secondary" className="ml-2 bg-white/20">
                        {categoryStats[category as keyof typeof categoryStats]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {filteredTags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No tags match your search.' : 'No EXIF data found.'}
                </div>
              ) : (
                filteredTags.slice(0, isMobile ? 20 : 100).map((tag, index) => (
                  <div key={`${tag.tag}-${index}`} className={cn(
                    "p-4 rounded-lg border transition-all hover:scale-[1.01]",
                    PRIVACY_CATEGORIES[tag.category].bgClass
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(tag.category)}
                          <span className="font-semibold">{tag.tag}</span>
                          <Badge 
                            variant="secondary" 
                            className="bg-white/20 text-xs"
                          >
                            {PRIVACY_CATEGORIES[tag.category].label}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-80 mb-2">{tag.description}</p>
                        <div className="font-mono text-sm bg-white/10 p-2 rounded border break-all">
                          {displayValue(tag.value, showRawData)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Mobile: Show load more button if there are more tags */}
              {isMobile && filteredTags.length > 20 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing first 20 of {filteredTags.length} tags. Use search to find specific tags.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => {
            setUploadedImage(null);
            setExifData(null);
            setImagePreview(null);
            setError(null);
            setSearchTerm("");
            setSelectedCategory('all');
          }}
        >
          Upload Another Image
        </Button>
      </div>
    </div>
  );
}