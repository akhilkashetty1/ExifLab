"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ExifViewer } from "@/components/ExifViewer";
import { ImageConverter } from "@/components/ImageConverter";
import { ImagePuzzle } from "@/components/ImagePuzzle";
import { Eye, RefreshCw, Puzzle, Camera, Sparkles, Zap, ArrowRight, Clock } from "lucide-react";

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 mb-6">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
          ExifLab
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Discover hidden metadata in your images with our advanced analysis tool. 
          Privacy-focused, secure, and blazingly fast.
        </p>
      </div>

      {/* Interactive Flagship Feature Banner */}
      <div className="relative max-w-4xl mx-auto mb-12 group">
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-purple-500/10 border border-purple-500/20 backdrop-blur hover:border-purple-500/40 transition-all duration-500">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-purple-500/5 animate-pulse" />
          
          {/* Floating particles animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
            <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
            <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-purple-300/40 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '4s' }} />
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-300/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
          </div>

          <CardContent className="relative p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 text-cyan-400 animate-ping opacity-30">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Coming Soon
              </span>
              <div className="relative">
                <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 text-purple-400 animate-ping opacity-30">
                  <Zap className="w-8 h-8" />
                </div>
              </div>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
              AI-Powered Metadata Cleaner
            </h3>
            
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              Revolutionary AI technology that automatically detects and removes sensitive metadata while preserving image quality. 
              <span className="text-purple-300 font-medium"> One-click privacy protection</span> for all your photos.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300">Beta launching Q2 2025</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300">10x faster than manual removal</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer group-hover:gap-3 transition-all duration-300">
              <span className="font-medium">Stay tuned for early access</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </CardContent>
        </Card>

        {/* Outer glow effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 blur-xl rounded-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
      </div>

      {/* Main Application Tabs */}
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="exif" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-card/50 backdrop-blur">
            <TabsTrigger 
              value="exif" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-cyan-500"
            >
              <Eye className="w-4 h-4" />
              EXIF Viewer
            </TabsTrigger>
            <TabsTrigger 
              value="converter"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-cyan-500"
            >
              <RefreshCw className="w-4 h-4" />
              Converter
            </TabsTrigger>
            <TabsTrigger 
              value="puzzle"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-cyan-500"
            >
              <Puzzle className="w-4 h-4" />
              Puzzle Game
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exif" className="mt-0">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <ExifViewer 
                  uploadedImage={uploadedImage} 
                  setUploadedImage={setUploadedImage} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="converter" className="mt-0">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <ImageConverter />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="puzzle" className="mt-0">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <ImagePuzzle uploadedImage={uploadedImage} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-semibold mb-2">Privacy Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Automatically categorizes sensitive metadata with color-coded warnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="font-semibold mb-2">Format Conversion</h3>
            <p className="text-sm text-muted-foreground">
              Convert between JPEG, PNG, WebP, AVIF and more with optimized compression
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Puzzle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Interactive Features</h3>
            <p className="text-sm text-muted-foreground">
              GPS mapping, puzzle games, and engaging user experiences
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}