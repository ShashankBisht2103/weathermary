import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, Waves, Thermometer, Eye, AlertTriangle, Ship, TrendingUp, Navigation, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [marineData, setMarineData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const weatherResponse = await fetch('http://localhost:5000/api/weather/city?city=London');
      const weatherResult = await weatherResponse.json();
      setWeatherData(weatherResult);

      const marineResponse = await fetch('http://localhost:5000/api/marine?lat=51.5074&lon=-0.1278');
      const marineResult = await marineResponse.json();
      setMarineData(marineResult);

      const alertsResponse = await fetch('http://localhost:5000/api/alerts');
      const alertsResult = await alertsResponse.json();
      setAlerts(alertsResult);

      setVessels([
        {
          id: 1,
          name: 'Container Ship Alpha',
          type: 'Container Ship',
          status: weatherResult?.wind?.speed > 10 ? 'Caution' : 'Optimal',
          speed: weatherResult?.wind?.speed > 10 ? '12 knots' : '18 knots',
          position: { lat: 51.5, lon: -0.1 },
          weather: {
            wind: weatherResult?.wind?.speed || 15,
            temp: weatherResult?.main?.temp || 24
          }
        },
        {
          id: 2,
          name: 'Cargo Ship Beta',
          type: 'Cargo Ship',
          status: weatherResult?.wind?.speed > 15 ? 'High Risk' : 'Optimal',
          speed: '16 knots',
          position: { lat: 51.3, lon: -0.3 },
          weather: {
            wind: (weatherResult?.wind?.speed || 15) + 3,
            temp: weatherResult?.main?.temp || 22
          }
        }
      ]);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherCards = () => {
    if (!weatherData) return [];
    return [
      {
        icon: Wind,
        title: 'Wind Speed',
        value: `${Math.round(weatherData.wind?.speed * 1.94384)} knots`, // ✅ Fixed template literal
        status: weatherData.wind?.speed > 10 ? 'High' : weatherData.wind?.speed > 5 ? 'Moderate' : 'Low',
        color: weatherData.wind?.speed > 10 ? 'text-destructive' : weatherData.wind?.speed > 5 ? 'text-warning' : 'text-success',
        onClick: () => navigate('/forecast')
      },
      {
        icon: Waves,
        title: 'Wave Height',
        value: marineData?.current?.wave_height ? `${marineData.current.wave_height}m` : '2.3m',
        status: 'Moderate',
        color: 'text-warning',
        onClick: () => navigate('/map')
      },
      {
        icon: Thermometer,
        title: 'Temperature',
        value: `${Math.round(weatherData.main?.temp)}°C`,
        status: weatherData.main?.temp > 25 ? 'Warm' : weatherData.main?.temp < 10 ? 'Cold' : 'Optimal',
        color: 'text-success',
        onClick: () => navigate('/forecast')
      },
      {
        icon: Eye,
        title: 'Visibility',
        value: `${(weatherData.visibility / 1000).toFixed(1)} km`,
        status: weatherData.visibility > 8000 ? 'Excellent' : weatherData.visibility > 5000 ? 'Good' : 'Poor',
        color: weatherData.visibility > 5000 ? 'text-success' : 'text-warning',
        onClick: () => navigate('/alerts')
      }
    ];
  };

  const handleViewDetails = (vesselId: number) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      alert(`🚢 Vessel Details:\nName: ${vessel.name}\nType: ${vessel.type}\nStatus: ${vessel.status}\nSpeed: ${vessel.speed}\nWind: ${vessel.weather.wind} knots\nTemp: ${vessel.weather.temp}°C`);
    }
  };

  const handleOptimizeRoute = (vesselId: number) => navigate('/recommendations');
  const handleViewAlerts = () => navigate('/alerts');
  const handleViewMap = () => navigate('/map');
  const handleRefreshData = () => fetchAllData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-blue-600">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading maritime data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ocean Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
          style={{ minHeight: '100vh', minWidth: '100vw' }}
        >
          <source src="https://videos.pexels.com/video-files/3759212/3759212-uhd_2560_1440_24fps.mp4" type="video/mp4" />
          <div className="w-full h-full wave-animation bg-gradient-to-b from-blue-500 to-blue-800"></div>
        </video>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-blue-900/40"></div>
          <div className="wave-animation absolute inset-0 bg-gradient-to-r from-blue-400/30 to-teal-400/30"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <div className="relative pt-20 pb-16 text-center">
          <div className="glass-card mx-4 p-8 max-w-4xl mx-auto backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
              Maritime Weather Intelligence
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow-lg">
              Advanced sea solutions for shipping and offshore energy
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={handleViewMap}
                className="bg-blue-600/80 hover:bg-blue-700 text-white backdrop-blur-sm border border-white/20 px-8 py-3 text-lg"
              >
                <Navigation className="mr-2 h-5 w-5" />
                Live Ocean Map
              </Button>
              <Button 
                onClick={handleRefreshData}
                className="bg-teal-600/80 hover:bg-teal-700 text-white backdrop-blur-sm border border-white/20 px-8 py-3 text-lg"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Weather Cards */}
        <div className="px-4 mb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
              Real-Time Marine Conditions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getWeatherCards().map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card 
                    key={index} 
                    className="glass-card hover:scale-105 transition-all duration-300 cursor-pointer backdrop-blur-lg bg-white/15 border border-white/30 hover:bg-white/20"
                    onClick={item.onClick}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon className="h-12 w-12 mx-auto mb-4 text-white drop-shadow-lg" />
                      <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                      <p className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{item.value}</p>
                      <p className={`text-sm font-medium ${item.color} drop-shadow-sm`}>{item.status}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="px-4 mb-12">
            <div className="max-w-4xl mx-auto">
              <Card className="glass-card backdrop-blur-lg bg-red-500/20 border border-red-300/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Active Weather Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.slice(0, 2).map((alert) => (
                    <div key={alert.id} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white">{alert.message}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'High' ? 'bg-red-600 text-white' : 
                          alert.severity === 'Medium' ? 'bg-yellow-600 text-white' : 
                          'bg-blue-600 text-white'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button 
                    onClick={handleViewAlerts} 
                    className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  >
                    View All Alerts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Vessel Cards */}
        <div className="px-4 mb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
              Fleet Status Monitor
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {vessels.map((vessel) => (
                <Card key={vessel.id} className="glass-card backdrop-blur-lg bg-white/15 border border-white/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Ship className="h-8 w-8 text-white mr-3" />
                        <div>
                          <h3 className="font-semibold text-white">{vessel.name}</h3>
                          <p className="text-sm text-white/70">{vessel.type}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        vessel.status === 'Optimal' ? 'bg-green-600/80 text-white' : 
                        vessel.status === 'Caution' ? 'bg-yellow-600/80 text-white' : 
                        'bg-red-600/80 text-white'
                      }`}>
                        {vessel.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-white/70">Speed</p>
                        <p className="font-medium text-white">{vessel.speed}</p>
                      </div>
                      <div>
                        <p className="text-white/70">Wind</p>
                        <p className="font-medium text-white">{vessel.weather.wind} knots</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleViewDetails(vessel.id)}
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                      >
                        View Details
                      </Button>
                      <Button 
                        onClick={() => handleOptimizeRoute(vessel.id)}
                        size="sm" 
                        className="flex-1 bg-blue-600/80 hover:bg-blue-700 text-white"
                      >
                        Optimize Route
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <Card className="glass-card backdrop-blur-lg bg-white/15 border border-white/30">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="space-y-2">
                    <TrendingUp className="h-10 w-10 mx-auto text-white" />
                    <div className="text-3xl font-bold text-white">{weatherData ? '94%' : '92%'}</div>
                    <div className="text-sm text-white/70">Forecast Accuracy</div>
                  </div>
                  <div className="space-y-2">
                    <Ship className="h-10 w-10 mx-auto text-white" />
                    <div className="text-3xl font-bold text-white">{vessels.length * 126}</div>
                    <div className="text-sm text-white/70">Vessels Monitored</div>
                  </div>
                  <div className="space-y-2">
                    <Wind className="h-10 w-10 mx-auto text-white" />
                    <div className="text-3xl font-bold text-white">
                      {weatherData?.wind?.speed > 10 ? '8%' : '15%'}
                    </div>
                    <div className="text-sm text-white/70">Fuel Savings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-red-500/90 border-red-400">
            <CardContent className="p-4">
              <p className="text-white">{error}</p>
              <Button onClick={() => setError(null)} variant="ghost" size="sm" className="mt-2 text-white hover:bg-white/20">
                Dismiss
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
