"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  RefreshCw, Download, Image as ImageIcon, 
  Zap, FileImage, CheckCircle, AlertCircle,
  Sparkles, Cpu, Layers
} from "lucide-react";
import { SUPPORTED_FORMATS } from "@/types/exif";
import { formatFileSize, downloadBlob, getImagePreviewUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ConversionState {
  stage: string;
  progress: number;
  message: string;
}

export function ImageConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>("webp");
  const [converting, setConverting] = useState(false);
  const [conversionState, setConversionState] = useState<ConversionState>({
    stage: "idle",
    progress: 0,
    message: ""
  });
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressionSavings, setCompressionSavings] = useState<number | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
    setConvertedBlob(null);
    setConvertedPreview(null);
    setCompressionSavings(null);
    
    const previewUrl = getImagePreviewUrl(file);
    setOriginalPreview(previewUrl);
  }, []);

  const simulateConversionProgress = useCallback(() => {
    const stages = [
      { stage: "analyzing", message: "Analyzing image structure...", progress: 15 },
      { stage: "decoding", message: "Decoding original format...", progress: 35 },
      { stage: "processing", message: "Optimizing pixels...", progress: 60 },
      { stage: "encoding", message: "Encoding to new format...", progress: 85 },
      { stage: "finalizing", message: "Finalizing conversion...", progress: 95 },
    ];

    let currentStage = 0;
    
    const updateStage = () => {
      if (currentStage < stages.length) {
        setConversionState(stages[currentStage]);
        currentStage++;
        setTimeout(updateStage, 400 + Math.random() * 300);
      }
    };

    updateStage();
  }, []);

  const convertImage = async () => {
    if (!selectedFile) return;

    setConverting(true);
    setError(null);
    setConversionState({ stage: "initializing", progress: 5, message: "Preparing conversion..." });
    
    // Start progress animation
    simulateConversionProgress();

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('format', targetFormat);

      const response = await fetch('/api/convert-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      setConvertedBlob(blob);
      
      // Create preview for converted image
      const convertedUrl = URL.createObjectURL(blob);
      setConvertedPreview(convertedUrl);
      
      // Calculate compression savings
      const savings = ((selectedFile.size - blob.size) / selectedFile.size) * 100;
      setCompressionSavings(savings);
      
      setConversionState({ 
        stage: "complete", 
        progress: 100, 
        message: "Conversion completed successfully!" 
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setConversionState({ 
        stage: "error", 
        progress: 0, 
        message: "Conversion failed" 
      });
    } finally {
      setTimeout(() => {
        setConverting(false);
      }, 1000);
    }
  };

  const downloadConverted = () => {
    if (!convertedBlob || !selectedFile) return;
    
    const originalName = selectedFile.name.split('.').slice(0, -1).join('.');
    const newExtension = SUPPORTED_FORMATS.find(f => f.extension === targetFormat)?.extension || targetFormat;
    const filename = `${originalName}.${newExtension}`;
    
    downloadBlob(convertedBlob, filename);
  };

  const resetConverter = () => {
    setSelectedFile(null);
    setConvertedBlob(null);
    setOriginalPreview(null);
    setConvertedPreview(null);
    setError(null);
    setCompressionSavings(null);
    setConversionState({ stage: "idle", progress: 0, message: "" });
  };

  const getFormatInfo = (format: string) => {
    return SUPPORTED_FORMATS.find(f => f.extension === format);
  };

  if (!selectedFile) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Image Format Converter</h2>
          <p className="text-muted-foreground mb-6">
            Convert your images between different formats with optimized compression
          </p>
        </div>
        
        <FileUpload 
          onFileUpload={handleFileUpload}
          acceptedTypes={["image/*"]}
          maxSize={50 * 1024 * 1024}
        />
        
        {/* Format Support Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUPPORTED_FORMATS.filter(f => ['jpeg', 'png', 'webp', 'avif'].includes(f.extension)).map((format) => (
            <Card key={format.extension} className="bg-card/30 border-border/50">
              <CardContent className="p-4 text-center">
                <FileImage className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{format.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {format.extension.toUpperCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Original Image Info */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Original Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {originalPreview && (
                <img 
                  src={originalPreview} 
                  alt="Original image"
                  className="w-full h-48 object-contain rounded-lg bg-muted"
                />
              )}
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Filename:</span>
                <p className="font-medium truncate">{selectedFile.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Size:</span>
                <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type:</span>
                <p className="font-medium">{selectedFile.type}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Settings */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Conversion Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Format</label>
              <Select value={targetFormat} onValueChange={setTargetFormat} disabled={converting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_FORMATS.map((format) => (
                    <SelectItem key={format.extension} value={format.extension}>
                      <div className="flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        <span>{format.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {format.extension.toUpperCase()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFormatInfo(targetFormat) && (
                <p className="text-xs text-muted-foreground">
                  {getFormatInfo(targetFormat)?.quality && 
                    `Quality: ${getFormatInfo(targetFormat)?.quality}%`
                  }
                </p>
              )}
            </div>
            
            <Button 
              onClick={convertImage} 
              disabled={converting || !targetFormat}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
            >
              {converting ? (
                <>
                  <LoadingSpinner />
                  Converting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Convert Image
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Progress */}
      {converting && (
        <Card className="bg-card/50 backdrop-blur border-orange-500/20">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-orange-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{conversionState.message}</p>
                  <p className="text-sm text-muted-foreground">Stage: {conversionState.stage}</p>
                </div>
                <span className="text-sm font-mono">{conversionState.progress}%</span>
              </div>
              <Progress value={conversionState.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Conversion Result */}
      {convertedBlob && !converting && (
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              Conversion Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Before</h4>
                {originalPreview && (
                  <img 
                    src={originalPreview} 
                    alt="Original"
                    className="w-full h-48 object-contain rounded-lg bg-muted"
                  />
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  Size: {formatFileSize(selectedFile.size)}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">After</h4>
                {convertedPreview && (
                  <img 
                    src={convertedPreview} 
                    alt="Converted"
                    className="w-full h-48 object-contain rounded-lg bg-muted"
                  />
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  Size: {formatFileSize(convertedBlob.size)}
                </div>
              </div>
            </div>

            {/* Compression Stats */}
            {compressionSavings !== null && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {compressionSavings > 0 ? '-' : '+'}{Math.abs(compressionSavings).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Size Change</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatFileSize(Math.abs(selectedFile.size - convertedBlob.size))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {compressionSavings > 0 ? 'Saved' : 'Added'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {getFormatInfo(targetFormat)?.name || targetFormat.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">New Format</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={downloadConverted}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Converted Image
              </Button>
              <Button 
                variant="outline" 
                onClick={resetConverter}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Convert Another Image
              </Button>
            </div>

            {/* Success Message */}
            <Alert className="bg-green-500/10 border-green-500/20">
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Your image has been successfully converted to {getFormatInfo(targetFormat)?.name || targetFormat}! 
                {compressionSavings && compressionSavings > 0 && (
                  ` You saved ${compressionSavings.toFixed(1)}% in file size.`
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}