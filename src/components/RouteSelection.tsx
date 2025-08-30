import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  Fuel, 
  AlertTriangle, 
  Wind, 
  Waves, 
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  TrendingUp,
  Activity
} from 'lucide-react';
import RouteMap from '@/components/RouteMap';

interface Route {
  id: string;
  name: string;
  description: string;
  color: string;
  waypoints: [number, number][];
}

interface WeatherHazard {
  type: string;
  severity: string;
  description: string;
}

interface RouteAnalysis {
  route_id: string;
  route_name: string;
  weather_analysis: {
    waypoint_index: number;
    location: { lat: number; lon: number };
    hazards: WeatherHazard[];
    wind_speed_knots: number;
    estimated_wave_height_m: number;
  }[];
  summary: {
    total_waypoints_analyzed: number;
    high_risk_points: number;
    moderate_risk_points: number;
  };
}

const RouteSelection: React.FC = () => {
  const [routes, setRoutes] = useState<{ routes: Record<string, Route>; alternate_routes: Record<string, Route> }>({ routes: {}, alternate_routes: {} });
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [weatherAnalysis, setWeatherAnalysis] = useState<RouteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('routes');

  // Fetch available routes
  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const analyzeRouteWeather = async (routeId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/routes/weather-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_id: routeId })
      });

      if (response.ok) {
        const analysis = await response.json();
        setWeatherAnalysis(analysis);
      }
    } catch (error) {
      console.error('Weather analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (routeId: string) => {
    setSelectedRoute(routeId);
    analyzeRouteWeather(routeId);
  };

  const getSelectedRouteData = (): Route | null => {
    if (!selectedRoute) return null;
    return routes.routes[selectedRoute] || routes.alternate_routes[selectedRoute] || null;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'warning';
      default: return 'secondary';
    }
  };

  const getAllRoutes = (): Route[] => {
    return [...Object.values(routes.routes), ...Object.values(routes.alternate_routes)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <RouteIcon className="h-8 w-8 text-blue-600" />
            Maritime Route Selection
          </h1>
          <p className="text-slate-600 mt-2">
            Select and analyze maritime routes with real-time weather conditions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route Selection Panel */}
          <div className="lg:col-span-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="routes">Primary Routes</TabsTrigger>
                <TabsTrigger value="alternates">Alternatives</TabsTrigger>
              </TabsList>

              <TabsContent value="routes" className="space-y-3">
                {Object.values(routes.routes).map((route) => (
                  <Card 
                    key={route.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRoute === route.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleRouteSelect(route.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        {route.name}
                      </CardTitle>
                      <p className="text-sm text-slate-600">{route.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {route.waypoints.length} waypoints
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="alternates" className="space-y-3">
                {Object.values(routes.alternate_routes).map((route) => (
                  <Card 
                    key={route.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRoute === route.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleRouteSelect(route.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        {route.name}
                      </CardTitle>
                      <p className="text-sm text-slate-600">{route.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {route.waypoints.length} waypoints
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Weather Analysis Summary */}
            {weatherAnalysis && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Weather Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {weatherAnalysis.summary.high_risk_points}
                      </div>
                      <div className="text-sm text-red-600">High Risk</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {weatherAnalysis.summary.moderate_risk_points}
                      </div>
                      <div className="text-sm text-yellow-600">Moderate Risk</div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => selectedRoute && analyzeRouteWeather(selectedRoute)}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map and Analysis Panel */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Route Visualization</span>
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing weather...
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full pb-6">
                <RouteMap 
                  routes={getAllRoutes()}
                  selectedRoute={getSelectedRouteData()}
                  weatherAnalysis={weatherAnalysis}
                />
              </CardContent>
            </Card>

            {/* Weather Hazards Details */}
            {weatherAnalysis && weatherAnalysis.weather_analysis.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Weather Hazards Along Route
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {weatherAnalysis.weather_analysis
                      .filter(point => point.hazards.length > 0)
                      .map((point, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-slate-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm font-medium">
                              Waypoint {point.waypoint_index + 1}
                            </div>
                            <div className="text-xs text-slate-500">
                              {point.location.lat.toFixed(2)}°, {point.location.lon.toFixed(2)}°
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Wind className="h-4 w-4" />
                              {point.wind_speed_knots} kts
                            </span>
                            <span className="flex items-center gap-1">
                              <Waves className="h-4 w-4" />
                              {point.estimated_wave_height_m}m
                            </span>
                          </div>

                          <div className="space-y-1">
                            {point.hazards.map((hazard, hIndex) => (
                              <Badge 
                                key={hIndex}
                                variant={getSeverityColor(hazard.severity)}
                                className="text-xs"
                              >
                                {hazard.type}: {hazard.description}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelection;