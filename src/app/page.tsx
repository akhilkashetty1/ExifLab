"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ExifViewer } from "@/components/ExifViewer";
import { ImageConverter } from "@/components/ImageConverter";
import { ImagePuzzle } from "@/components/ImagePuzzle";
import { Eye, RefreshCw, Puzzle, Camera } from "lucide-react";

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
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