import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ExifLab - Advanced Image Metadata Tool",
  description: "A sophisticated web-based application for analyzing image metadata, converting formats, and exploring GPS data with an amazing UI.",
  keywords: ["EXIF", "metadata", "image", "privacy", "GPS", "converter", "analysis"],
  authors: [{ name: "ExifLab Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body 
        className={cn(
          "min-h-screen bg-[#121212] font-sans antialiased",
          inter.variable
        )}
      >
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-cyan-500" />
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  ExifLab
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Advanced Image Metadata Tool</span>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-border/40 bg-background/95 backdrop-blur">
            <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
              <div>© 2025 ExifLab. Privacy-focused image analysis.</div>
              <div className="flex items-center space-x-4">
                <span>Built with Next.js & ExifTool</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}