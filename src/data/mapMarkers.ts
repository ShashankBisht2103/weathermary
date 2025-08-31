import { MarkerData } from '@/types/map';

export const mapMarkers: MarkerData[] = [
  // Vessels (in oceans)
  {
    id: 'vessel-1',
    lat: 40.7128,
    lng: -40.0060, // Mid-Atlantic
    type: 'vessel',
    title: 'Atlantic Voyager',
    details: 'Container Ship - Speed: 18 knots',
    status: 'Optimal'
  },
  {
    id: 'vessel-2',
    lat: 35.6762,
    lng: 150.3032, // Pacific Ocean near Japan
    type: 'vessel',
    title: 'Pacific Runner',
    details: 'Cargo Ship - Speed: 15 knots',
    status: 'Normal'
  },
  {
    id: 'vessel-3',
    lat: -20.0,
    lng: 57.0, // Indian Ocean
    type: 'vessel',
    title: 'Ocean Explorer',
    details: 'Research Vessel - Speed: 12 knots',
    status: 'Research'
  },
  {
    id: 'vessel-4',
    lat: 25.0,
    lng: -90.0, // Gulf of Mexico
    type: 'vessel',
    title: 'Gulf Trader',
    details: 'Tanker - Speed: 14 knots',
    status: 'Caution'
  },

  // Ports (coastal cities)
  {
    id: 'port-1',
    lat: 40.7128,
    lng: -74.0060, // New York
    type: 'port',
    title: 'Port of New York',
    details: 'Major container port',
    status: 'Active'
  },
  {
    id: 'port-2',
    lat: 51.5074,
    lng: -0.1278, // London
    type: 'port',
    title: 'Port of London',
    details: 'Historic trading port',
    status: 'Active'
  },
  {
    id: 'port-3',
    lat: 35.6762,
    lng: 139.6503, // Tokyo
    type: 'port',
    title: 'Port of Tokyo',
    details: 'Largest port in Japan',
    status: 'Busy'
  },
  {
    id: 'port-4',
    lat: 22.3193,
    lng: 114.1694, // Hong Kong
    type: 'port',
    title: 'Port of Hong Kong',
    details: 'Major Asian hub',
    status: 'Very Busy'
  },
  {
    id: 'port-5',
    lat: -33.8688,
    lng: 151.2093, // Sydney
    type: 'port',
    title: 'Port of Sydney',
    details: 'Australia\'s main port',
    status: 'Active'
  },

  // Wind markers
  {
    id: 'wind-1',
    lat: 45.0,
    lng: -30.0, // North Atlantic
    type: 'wind',
    title: 'Atlantic Winds',
    details: 'Wind: 22 knots NE',
    status: 'Strong'
  },
  {
    id: 'wind-2',
    lat: 20.0,
    lng: 160.0, // Central Pacific
    type: 'wind',
    title: 'Pacific Trade Winds',
    details: 'Wind: 18 knots E',
    status: 'Steady'
  },
  {
    id: 'wind-3',
    lat: 10.0,
    lng: 70.0, // Indian Ocean
    type: 'wind',
    title: 'Monsoon Winds',
    details: 'Wind: 15 knots NW',
    status: 'Seasonal'
  },

  // Ocean currents
  {
    id: 'current-1',
    lat: 40.0,
    lng: -60.0, // Gulf Stream
    type: 'current',
    title: 'Gulf Stream',
    details: 'Current: 0.8-1.2 knots East',
    status: 'Strong'
  },
  {
    id: 'current-2',
    lat: 35.0,
    lng: 140.0, // Kuroshio Current
    type: 'current',
    title: 'Kuroshio Current',
    details: 'Current: 1.5-2.1 knots North',
    status: 'Very Strong'
  },
  {
    id: 'current-3',
    lat: -35.0,
    lng: 25.0, // Agulhas Current
    type: 'current',
    title: 'Agulhas Current',
    details: 'Current: 1.0-1.8 knots Southwest',
    status: 'Strong'
  },

  // Wave markers
  {
    id: 'wave-1',
    lat: 50.0,
    lng: -20.0, // North Atlantic
    type: 'wave',
    title: 'North Atlantic Waves',
    details: 'Waves: 3.2-4.5m',
    status: 'High'
  },
  {
    id: 'wave-2',
    lat: -40.0,
    lng: 140.0, // Southern Ocean
    type: 'wave',
    title: 'Southern Ocean Waves',
    details: 'Waves: 4.0-6.0m',
    status: 'Very High'
  },
  {
    id: 'wave-3',
    lat: 30.0,
    lng: 170.0, // North Pacific
    type: 'wave',
    title: 'Pacific Waves',
    details: 'Waves: 1.8-2.5m',
    status: 'Moderate'
  },

  // Warning markers
  {
    id: 'warning-1',
    lat: 25.0,
    lng: -85.0, // Gulf of Mexico
    type: 'warning',
    title: 'Hurricane Warning',
    details: 'Category 3 - 125 mph winds',
    severity: 'high',
    status: 'Critical'
  },
  {
    id: 'warning-2',
    lat: 15.0,
    lng: 120.0, // South China Sea
    type: 'warning',
    title: 'Storm Advisory',
    details: 'High waves expected - 3-5m',
    severity: 'medium',
    status: 'Advisory'
  },
  {
    id: 'warning-3',
    lat: -10.0,
    lng: 105.0, // Indian Ocean
    type: 'warning',
    title: 'Cyclone Watch',
    details: 'Tropical disturbance developing',
    severity: 'medium',
    status: 'Watch'
  }
];