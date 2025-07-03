"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle } from "lucide-react";
import { validateImageFile, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  disabled?: boolean;
}

export function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ["image/*"], 
  maxSize = 50 * 1024 * 1024,
  disabled = false 
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setUploading(false);
      return;
    }

    // Simulate upload progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Small delay to show progress animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUploadProgress(100);
      onFileUpload(file);
      
      // Reset progress after successful upload
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
      setUploading(false);
      clearInterval(progressInterval);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: false,
    disabled: disabled || uploading,
  });

  return (
    <div className="w-full">
      <Card 
        {...getRootProps()} 
        className={cn(
          "transition-all duration-200 cursor-pointer border-2 border-dashed hover:border-primary/50",
          isDragActive && !isDragReject && "border-primary bg-primary/5 scale-105",
          isDragReject && "border-red-500 bg-red-500/5",
          uploading && "pointer-events-none opacity-75",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <input {...getInputProps()} />
          
          <div className="text-center">
            <div className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all",
              isDragActive && !isDragReject 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground",
              isDragReject && "bg-red-500/20 text-red-500"
            )}>
              {uploading ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            
            {uploading ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold">Uploading...</p>
                <div className="w-full max-w-xs mx-auto">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {isDragActive 
                    ? (isDragReject ? "File type not supported" : "Drop your image here") 
                    : "Upload an image to analyze"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop an image file, or{" "}
                  <Button variant="link" className="h-auto p-0 text-primary">
                    browse
                  </Button>
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-4">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    JPEG, PNG, WebP, TIFF
                  </div>
                  <div>•</div>
                  <div>Max {formatFileSize(maxSize)}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="mt-4 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadProgress === 100 && !error && (
        <Alert className="mt-4 bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>File uploaded successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  );
}