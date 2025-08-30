
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wind, Waves, Navigation, AlertTriangle, Eye, Layers, Download, 
  Maximize, MapPin, RefreshCw, Settings, Info, Ship, Fuel, 
  DollarSign, Clock, Route, Calendar, Calculator 
} from "lucide-react";
import InteractiveMap from "@/components/InteractiveMap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://weather-backend-8r87.onrender.com";

// Major ports with coordinates (from hackathon problem statement and maritime data)
const MAJOR_PORTS = {
  "Singapore": { lat: 1.3521, lng: 103.8198, country: "Singapore", bunker_price: 680 },
  "Rotterdam": { lat: 51.9225, lng: 4.4792, country: "Netherlands", bunker_price: 650 },
  "Shanghai": { lat: 31.2304, lng: 121.4737, country: "China", bunker_price: 670 },
  "Hamburg": { lat: 53.5511, lng: 9.9937, country: "Germany", bunker_price: 660 },
  "Los Angeles": { lat: 33.7485, lng: -118.2436, country: "USA", bunker_price: 720 },
  "Dubai": { lat: 25.2532, lng: 55.3657, country: "UAE", bunker_price: 640 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694, country: "Hong Kong", bunker_price: 675 },
  "Antwerp": { lat: 51.2194, lng: 4.4025, country: "Belgium", bunker_price: 655 },
  "Long Beach": { lat: 33.7701, lng: -118.1937, country: "USA", bunker_price: 715 },
  "Busan": { lat: 35.1796, lng: 129.0756, country: "South Korea", bunker_price: 690 },
  "Tokyo": { lat: 35.6162, lng: 139.7431, country: "Japan", bunker_price: 700 },
  "Mumbai": { lat: 19.0760, lng: 72.8777, country: "India", bunker_price: 635 },
  "Felixstowe": { lat: 51.9542, lng: 1.3509, country: "UK", bunker_price: 665 },
  "Valencia": { lat: 39.4699, lng: -0.3763, country: "Spain", bunker_price: 645 }
};

// Ship types with realistic specifications
const SHIP_TYPES = {
  container: { name: "Container Ship", fuel_rate: 250, avg_speed: 22, capacity_range: [5000, 200000] },
  bulk: { name: "Bulk Carrier", fuel_rate: 180, avg_speed: 14, capacity_range: [10000, 400000] },
  tanker: { name: "Oil Tanker", fuel_rate: 200, avg_speed: 16, capacity_range: [5000, 320000] },
  general: { name: "General Cargo", fuel_rate: 120, avg_speed: 18, capacity_range: [1000, 60000] },
  roro: { name: "RoRo Vessel", fuel_rate: 160, avg_speed: 20, capacity_range: [5000, 80000] }
};

