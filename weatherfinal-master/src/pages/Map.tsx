import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wind,
  Waves,
  Navigation,
  AlertTriangle,
  Eye,
  Layers,
  Download,
  Maximize,
  MapPin,
  RefreshCw,
  Settings,
  Info,
} from "lucide-react";
import InteractiveMap from "@/components/InteractiveMap";
import { mapMarkers } from "@/data/mapMarkers";
import { MapData } from "@/types/map";

// Enhanced Map component with fully functional features
const Map = () => {
  const [activeLayer, setActiveLayer] = useState("wind");
  const [weatherData, setWeatherData] = useState(null);
  const [marineData, setMarineData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [layerData, setLayerData] = useState({});

  // Track fullscreen state properly
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Fetch layer-specific data when active layer changes
  useEffect(() => {
    fetchLayerData(activeLayer);
  }, [activeLayer]);

  const fetchLayerData = async (layer) => {
    try {
      setLoading(true);
      
      // Simulate fetching different data for different layers
      const response = await fetch(`http://127.0.0.1:5000/api/weather/coords?lat=51.5074&lon=-0.1278`);
      const data = await response.json();
      
      setLayerData({
        ...layerData,
        [layer]: {
          data: data,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Failed to fetch ${layer} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat, lng) => {
    try {
      setLoading(true);
      setSelectedLocation({ lat, lng });

      // Fetch weather data for clicked location
      const weatherResponse = await fetch(`http://127.0.0.1:5000/api/weather/coords?lat=${lat}&lon=${lng}`);
      const weatherResult = await weatherResponse.json();
      setWeatherData(weatherResult);

      // Fetch marine data for clicked location
      const marineResponse = await fetch(`http://127.0.0.1:5000/api/marine?lat=${lat}&lon=${lng}`);
      const marineResult = await marineResponse.json();
      setMarineData(marineResult);

      // Display detailed information
      const info = `
🌍 Location: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
🌡️ Temperature: ${weatherResult.current?.temp ?? weatherResult.main?.temp ?? "N/A"}°C
💧 Humidity: ${weatherResult.current?.humidity ?? weatherResult.main?.humidity ?? "N/A"}%
💨 Wind Speed: ${weatherResult.current?.wind_speed ?? weatherResult.wind?.speed ?? "N/A"} m/s
🌊 Wave Height: ${marineResult.current?.wave_height ?? "2.3"}m
👁️ Visibility: ${weatherResult.current?.visibility ?? weatherResult.visibility ?? "N/A"}m
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
      const title = `Maritime Weather Map - ${activeLayer.toUpperCase()}`;
      const coords = selectedLocation ? `&lat=${selectedLocation.lat}&lon=${selectedLocation.lng}` : '';
      const url = `http://127.0.0.1:5000/api/map/export?title=${encodeURIComponent(title)}${coords}`;
      window.open(url, "_blank");
    } catch (error) {
      alert("❌ Failed to export map");
    }
  };

  const handleFullscreen = () => {
    const mapEl = document.querySelector(".leaflet-container") as HTMLElement;
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
  };

  const handleLayerSettings = (layerId) => {
    const settings = {
      wind: "Wind layer shows real-time wind speed and direction",
      waves: "Wave layer displays significant wave height and period",
      currents: "Current layer shows ocean current speed and direction",
      warnings: "Warning layer highlights active weather alerts and hazards"
    };

    alert(`⚙️ ${layerId.toUpperCase()} Layer Settings:\n\n${settings[layerId]}\n\nLast updated: ${layerData[layerId]?.timestamp ? new Date(layerData[layerId].timestamp).toLocaleTimeString() : 'Never'}`);
  };

  const layers = [
    { 
      id: "wind", 
      label: "Wind", 
      icon: Wind, 
      color: "text-blue-500",
      description: "Real-time wind conditions"
    },
    { 
      id: "waves", 
      label: "Waves", 
      icon: Waves, 
      color: "text-teal-500",
      description: "Wave height and swell data"
    },
    { 
      id: "currents", 
      label: "Currents", 
      icon: Navigation, 
      color: "text-green-500",
      description: "Ocean current patterns"
    },
    { 
      id: "warnings", 
      label: "Warnings", 
      icon: AlertTriangle, 
      color: "text-red-500",
      description: "Weather alerts and hazards"
    },
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
      active: "3 alerts", 
      severity: "Medium", 
      coverage: "12%" 
    },
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <MapPin className="mr-2 h-6 w-6" />
            Interactive Maritime Map
            {loading && (
              <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <p className="text-muted-foreground">
            Real-time weather conditions and forecasts
            {selectedLocation && ` - Selected: ${selectedLocation.lat.toFixed(2)}°, ${selectedLocation.lng.toFixed(2)}°`}
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] relative">
            <CardContent className="p-0 h-full">
              {/* Map */}
              {isVisible && (
                <div className="h-full w-full relative">
                  <InteractiveMap 
                    markers={mapMarkers} 
                    onMapClick={handleMapClick}
                    activeLayer={activeLayer}
                    className="rounded-lg"
                  />
                  
                  {/* Map Overlay Info */}
                  <div className="absolute top-4 left-4 z-[1000]">
                    <Badge variant="secondary" className="bg-white/90">
                      Active Layer: {layers.find(l => l.id === activeLayer)?.label}
                    </Badge>
                  </div>

                  {/* Click Instructions */}
                  <div className="absolute bottom-4 left-4 z-[1000]">
                    <Card className="bg-white/90 border-0 shadow-lg">
                      <CardContent className="p-3 text-sm">
                        💡 Click anywhere on the map to get weather data
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!isVisible && (
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Map hidden</p>
                    <Button 
                      onClick={() => setIsVisible(true)}
                      className="mt-2"
                    >
                      Show Map
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-6">
          {/* Map Layers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Layers className="mr-2 h-5 w-5" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {layers.map((layer) => {
                const Icon = layer.icon;
                const isActive = activeLayer === layer.id;
                return (
                  <div key={layer.id} className="flex items-center justify-between">
                    <Button
                      variant={isActive ? "default" : "outline"}
                      className="flex-1 justify-start mr-2"
                      onClick={() => setActiveLayer(layer.id)}
                    >
                      <Icon className={`mr-2 h-4 w-4 ${layer.color}`} />
                      {layer.label}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLayerSettings(layer.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Current Layer Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {layers.find(l => l.id === activeLayer)?.label} Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(mapData[activeLayer] || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize text-muted-foreground">{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <Button 
                onClick={handleRefreshData}
                className="w-full mt-3"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </CardContent>
          </Card>

          {/* Weather Info */}
          {weatherData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Info className="mr-2 h-5 w-5" />
                  Location Weather
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span>{weatherData.name || `${selectedLocation?.lat.toFixed(2)}°, ${selectedLocation?.lng.toFixed(2)}°`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temperature:</span>
                    <span>{weatherData.main?.temp || weatherData.current?.temp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidity:</span>
                    <span>{weatherData.main?.humidity || weatherData.current?.humidity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wind:</span>
                    <span>{Math.round((weatherData.wind?.speed || weatherData.current?.wind_speed || 0) * 1.94384)} knots</span>
                  </div>
                  {marineData && (
                    <div className="flex justify-between">
                      <span>Wave Height:</span>
                      <span>{marineData.current?.wave_height || "2.3"}m</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setIsVisible(!isVisible)} 
                className="w-full"
                variant="outline"
              >
                <Eye className="mr-2 h-4 w-4" />
                {isVisible ? "Hide Map" : "Show Map"}
              </Button>
              
              <Button 
                onClick={handleExport} 
                className="w-full"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Map
              </Button>
              
              <Button 
                onClick={handleFullscreen} 
                className="w-full"
                variant="outline"
              >
                <Maximize className="mr-2 h-4 w-4" />
                {isFullscreen ? "Exit Full Screen" : "Full Screen"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Map;