import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Route {
  id: string;
  name: string;
  description: string;
  color: string;
  waypoints: [number, number][];
}

interface WeatherPoint {
  waypoint_index: number;
  location: { lat: number; lon: number };
  hazards: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  wind_speed_knots: number;
  estimated_wave_height_m: number;
}

interface RouteAnalysis {
  route_id: string;
  route_name: string;
  weather_analysis: WeatherPoint[];
  summary: {
    total_waypoints_analyzed: number;
    high_risk_points: number;
    moderate_risk_points: number;
  };
}

interface RouteMapProps {
  routes: Route[];
  selectedRoute: Route | null;
  weatherAnalysis: RouteAnalysis | null;
}

const RouteMap: React.FC<RouteMapProps> = ({ routes, selectedRoute, weatherAnalysis }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup[]>([]);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0], // Center on global view
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;
    weatherLayerRef.current = L.layerGroup().addTo(map);

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update routes on map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing route layers
    routeLayersRef.current.forEach(layer => {
      mapInstanceRef.current?.removeLayer(layer);
    });
    routeLayersRef.current = [];

    // Add all routes
    routes.forEach((route) => {
      const routeLayer = L.layerGroup();

      // Convert waypoints to LatLng format
      const latLngs: L.LatLngExpression[] = route.waypoints.map(([lat, lng]) => [lat, lng]);

      // Create polyline for route
      const polyline = L.polyline(latLngs, {
        color: route.color,
        weight: selectedRoute?.id === route.id ? 4 : 2,
        opacity: selectedRoute?.id === route.id ? 1 : 0.6,
        smoothFactor: 1,
      });

      // Add popup to polyline
      polyline.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg">${route.name}</h3>
          <p class="text-sm text-gray-600">${route.description}</p>
          <p class="text-xs text-gray-500 mt-1">${route.waypoints.length} waypoints</p>
        </div>
      `);

      routeLayer.addLayer(polyline);

      // Add start and end markers
      if (route.waypoints.length > 0) {
        const startPoint = route.waypoints[0];
        const endPoint = route.waypoints[route.waypoints.length - 1];

        const startIcon = L.divIcon({
          html: '<div class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">S</div>',
          className: 'custom-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const endIcon = L.divIcon({
          html: '<div class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">E</div>',
          className: 'custom-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const startMarker = L.marker([startPoint[0], startPoint[1]], { icon: startIcon })
          .bindPopup(`<b>Start:</b> ${route.name}`);

        const endMarker = L.marker([endPoint[0], endPoint[1]], { icon: endIcon })
          .bindPopup(`<b>End:</b> ${route.name}`);

        routeLayer.addLayer(startMarker);
        routeLayer.addLayer(endMarker);
      }

      routeLayer.addTo(mapInstanceRef.current!);
      routeLayersRef.current.push(routeLayer);
    });

    // Fit map to show selected route or all routes
    if (selectedRoute && selectedRoute.waypoints.length > 0) {
      const bounds = L.latLngBounds(selectedRoute.waypoints.map(([lat, lng]) => [lat, lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
    } else if (routes.length > 0) {
      const allWaypoints = routes.flatMap(route => route.waypoints);
      if (allWaypoints.length > 0) {
        const bounds = L.latLngBounds(allWaypoints.map(([lat, lng]) => [lat, lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routes, selectedRoute]);

  // Update weather analysis markers
  useEffect(() => {
    if (!mapInstanceRef.current || !weatherLayerRef.current) return;

    // Clear existing weather markers
    weatherLayerRef.current.clearLayers();

    if (weatherAnalysis && weatherAnalysis.weather_analysis) {
      weatherAnalysis.weather_analysis.forEach((point) => {
        if (point.hazards.length === 0) return;

        const severity = point.hazards.reduce((max, hazard) => {
          if (hazard.severity === 'HIGH') return 'HIGH';
          if (hazard.severity === 'MEDIUM' && max !== 'HIGH') return 'MEDIUM';
          return max;
        }, 'LOW');

        const color = severity === 'HIGH' ? '#dc2626' : severity === 'MEDIUM' ? '#f59e0b' : '#10b981';
        const size = severity === 'HIGH' ? 32 : 24;

        const weatherIcon = L.divIcon({
          html: `
            <div class="relative">
              <div class="absolute -inset-1 bg-white rounded-full"></div>
              <div class="relative bg-red-500 text-white rounded-full flex items-center justify-center font-bold animate-pulse"
                   style="width: ${size}px; height: ${size}px; background-color: ${color}; font-size: ${size/3}px;">
                ⚠
              </div>
            </div>
          `,
          className: 'weather-hazard-marker',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2],
        });

        const popupContent = `
          <div class="p-3 min-w-64">
            <h4 class="font-bold text-lg mb-2">Weather Hazards</h4>
            <div class="text-sm text-gray-600 mb-3">
              <div>📍 ${point.location.lat.toFixed(2)}°, ${point.location.lon.toFixed(2)}°</div>
              <div>💨 Wind: ${point.wind_speed_knots} knots</div>
              <div>🌊 Waves: ${point.estimated_wave_height_m}m</div>
            </div>
            <div class="space-y-2">
              ${point.hazards.map(hazard => `
                <div class="p-2 rounded ${
                  hazard.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                  hazard.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }">
                  <div class="font-semibold">${hazard.type}</div>
                  <div class="text-sm">${hazard.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        const marker = L.marker([point.location.lat, point.location.lon], { icon: weatherIcon })
          .bindPopup(popupContent);

        weatherLayerRef.current?.addLayer(marker);
      });
    }
  }, [weatherAnalysis]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Start Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>End Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
            <span>High Risk Weather</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
            <span>Moderate Risk Weather</span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {!routes.length && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-gray-500 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading routes...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;