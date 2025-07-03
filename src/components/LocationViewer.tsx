"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Globe, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCoordinate } from "@/lib/utils";
import { useState } from "react";

interface LocationViewerProps {
  gpsData: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}

export function LocationViewer({ gpsData }: LocationViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    let map: any;
    
    const loadMap = async () => {
      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = (await import('leaflet')).default;
        
        // Fix for default markers in Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        if (mapRef.current && !map) {
          // Initialize map
          map = L.map(mapRef.current).setView([gpsData.latitude, gpsData.longitude], 15);

          // Add OpenStreetMap tiles
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(map);

          // Create custom icon for the location marker
          const customIcon = L.divIcon({
            html: `<div class="bg-red-500 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                     <div class="w-2 h-2 bg-white rounded-full"></div>
                   </div>`,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          // Add marker
          const marker = L.marker([gpsData.latitude, gpsData.longitude], { icon: customIcon })
            .addTo(map);

          // Create popup content
          const popupContent = `
            <div class="text-white p-2">
              <div class="font-semibold mb-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                Image Location
              </div>
              <div class="space-y-1 text-sm">
                <div><strong>Latitude:</strong> ${gpsData.latitude.toFixed(6)}°</div>
                <div><strong>Longitude:</strong> ${gpsData.longitude.toFixed(6)}°</div>
                ${gpsData.altitude ? `<div><strong>Altitude:</strong> ${gpsData.altitude.toFixed(1)}m</div>` : ''}
              </div>
            </div>
          `;

          marker.bindPopup(popupContent).openPopup();

          // Add circle to show approximate area
          L.circle([gpsData.latitude, gpsData.longitude], {
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.1,
            radius: 100,
          }).addTo(map);

          setMapLoaded(true);
        }
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [gpsData]);

  const copyCoordinates = async () => {
    const coordString = `${gpsData.latitude}, ${gpsData.longitude}`;
    try {
      await navigator.clipboard.writeText(coordString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${gpsData.latitude},${gpsData.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-red-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-400">
            <MapPin className="w-5 h-5" />
            GPS Location Data
          </CardTitle>
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
            Privacy Risk: High
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert className="bg-red-500/10 border-red-500/20">
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            <strong>Location Exposed:</strong> This image contains precise GPS coordinates 
            that reveal where it was taken. Consider removing this data before sharing.
          </AlertDescription>
        </Alert>

        {/* Map Container */}
        <div className="relative">
          <div 
            ref={mapRef} 
            className="h-64 w-full rounded-lg border border-border overflow-hidden"
            style={{ backgroundColor: '#1a1a1a' }}
          />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Coordinates Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Latitude</label>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                {formatCoordinate(gpsData.latitude, 'lat')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Decimal: {gpsData.latitude.toFixed(6)}°
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Longitude</label>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                {formatCoordinate(gpsData.longitude, 'lng')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Decimal: {gpsData.longitude.toFixed(6)}°
              </p>
            </div>

            {gpsData.altitude && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Altitude</label>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {gpsData.altitude.toFixed(1)} meters
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Above sea level
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              onClick={copyCoordinates}
              className="flex items-center gap-2"
            >
              {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Copy Coordinates'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={openInMaps}
              className="flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Open in Google Maps
            </Button>
          </div>
        </div>

        {/* Privacy Warning */}
        <Alert className="bg-orange-500/10 border-orange-500/20">
          <AlertDescription className="text-sm">
            <strong>Privacy Tip:</strong> Most image editing software and online tools 
            can remove GPS data from photos. Consider using these tools before sharing 
            images publicly to protect your privacy.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}