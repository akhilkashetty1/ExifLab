import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "ExifLab - Advanced Image Metadata Tool",
  description: "A sophisticated web-based application for analyzing image metadata, converting formats, and exploring GPS data with an amazing UI.",
  keywords: ["EXIF", "metadata", "image", "privacy", "GPS", "converter", "analysis"],
  authors: [{ name: "ExifLab Team" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
}

// In app/layout.tsx (App Router)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}