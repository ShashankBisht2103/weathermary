import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerData } from '@/types/map';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  activeLayer: string;
  markers: MarkerData[];
  className?: string;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ activeLayer, markers, className }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [25, 0], // Center on equator
      zoom: 2,
      zoomControl: false, // We'll add custom controls
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Custom zoom control positioning
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when activeLayer or markers change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Filter markers based on active layer
    const filteredMarkers = markers.filter(marker => {
      if (activeLayer === 'wind' && marker.type === 'wind') return true;
      if (activeLayer === 'currents' && marker.type === 'current') return true;
      if (activeLayer === 'waves' && marker.type === 'wave') return true;
      if (activeLayer === 'warnings' && marker.type === 'warning') return true;
      // Always show vessels and ports
      if (marker.type === 'vessel' || marker.type === 'port') return true;
      return false;
    });

    // Add markers to map
    filteredMarkers.forEach(markerData => {
      let icon: L.DivIcon;
      
      // Create custom markers based on type
      switch (markerData.type) {
        case 'vessel':
          icon = L.divIcon({
            html: '<div class="w-4 h-4 bg-secondary rounded-full animate-pulse shadow-lg border-2 border-white"></div>',
            className: 'custom-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          break;
        case 'port':
          icon = L.divIcon({
            html: '<div class="w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-white"></div>',
            className: 'custom-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          break;
        case 'wind':
          icon = L.divIcon({
            html: '<div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path><path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path><path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path></svg></div>',
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          break;
        case 'current':
          icon = L.divIcon({
            html: '<div class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="animate-spin" style="animation-duration: 4s;"><polygon points="3,11 22,2 13,21 11,13"></polygon></svg></div>',
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          break;
        case 'wave':
          icon = L.divIcon({
            html: '<div class="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center animate-bounce shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 6s1.5-2 5-2 5 2 5 2 1.5-2 5-2 5 2 5 2"></path><path d="M2 12s1.5-2 5-2 5 2 5 2 1.5-2 5-2 5 2 5 2"></path><path d="M2 18s1.5-2 5-2 5 2 5 2 1.5-2 5-2 5 2 5 2"></path></svg></div>',
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          break;
        case 'warning':
          const warningSize = markerData.severity === 'high' ? 40 : 32;
          const warningColor = markerData.severity === 'high' ? 'bg-destructive' : 'bg-warning';
          icon = L.divIcon({
            html: `<div class="w-${warningSize === 40 ? '10' : '8'} h-${warningSize === 40 ? '10' : '8'} ${warningColor} rounded-full flex items-center justify-center animate-pulse shadow-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 9v4"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>`,
            className: 'custom-marker',
            iconSize: [warningSize, warningSize],
            iconAnchor: [warningSize / 2, warningSize / 2],
          });
          break;
        default:
          icon = L.divIcon({
            html: '<div class="w-4 h-4 bg-gray-500 rounded-full"></div>',
            className: 'custom-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
      }

      const marker = L.marker([markerData.lat, markerData.lng], { icon })
        .bindPopup(`
          <div class="p-2">
            <h4 class="font-semibold text-sm">${markerData.title}</h4>
            <p class="text-xs text-gray-600">${markerData.details}</p>
            ${markerData.status ? `<p class="text-xs mt-1"><strong>Status:</strong> ${markerData.status}</p>` : ''}
          </div>
        `)
        .addTo(markersLayerRef.current);

      // Add hover effect
      marker.on('mouseover', function() {
        this.openPopup();
      });
    });

  }, [activeLayer, markers]);

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full rounded-2xl overflow-hidden ${className || ''}`}
      style={{ minHeight: '600px' }}
    />
  );
};

export default InteractiveMap;