// Enhanced Map Component
const EnhancedMaritimeMap = () => {
  // Route Planning State
  const [origin, setOrigin] = useState("Singapore");
  const [destination, setDestination] = useState("Rotterdam");
  const [shipType, setShipType] = useState("container");
  const [deadweight, setDeadweight] = useState(50000);
  const [draft, setDraft] = useState(12);
  const [bunkerOnBoard, setBunkerOnBoard] = useState(500);
  const [cargoValue, setCargoValue] = useState(2500000);
  const [departureDate, setDepartureDate] = useState("2025-09-01");
  const [laycanStart, setLaycanStart] = useState("2025-09-01");
  const [laycanEnd, setLaycanEnd] = useState("2025-09-15");

  // Route Analysis State
  const [mainRoute, setMainRoute] = useState(null);
  const [alternateRoutes, setAlternateRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState("main");
  const [voyageAnalysis, setVoyageAnalysis] = useState(null);
  const [weatherOptimized, setWeatherOptimized] = useState(false);

  // Map and Weather State
  const [activeLayer, setActiveLayer] = useState("wind");
  const [weatherData, setWeatherData] = useState(null);
  const [marineData, setMarineData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [layerData, setLayerData] = useState({});

  // AI and Alerts State
  const [aiAdvice, setAiAdvice] = useState("");
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);

  // Fetch layer-specific data when active layer changes
  useEffect(() => {
    fetchLayerData(activeLayer);
  }, [activeLayer]);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return (
    <div className="min-h-screen bg-black text-white">
      ) => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const fetchLayerData = async (layer) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/weather/coords?lat=51.5074&lon=-0.1278`);
      const data = await response.json();
      setLayerData({ 
        ...layerData, 
        [layer]: { data: data, timestamp: new Date().toISOString() } 
      });
    } catch (error) {
      console.error(`Failed to fetch ${layer} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    try {
      setLoading(true);

      // Calculate route using backend API
      const routeRequest = {
        origin,
        destination,
        ship_type: shipType,
        deadweight,
        draft,
        bunker_on_board: bunkerOnBoard,
        cargo_value: cargoValue,
        departure_date: departureDate,
        laycan_start: laycanStart,
        laycan_end: laycanEnd,
        weather_optimized: weatherOptimized
      };

      const response = await fetch(`${BACKEND_URL}/api/maritime/route-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeRequest)
      });

      if (!response.ok) {
        // If backend doesn't have route planning, create comprehensive analysis
        const analysis = await createVoyageAnalysis(routeRequest);
        setVoyageAnalysis(analysis);
        setMainRoute(analysis.main_route);
        setAlternateRoutes(analysis.alternate_routes);
      } else {
        const data = await response.json();
        setVoyageAnalysis(data);
        setMainRoute(data.main_route);
        setAlternateRoutes(data.alternate_routes);
      }

      // Get AI advice from Gemini
      await getAIAdvice(routeRequest);

      // Get weather alerts for route
      await getRouteWeatherAlerts();

    } catch (error) {
      console.error("Route calculation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const createVoyageAnalysis = async (routeRequest) => {
    const originCoords = MAJOR_PORTS[origin];
    const destCoords = MAJOR_PORTS[destination];
    const shipSpec = SHIP_TYPES[shipType];

    // Calculate great circle distance
    const distance = calculateGreatCircleDistance(
      originCoords.lat, originCoords.lng, 
      destCoords.lat, destCoords.lng
    );

    // Add routing factor (canals, coastal routing)
    const actualDistance = distance * 1.15; // 15% routing inefficiency
    const voyageDays = Math.ceil(actualDistance / (shipSpec.avg_speed * 24));
    const fuelConsumption = voyageDays * shipSpec.fuel_rate;

    // Cost calculations
    const fuelCost = fuelConsumption * 650; // Average bunker price
    const portCosts = calculatePortCosts(deadweight);
    const canalCosts = calculateCanalCosts(origin, destination);
    const insuranceCost = cargoValue * 0.001; // 0.1% of cargo value
    const totalCost = fuelCost + portCosts + canalCosts + insuranceCost;

    // Risk assessment
    const risks = assessRouteRisks(originCoords, destCoords, departureDate);

    return {
      route_summary: {
        origin,
        destination,
        distance_nm: Math.round(actualDistance),
        voyage_days: voyageDays,
        avg_speed_knots: shipSpec.avg_speed,
        departure_date: departureDate
      },
      vessel_info: {
        ship_type: shipSpec.name,
        deadweight_tons: deadweight,
        fuel_rate_per_day: shipSpec.fuel_rate,
        cargo_value: cargoValue
      },
      fuel_analysis: {
        consumption_tons: Math.round(fuelConsumption),
        cost_usd: Math.round(fuelCost),
        weather_factor: weatherOptimized ? 1.15 : 1.0,
        fuel_stops_required: Math.ceil(actualDistance / 7000), // Every 7000nm
        fuel_stops: getFuelStops(originCoords, destCoords, actualDistance)
      },
      cost_breakdown: {
        fuel_cost: Math.round(fuelCost),
        port_cost: portCosts,
        canal_cost: canalCosts,
        insurance_cost: Math.round(insuranceCost),
        other_costs: 50000,
        total_cost: Math.round(totalCost)
      },
      risk_assessment: risks,
      main_route: {
        coordinates: generateRouteCoordinates(originCoords, destCoords),
        type: "main",
        cost: Math.round(totalCost),
        days: voyageDays,
        risk_level: risks.overall_risk
      },
      alternate_routes: generateAlternateRoutes(originCoords, destCoords, totalCost, voyageDays),
      weather_forecast: await getRouteWeatherForecast(originCoords, destCoords),
      regulatory_compliance: {
        eca_zones_crossed: getECAZonesCrossed(originCoords, destCoords),
        fuel_sulfur_requirements: getFuelRequirements(originCoords, destCoords)
      }
    };
  };

  const calculateGreatCircleDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const calculatePortCosts = (dwt) => {
    // Port costs based on deadweight
    return Math.round(dwt * 0.8 + 25000); // $0.8 per ton + base cost
  };

  const calculateCanalCosts = (orig, dest) => {
    const route = `${orig}-${dest}`;
    if (route.includes("Singapore") && route.includes("Rotterdam")) {
      return 222865; // Suez Canal cost from screenshot
    }
    return 0;
  };

  const assessRouteRisks = (origCoords, destCoords, depDate) => {
    const risks = [];
    let riskScore = 0;

    // Piracy risk zones
    if (isInPiracyZone(origCoords, destCoords)) {
      risks.push({ type: "Piracy", level: "HIGH", description: "Route passes through high piracy risk areas" });
      riskScore += 30;
    }

    // Seasonal weather risks
    const season = getSeasonalRisk(depDate);
    if (season.risk > 20) {
      risks.push({ type: "Weather", level: "MEDIUM", description: season.description });
      riskScore += season.risk;
    }

    // Port congestion
    risks.push({ type: "Port Congestion", level: "LOW", description: "Minor delays possible at destination" });
    riskScore += 10;

    const overallRisk = riskScore > 50 ? "HIGH" : riskScore > 25 ? "MEDIUM" : "LOW";

    return {
      overall_risk: overallRisk,
      risk_score: riskScore,
      individual_risks: risks,
      recommendations: [
        "Monitor weather updates daily",
        "Maintain adequate fuel reserves",
        "Follow BMP5 guidelines in high-risk areas"
      ]
    };
  };

  const isInPiracyZone = (orig, dest) => {
    // Check if route passes through known piracy zones
    const piracyZones = [
      { name: "Gulf of Aden", bounds: { lat: [10, 18], lng: [42, 52] } },
      { name: "West Africa", bounds: { lat: [-5, 10], lng: [-10, 8] } }
    ];
    return true; // Simplified - would need proper geo calculations
  };

  const getSeasonalRisk = (date) => {
    const month = new Date(date).getMonth();
    if (month >= 5 && month <= 10) {
      return { risk: 25, description: "Monsoon/Hurricane season increases weather risks" };
    }
    return { risk: 15, description: "Normal seasonal conditions" };
  };

  const getFuelStops = (orig, dest, distance) => {
    if (distance < 7000) return [];

    return [
      {
        port_name: "Fujairah",
        coordinates: { lat: 25.1164, lng: 56.3467 },
        fuel_needed_tons: 800,
        estimated_cost: 520000,
        fuel_price_per_ton: 650
      }
    ];
  };

  const generateRouteCoordinates = (orig, dest) => {
    // Generate intermediate waypoints for route visualization
    const waypoints = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      waypoints.push({
        lat: orig.lat + (dest.lat - orig.lat) * ratio,
        lng: orig.lng + (dest.lng - orig.lng) * ratio
      });
    }

    return waypoints;
  };

  const generateAlternateRoutes = (orig, dest, baseCost, baseDays) => {
    return [
      {
        name: "Northern Route",
        coordinates: generateRouteCoordinates(orig, dest),
        type: "alternate",
        cost: Math.round(baseCost * 1.12),
        days: baseDays + 2,
        risk_level: "LOW",
        description: "Safer route avoiding high-risk zones, +12% cost"
      },
      {
        name: "Weather Optimized",
        coordinates: generateRouteCoordinates(orig, dest),
        type: "weather",
        cost: Math.round(baseCost * 0.95),
        days: baseDays - 1,
        risk_level: "MEDIUM",
        description: "Weather-optimized routing, -5% cost but weather dependent"
      }
    ];
  };

  const getECAZonesCrossed = (orig, dest) => {
    return ["North Sea ECA", "Baltic Sea ECA"]; // Simplified
  };

  const getFuelRequirements = (orig, dest) => {
    return {
      sulfur_limit_percent: 0.1,
      description: "Low sulfur fuel required in ECA zones",
      zones: ["North Sea ECA", "Baltic Sea ECA"]
    };
  };

  const getRouteWeatherForecast = async (orig, dest) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/forecast10?lat=${orig.lat}&lon=${orig.lng}`);
      const data = await response.json();
      return data.days || [];
    } catch (error) {
      console.error("Weather forecast failed:", error);
      return [];
    }
  };

  const getAIAdvice = async (routeRequest) => {
    try {
      const aiQuery = `Analyze maritime route from ${origin} to ${destination} for ${SHIP_TYPES[shipType].name} vessel with ${deadweight}T DWT. Departure: ${departureDate}. Provide routing advice, weather considerations, and risk assessment.`;

      const response = await fetch(`${BACKEND_URL}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: aiQuery })
      });

      const data = await response.json();
      setAiAdvice(data.response || "AI advice unavailable");
    } catch (error) {
      console.error("AI advice failed:", error);
      setAiAdvice("Weather and routing analysis suggests monitoring conditions closely.");
    }
  };

  const getRouteWeatherAlerts = async () => {
    try {
      const alerts = [];

      // Check for weather alerts along route
      if (voyageAnalysis?.main_route?.coordinates) {
        for (const coord of voyageAnalysis.main_route.coordinates.slice(0, 3)) {
          const response = await fetch(`${BACKEND_URL}/api/weather/coords?lat=${coord.lat}&lon=${coord.lng}`);
          const weather = await response.json();

          if (weather.current?.wind_speed > 10) {
            alerts.push({
              type: "Gale Warning",
              severity: "HIGH",
              location: `${coord.lat.toFixed(1)}°, ${coord.lng.toFixed(1)}°`,
              description: `Strong winds ${Math.round(weather.current.wind_speed * 1.94384)} knots`
            });
          }
        }
      }

      setWeatherAlerts(alerts);
    } catch (error) {
      console.error("Weather alerts failed:", error);
    }
  };

  const handleMapClick = async (lat, lng) => {
    try {
      setLoading(true);
      setSelectedLocation({ lat, lng });

      // Fetch weather data for clicked location
      const weatherResponse = await fetch(`${BACKEND_URL}/api/weather/coords?lat=${lat}&lon=${lng}`);
      const weatherResult = await weatherResponse.json();
      setWeatherData(weatherResult);

      // Fetch marine data for clicked location
      const marineResponse = await fetch(`${BACKEND_URL}/api/marine?lat=${lat}&lon=${lng}`);
      const marineResult = await marineResponse.json();
      setMarineData(marineResult);

      // Calculate maritime-specific data
      const windKnots = weatherResult.current?.wind_speed ? 
        Math.round(weatherResult.current.wind_speed * 1.94384) : "N/A";
      const waveHeight = weatherResult.current?.wind_speed ? 
        Math.round(weatherResult.current.wind_speed * 0.3 + 0.8) : "N/A";
      const visibilityNM = weatherResult.current?.visibility ? 
        Math.round(weatherResult.current.visibility / 1852) : "N/A";

      const info = `
🌍 Location: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
🌡️ Temperature: ${weatherResult.current?.temp ?? weatherResult.main?.temp ?? "N/A"}°C
💧 Humidity: ${weatherResult.current?.humidity ?? weatherResult.main?.humidity ?? "N/A"}%
💨 Wind Speed: ${windKnots} knots
🌊 Wave Height: ${waveHeight}m (estimated)
👁️ Visibility: ${visibilityNM} nautical miles
☁️ Cloud Cover: ${weatherResult.current?.clouds ?? weatherResult.clouds?.all ?? "N/A"}%
      `;

      alert(info);
    } catch (err) {
      console.error("Weather fetch failed", err);
      alert("❌ Failed to fetch weather data for this location");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const title = `Maritime Route Analysis - ${origin} to ${destination}`;
      const coords = selectedLocation ? `&lat=${selectedLocation.lat}&lon=${selectedLocation.lng}` : '';
      const url = `${BACKEND_URL}/api/map/export?title=${encodeURIComponent(title)}${coords}`;
      window.open(url, "_blank");
    } catch (error) {
      alert("❌ Failed to export map");
    }
  };

  const handleFullscreen = () => {
    const mapEl = document.querySelector(".leaflet-container");
    if (mapEl) {
      if (!document.fullscreenElement) {
        mapEl.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleRefreshData = () => {
    fetchLayerData(activeLayer);
    if (voyageAnalysis) {
      calculateRoute();
    }
  };

  const layers = [
    { id: "wind", label: "Wind", icon: Wind, color: "text-blue-400", description: "Real-time wind conditions" },
    { id: "waves", label: "Waves", icon: Waves, color: "text-teal-400", description: "Wave height and swell data" },
    { id: "currents", label: "Currents", icon: Navigation, color: "text-green-400", description: "Ocean current patterns" },
    { id: "warnings", label: "Warnings", icon: AlertTriangle, color: "text-red-400", description: "Weather alerts and hazards" },
    { id: "cyclones", label: "Cyclones", icon: AlertTriangle, color: "text-purple-400", description: "Tropical cyclone tracking" },
  ];

  const mapData = {
    wind: {
      speed: weatherData?.wind?.speed ? `${Math.round(weatherData.wind.speed * 1.94384)} knots` : "15-25 knots",
      direction: weatherData?.wind?.deg ? `${weatherData.wind.deg}°` : "NW",
      coverage: "85%"
    },
    waves: {
      height: marineData?.current?.wave_height ? `${marineData.current.wave_height}m` : "1.5-3.2m",
      period: "8s",
      coverage: "92%"
    },
    currents: {
      speed: "0.8-1.2 knots",
      direction: "E",
      coverage: "78%"
    },
    warnings: {
      active: weatherAlerts.length.toString(),
      severity: weatherAlerts.length > 0 ? "High" : "Low",
      coverage: "12%"
    }
  };

  return (
    <div className="flex h-screen bg-gray-800">
      {/* Enhanced Sidebar */}
      <div className={`${isVisible ? 'w-96' : 'w-12'} bg-gray-900 shadow-lg transition-all duration-300 overflow-y-auto`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-400">Maritime Route Planner</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="p-2"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          {isVisible && (
            <>
              {/* Route Planning Section */}
              <Card className="bg-gray-900 border-gray-700 mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ship className="h-5 w-5" />
                    Voyage Planning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Departure Port</label>
                    <select 
                      value={origin} 
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      {Object.keys(MAJOR_PORTS).map(port => (
                        <option key={port} value={port}>{port}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Destination Port</label>
                    <select 
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      {Object.keys(MAJOR_PORTS).map(port => (
                        <option key={port} value={port}>{port}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Ship Type</label>
                      <select 
                        value={shipType} 
                        onChange={(e) => setShipType(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-xs"
                      >
                        {Object.entries(SHIP_TYPES).map(([key, ship]) => (
                          <option key={key} value={key}>{ship.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Speed (knots)</label>
                      <input 
                        type="number" 
                        value={SHIP_TYPES[shipType]?.avg_speed || 12}
                        className="w-full mt-1 p-2 border rounded-md text-xs"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">DWT (tons)</label>
                      <input 
                        type="number" 
                        value={deadweight} 
                        onChange={(e) => setDeadweight(+e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Draft (m)</label>
                      <input 
                        type="number" 
                        value={draft} 
                        onChange={(e) => setDraft(+e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Bunker on Board (MT)</label>
                    <input 
                      type="number" 
                      value={bunkerOnBoard} 
                      onChange={(e) => setBunkerOnBoard(+e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Laycan Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={laycanStart} 
                        onChange={(e) => setLaycanStart(e.target.value)}
                        className="mt-1 p-2 border rounded-md text-xs"
                      />
                      <input 
                        type="date" 
                        value={laycanEnd} 
                        onChange={(e) => setLaycanEnd(e.target.value)}
                        className="mt-1 p-2 border rounded-md text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={weatherOptimized} 
                      onChange={(e) => setWeatherOptimized(e.target.checked)}
                      id="weather-opt"
                    />
                    <label htmlFor="weather-opt" className="text-sm">Weather Optimized Route</label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={calculateRoute} disabled={loading} className="text-xs">
                      {loading ? "Calculating..." : "Find Route"}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setOrigin("Singapore");
                      setDestination("Rotterdam");
                    }} className="text-xs">
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Weather Layer Controls */}
              <Card className="bg-gray-900 border-gray-700 mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Weather Layers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {layers.map((layer) => {
                      const IconComponent = layer.icon;
                      return (
                        <Button
                          key={layer.id}
                          variant={activeLayer === layer.id ? "default" : "outline"}
                          onClick={() => setActiveLayer(layer.id)}
                          className="text-xs p-2 h-auto flex flex-col items-center gap-1"
                        >
                          <IconComponent className={`h-4 w-4 ${layer.color}`} />
                          <span>{layer.label}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Layer Data Display */}
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium mb-2">{layers.find(l => l.id === activeLayer)?.label} Data</div>
                    <div className="text-xs space-y-1">
                      <div>Speed: {mapData[activeLayer]?.speed || "N/A"}</div>
                      <div>Direction: {mapData[activeLayer]?.direction || "N/A"}</div>
                      <div>Coverage: {mapData[activeLayer]?.coverage || "N/A"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map Controls */}
              <div className="flex gap-2 mb-4">
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button onClick={handleFullscreen} variant="outline" size="sm">
                  <Maximize className="h-4 w-4 mr-1" />
                  Fullscreen
                </Button>
                <Button onClick={handleRefreshData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {/* Route Analysis Results */}
              {voyageAnalysis && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                    <TabsTrigger value="weather">Weather</TabsTrigger>
                    <TabsTrigger value="risks">Risks</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader>
                        <CardTitle>Voyage Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span className="font-medium">{voyageAnalysis.route_summary.distance_nm} nm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Voyage Days:</span>
                          <span className="font-medium">{voyageAnalysis.route_summary.voyage_days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Cost:</span>
                          <span className="font-medium text-green-400">
                            ${voyageAnalysis.cost_breakdown.total_cost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fuel Consumption:</span>
                          <span className="font-medium">{voyageAnalysis.fuel_analysis.consumption_tons} MT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Level:</span>
                          <Badge variant={
                            voyageAnalysis.risk_assessment.overall_risk === 'HIGH' ? 'destructive' :
                            voyageAnalysis.risk_assessment.overall_risk === 'MEDIUM' ? 'secondary' : 'default'
                          }>
                            {voyageAnalysis.risk_assessment.overall_risk}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="costs">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader>
                        <CardTitle>Cost Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Fuel Cost:</span>
                          <span>${voyageAnalysis.cost_breakdown.fuel_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Port Costs:</span>
                          <span>${voyageAnalysis.cost_breakdown.port_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Canal Cost:</span>
                          <span>${voyageAnalysis.cost_breakdown.canal_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insurance:</span>
                          <span>${voyageAnalysis.cost_breakdown.insurance_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Costs:</span>
                          <span>${voyageAnalysis.cost_breakdown.other_costs.toLocaleString()}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>${voyageAnalysis.cost_breakdown.total_cost.toLocaleString()}</span>
                        </div>

                        {voyageAnalysis.fuel_analysis.fuel_stops && (
                          <div className="mt-4">
                            <div className="font-medium mb-2">Fuel Stops Required:</div>
                            {voyageAnalysis.fuel_analysis.fuel_stops.map((stop, idx) => (
                              <div key={idx} className="bg-gray-800 p-2 rounded text-xs">
                                <div className="font-medium">{stop.port_name}</div>
                                <div>{stop.fuel_needed_tons} MT @ ${stop.fuel_price_per_ton}/MT</div>
                                <div className="text-green-400">${stop.estimated_cost.toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="weather">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader>
                        <CardTitle>Weather Forecast</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {voyageAnalysis.weather_forecast?.slice(0, 5).map((day, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                            <div>
                              <div className="font-medium">{day.day}</div>
                              <div className="text-xs text-gray-400">{day.date}</div>
                            </div>
                            <div className="text-right">
                              <div>{day.wind} knots</div>
                              <div className="text-xs">{day.waves}m waves</div>
                            </div>
                          </div>
                        ))}

                        {weatherAlerts.length > 0 && (
                          <div className="mt-4">
                            <div className="font-medium mb-2 text-red-400">Weather Alerts:</div>
                            {weatherAlerts.map((alert, idx) => (
                              <div key={idx} className="bg-gray-800 p-2 rounded text-xs">
                                <div className="font-medium text-red-300">{alert.type}</div>
                                <div className="text-red-400">{alert.description}</div>
                                <div className="text-gray-400">{alert.location}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="risks">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader>
                        <CardTitle>Risk Assessment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span>Overall Risk Score:</span>
                          <Badge variant={
                            voyageAnalysis.risk_assessment.overall_risk === 'HIGH' ? 'destructive' :
                            voyageAnalysis.risk_assessment.overall_risk === 'MEDIUM' ? 'secondary' : 'default'
                          }>
                            {voyageAnalysis.risk_assessment.risk_score}/100
                          </Badge>
                        </div>

                        {voyageAnalysis.risk_assessment.individual_risks.map((risk, idx) => (
                          <div key={idx} className="bg-gray-800 p-2 rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{risk.type}</span>
                              <Badge variant={
                                risk.level === 'HIGH' ? 'destructive' :
                                risk.level === 'MEDIUM' ? 'secondary' : 'default'
                              }>
                                {risk.level}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{risk.description}</div>
                          </div>
                        ))}

                        <div className="mt-4">
                          <div className="font-medium mb-2">Recommendations:</div>
                          {voyageAnalysis.risk_assessment.recommendations.map((rec, idx) => (
                            <div key={idx} className="text-xs bg-gray-800 p-2 rounded mb-1">
                              • {rec}
                            </div>
                          ))}
                        </div>

                        {voyageAnalysis.regulatory_compliance && (
                          <div className="mt-4">
                            <div className="font-medium mb-2">Regulatory Compliance:</div>
                            <div className="text-xs space-y-1">
                              <div>ECA Zones: {voyageAnalysis.regulatory_compliance.eca_zones_crossed.join(", ")}</div>
                              <div>Fuel Requirements: {voyageAnalysis.regulatory_compliance.fuel_sulfur_requirements.description}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}

              {/* Alternate Routes */}
              {alternateRoutes.length > 0 && (
                <Card className="bg-gray-900 border-gray-700 mb-4">
                  <CardHeader>
                    <CardTitle>Alternate Routes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {alternateRoutes.map((route, idx) => (
                      <div key={idx} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-800"
                           onClick={() => setSelectedRoute(route.type)}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{route.name}</span>
                          <Badge variant={
                            route.risk_level === 'HIGH' ? 'destructive' :
                            route.risk_level === 'MEDIUM' ? 'secondary' : 'default'
                          }>
                            {route.risk_level}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">{route.description}</div>
                        <div className="flex justify-between text-xs">
                          <span>Cost: ${route.cost.toLocaleString()}</span>
                          <span>Days: {route.days}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Advice */}
              {aiAdvice && (
                <Card className="bg-gray-900 border-gray-700 mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      AI Maritime Advisor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm bg-gray-800 p-3 rounded-lg">
                      {aiAdvice}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <InteractiveMap 
          markers={voyageAnalysis ? [
            { 
              id: 'origin', 
              position: MAJOR_PORTS[origin], 
              title: `${origin} (Origin)`,
              type: 'port'
            },
            { 
              id: 'destination', 
              position: MAJOR_PORTS[destination], 
              title: `${destination} (Destination)`,
              type: 'port'
            }
          ] : []}
          onMapClick={handleMapClick}
          routes={voyageAnalysis ? [mainRoute, ...alternateRoutes] : []}
          weatherLayer={activeLayer}
          selectedRoute={selectedRoute}
        />

        {/* Map Status Overlay */}
        {selectedLocation && (
          <div className="absolute top-4 right-4 bg-gray-900 p-3 rounded-lg shadow-lg max-w-xs">
            <div className="text-sm font-medium mb-2">Selected Location</div>
            <div className="text-xs space-y-1">
              <div>Coordinates: {selectedLocation.lat.toFixed(4)}°, {selectedLocation.lng.toFixed(4)}°</div>
              {weatherData && (
                <>
                  <div>Temperature: {weatherData.current?.temp ?? weatherData.main?.temp ?? "N/A"}°C</div>
                  <div>Wind: {weatherData.current?.wind_speed ? 
                    Math.round(weatherData.current.wind_speed * 1.94384) : "N/A"} knots</div>
                  <div>Waves: {weatherData.current?.wind_speed ? 
                    Math.round(weatherData.current.wind_speed * 0.3 + 0.8) : "N/A"}m</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading maritime data...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  
    </div>
  );
};

export default EnhancedMaritimeMap;
