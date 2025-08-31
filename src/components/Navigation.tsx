import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, TrendingUp, Target, Menu, X, Ship } from "lucide-react";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/map", label: "Interactive Map", icon: Map },
    { path: "/forecast", label: "Forecast", icon: TrendingUp },
    { path: "/recommendations", label: "Recommendations", icon: Target },
    { path: "/simulation", label: "Simulation Panel", icon: Target }, // Connected
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-b border-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Ship className="h-8 w-8 text-blue-400 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-white">Maritime Router</h1>
                <p className="text-xs text-blue-300">Real-time Navigation</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-blue-200 hover:bg-blue-800/50 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-blue-200 hover:text-white p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-blue-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "text-blue-200 hover:bg-blue-800/50 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
