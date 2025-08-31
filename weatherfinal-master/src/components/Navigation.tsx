import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Map, Home, Cloud, Bell, Compass, Monitor } from "lucide-react";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center">
            <span className="text-xl font-bold">Shipmate</span>
          </div>

          {/* Center - Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="flex items-center space-x-2 hover:text-gray-300">
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link to="/map" className="flex items-center space-x-2 hover:text-gray-300">
              <Map className="h-5 w-5" />
              <span>Map</span>
            </Link>
            <Link to="/forecast" className="flex items-center space-x-2 hover:text-gray-300">
              <Cloud className="h-5 w-5" />
              <span>Forecast</span>
            </Link>
            <Link to="/recommendations" className="flex items-center space-x-2 hover:text-gray-300">
              <Compass className="h-5 w-5" />
              <span>Recommendations</span>
            </Link>
            <Link to="/alerts" className="flex items-center space-x-2 hover:text-gray-300">
              <Bell className="h-5 w-5" />
              <span>Alerts</span>
            </Link>
          </div>

          {/* Right side - Simulation Panel button */}
          <div className="hidden md:flex items-center">
            <Link to="/simulation">
              <Button
                variant="secondary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Simulation Panel
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-200 hover:text-white focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1 bg-blue-800">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="/map" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Map className="h-5 w-5" />
            <span>Map</span>
          </Link>
          <Link to="/forecast" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Cloud className="h-5 w-5" />
            <span>Forecast</span>
          </Link>
          <Link to="/recommendations" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Compass className="h-5 w-5" />
            <span>Recommendations</span>
          </Link>
          <Link to="/alerts" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Bell className="h-5 w-5" />
            <span>Alerts</span>
          </Link>
          <Link to="/simulation" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700">
            <Monitor className="h-5 w-5" />
            <span>Simulation Panel</span>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
