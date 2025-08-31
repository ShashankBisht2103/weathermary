import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Interfaces ---
interface Route {
  id: string;
  name: string;
  description: string;
  color: string;
  waypoints: [number, number][];
}

interface EnvironmentalFactor {
    location: { lat: number, lon: number };
    wind_knots: number;
    wave_m: number;
    current_knots: number;
    hazard?: { type: string; severity: string };
}

interface FuelStop {
    port_name: string;
    location: { lat: number; lon: number };
}

interface RouteMapProps {
  routes: Route[];
  selectedRoute: Route | null;
  environmentalFactors: EnvironmentalFactor[] | null;
  fuelStops: FuelStop[] | null;
}

const RouteMap: React.FC<RouteMapProps> = ({ routes, selectedRoute, environmentalFactors, fuelStops }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup[]>([]);
  const envLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
      envLayerRef.current = L.layerGroup().addTo(map);
    }
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
    routeLayersRef.current.forEach(layer => mapInstanceRef.current?.removeLayer(layer));
    routeLayersRef.current = [];

    routes.forEach((route) => {
      const routeLayer = L.layerGroup();
      const latLngs: L.LatLngExpression[] = route.waypoints.map(([lat, lng]) => [lat, lng]);
      const polyline = L.polyline(latLngs, {
        color: route.color,
        weight: selectedRoute?.id === route.id ? 5 : 3,
        opacity: selectedRoute?.id === route.id ? 1 : 0.7,
      });
      polyline.bindPopup(`<b>${route.name}</b>`);
      routeLayer.addLayer(polyline);

      if (route.waypoints.length > 0) {
        const startIcon = L.divIcon({ html: '<div class="w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>', className: '', iconSize: [16,16], iconAnchor: [8,8] });
        const endIcon = L.divIcon({ html: '<div class="w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div>', className: '', iconSize: [16,16], iconAnchor: [8,8] });
        L.marker(route.waypoints[0], { icon: startIcon }).addTo(routeLayer);
        L.marker(route.waypoints[route.waypoints.length - 1], { icon: endIcon }).addTo(routeLayer);
      }
      routeLayer.addTo(mapInstanceRef.current!);
      routeLayersRef.current.push(routeLayer);
    });

    if (selectedRoute?.waypoints.length) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(selectedRoute.waypoints), { padding: [20, 20] });
    }
  }, [routes, selectedRoute]);
  
  // Update environmental factors and fuel stops
  useEffect(() => {
    if (!mapInstanceRef.current || !envLayerRef.current) return;
    envLayerRef.current.clearLayers();

    // Render environmental factors
    environmentalFactors?.forEach(factor => {
      const { location, current_knots, hazard } = factor;
      const color = current_knots > 0 ? 'text-cyan-500' : 'text-orange-500';
      const rotation = current_knots > 0 ? 0 : 180;
      
      const arrowIcon = L.divIcon({
        html: `<div style="transform: rotate(${rotation}deg);" class="${color} text-2xl">➔</div>`,
        className: 'bg-transparent',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      
      const marker = L.marker([location.lat, location.lon], { icon: arrowIcon })
        .bindPopup(`<b>Currents:</b> ${Math.abs(current_knots)} knots ${current_knots > 0 ? 'tailwind' : 'headwind'}<br><b>Waves:</b> ${factor.wave_m}m<br><b>Wind:</b> ${factor.wind_knots} knots`);
      envLayerRef.current?.addLayer(marker);

      // Render hazards like tornadoes
      if (hazard) {
        const hazardIcon = L.divIcon({
          html: '<div class="text-3xl animate-pulse">🌪️</div>',
          className: 'bg-transparent',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([location.lat, location.lon], { icon: hazardIcon })
          .bindPopup(`<b class="text-red-600">${hazard.type}</b><br>Severity: ${hazard.severity}`)
          .addTo(envLayerRef.current!);
      }
    });

    // Render fuel stops
    fuelStops?.forEach(stop => {
      const fuelIcon = L.divIcon({
        html: '<div class="text-2xl">⛽</div>',
        className: 'bg-transparent',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      L.marker([stop.location.lat, stop.location.lon], { icon: fuelIcon })
        .bindPopup(`<b>${stop.port_name}</b><br>Refuel stop`)
        .addTo(envLayerRef.current!);
    });

  }, [environmentalFactors, fuelStops]);


  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
       {/* Map Legend */}
       <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Start Point</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>End Point</span></div>
          <div className="flex items-center gap-2"><span className="text-lg">➔</span><span>Tailwind Current</span></div>
          <div className="flex items-center gap-2"><span className="text-lg text-orange-500">➔</span><span>Headwind Current</span></div>
          <div className="flex items-center gap-2"><span className="text-lg">🌪️</span><span>Tornado Warning</span></div>
          <div className="flex items-center gap-2"><span className="text-lg">⛽</span><span>Fuel Stop</span></div>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
