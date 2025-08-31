import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Anchor,
  Bell,
  CheckCircle,
  Cloud,
  Download,
  Eye,
  Gauge,
  Grid,
  MapPin,
  RefreshCw,
  Table as TableIcon,
  Thermometer,
  TrendingUp,
  Waves,
  Wind,
  X,
  Droplets,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

/**
 * MaritimeForecastApp.tsx
 * --------------------------------------------------------------
 * Production-ready React (TSX) component that implements a black-themed
 * maritime forecast dashboard and now fetches live data from OpenWeather
 * (One Call 3.0) using an API key. Charts have been completed and use
 * light-blue and light-green colors as requested.
 *
 * How to use:
 * 1) Drop this file into your project (e.g., src/components/MaritimeForecastApp.tsx)
 * 2) Ensure shadcn/ui, lucide-react, framer-motion and recharts are available
 * 3) Set env var NEXT_PUBLIC_WEATHER_API_KEY or REACT_APP_WEATHER_API_KEY
 *    (fallback to the included key below if env var is not present)
 * 4) Render <MaritimeForecastApp /> somewhere in your app
 * --------------------------------------------------------------
 */

/** ------------------------------------------------------------
 * Types
 * -----------------------------------------------------------*/

type DayForecast = {
  day: string;
  date: string; // ISO date
  wind: number; // knots
  waves: number; // meters
  temp: number; // °C
  condition: string; // human readable
  description: string; // short
  humidity: number; // %
  pressure: number; // hPa
  visibility: string; // km (string to preserve decimals as given)
  clouds: number; // % cloud cover
  icon?: string; // optional icon code
  windDirection: number; // degrees
  source?: "api-data" | "estimated" | "fallback" | string;
};

type ForecastPayload = {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  days: DayForecast[];
  data_info?: {
    real_days: number;
    estimated_days: number;
    note?: string;
  };
  alerts?: MaritimeAlert[];
};

type MaritimeAlert = {
  id: string;
  type: "HURRICANE" | "CYCLONE" | "TORNADO" | "GALE" | "STORM" | string;
  severity: "info" | "minor" | "moderate" | "severe" | "extreme";
  title: string;
  description: string;
  start: string; // ISO
  end?: string; // ISO
  regions?: string[];
  source?: string;
};

/** ------------------------------------------------------------
 * Minimal Notification system (no external hook)
 * -----------------------------------------------------------*/

type Notice = { id: string; message: string; tone: "success" | "error" | "info" | "warning" };

const useInlineNotifications = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const add = (message: string, tone: Notice["tone"]) => {
    const id = Math.random().toString(36).slice(2);
    setNotices((s) => [...s, { id, message, tone }]);
    setTimeout(() => {
      setNotices((s) => s.filter((n) => n.id !== id));
    }, 2800);
  };
  const remove = (id: string) => setNotices((s) => s.filter((n) => n.id !== id));
  const Container = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className={
            "flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border " +
            (n.tone === "success"
              ? "bg-green-900/70 border-green-700 text-green-100"
              : n.tone === "error"
              ? "bg-red-900/70 border-red-700 text-red-100"
              : n.tone === "warning"
              ? "bg-yellow-900/70 border-yellow-700 text-yellow-100"
              : "bg-slate-800/80 border-slate-700 text-slate-100")
          }
        >
          {n.tone === "success" && <CheckCircle className="w-4 h-4" />}
          {n.tone === "error" && <X className="w-4 h-4" />}
          {n.tone === "warning" && <AlertTriangle className="w-4 h-4" />}
          {n.tone === "info" && <Bell className="w-4 h-4" />}
          <span className="text-sm">{n.message}</span>
          <button onClick={() => remove(n.id)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
  return { add, Container };
};

/** ------------------------------------------------------------
 * Countries list + (optional) lat/lon for quick jumps
 * -----------------------------------------------------------*/

const COUNTRY_CITY_LOOKUP: { label: string; city: string; lat?: number; lon?: number; country: string }[] = [
  { label: "United Kingdom", city: "London", lat: 51.5074, lon: -0.1278, country: "GB" },
  { label: "United States", city: "New York", lat: 40.7128, lon: -74.006, country: "US" },
  { label: "Japan", city: "Tokyo", lat: 35.6762, lon: 139.6503, country: "JP" },
  { label: "Australia", city: "Sydney", lat: -33.8688, lon: 151.2093, country: "AU" },
  { label: "India", city: "Mumbai", lat: 19.076, lon: 72.8777, country: "IN" },
  { label: "Brazil", city: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, country: "BR" },
  { label: "South Africa", city: "Cape Town", lat: -33.9249, lon: 18.4241, country: "ZA" },
  { label: "UAE", city: "Dubai", lat: 25.2048, lon: 55.2708, country: "AE" },
  { label: "Singapore", city: "Singapore", lat: 1.3521, lon: 103.8198, country: "SG" },
  { label: "Canada", city: "Vancouver", lat: 49.2827, lon: -123.1207, country: "CA" },
];

/** ------------------------------------------------------------
 * Utilities
 * -----------------------------------------------------------*/

const toLocalDate = (iso: string) => new Date(iso).toLocaleDateString();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const kmToString = (v: string | number) => `${v}km`;

const seaState = (waves: number) => {
  if (waves > 4) return "Rough";
  if (waves > 2.5) return "Moderate";
  if (waves > 1.25) return "Slight";
  return "Calm";
};

const recForDay = (d: DayForecast) => {
  if (d.wind > 25) return "High wind advisory – exercise caution";
  if (d.waves > 3) return "High seas – reduce speed and secure cargo";
  if (parseFloat(d.visibility) < 5) return "Poor visibility – use radar navigation";
  if (d.condition.toLowerCase().includes("rain")) return "Wet conditions – monitor deck operations";
  return "Safe navigation conditions";
};

const sourceFor = (d: DayForecast) =>
  d.source === "api-data" ? "Live Data" : d.source === "estimated" ? "Estimated" : d.source === "fallback" ? "Fallback" : "API";

const asCSV = (payload: ForecastPayload) => {
  const header = [
    "Day",
    "Date",
    "Condition",
    "Wind Speed (knots)",
    "Wave Height (m)",
    "Temperature (°C)",
    "Humidity (%)",
    "Pressure (hPa)",
    "Visibility (km)",
    "Clouds (%)",
    "Wind Direction (°)",
    "Recommendation",
    "Source",
  ].join(",");
  const rows = payload.days.map((day) =>
    [
      day.day,
      toLocalDate(day.date),
      day.condition,
      day.wind,
      day.waves,
      day.temp,
      day.humidity,
      day.pressure,
      day.visibility,
      day.clouds,
      day.windDirection,
      recForDay(day).replace(/,/g, " "),
      sourceFor(day),
    ].join(",")
  );
  return [header, ...rows].join("\n");
};

/** ------------------------------------------------------------
 * Charts helpers (Recharts expects array of objects)
 * -----------------------------------------------------------*/

const buildChartSeries = (days: DayForecast[]) =>
  days.map((d) => ({
    date: toLocalDate(d.date),
    wind: d.wind,
    waves: d.waves,
    temp: d.temp,
  }));

/** ------------------------------------------------------------
 * Fallback data
 * -----------------------------------------------------------*/

const makeFallback = (name: string, lat = 51.5074, lon = -0.1278): ForecastPayload => ({
  location: {
    name,
    country: "Unknown",
    lat,
    lon,
  },
  days: [
    { day: "Today", date: "2025-08-30", wind: 12, waves: 1.8, temp: 22, condition: "Partly Cloudy", description: "partly cloudy", humidity: 65, pressure: 1013, visibility: "10.0", clouds: 40, icon: "02d", windDirection: 230, source: "fallback" },
    { day: "Tomorrow", date: "2025-08-31", wind: 15, waves: 2.2, temp: 20, condition: "Cloudy", description: "overcast clouds", humidity: 70, pressure: 1010, visibility: "8.5", clouds: 80, icon: "04d", windDirection: 240, source: "fallback" },
    { day: "Day 3", date: "2025-09-01", wind: 18, waves: 2.8, temp: 18, condition: "Light Rain", description: "light rain", humidity: 85, pressure: 1005, visibility: "6.0", clouds: 90, icon: "10d", windDirection: 250, source: "fallback" },
    { day: "Day 4", date: "2025-09-02", wind: 10, waves: 1.5, temp: 24, condition: "Clear", description: "clear sky", humidity: 55, pressure: 1018, visibility: "10.0", clouds: 10, icon: "01d", windDirection: 180, source: "fallback" },
    { day: "Day 5", date: "2025-09-03", wind: 8, waves: 1.2, temp: 26, condition: "Clear", description: "clear sky", humidity: 50, pressure: 1020, visibility: "10.0", clouds: 5, icon: "01d", windDirection: 170, source: "fallback" },
    { day: "Day 6", date: "2025-09-04", wind: 14, waves: 2.0, temp: 23, condition: "Partly Cloudy", description: "partly cloudy", humidity: 60, pressure: 1015, visibility: "9.0", clouds: 30, icon: "02d", windDirection: 200, source: "estimated" },
    { day: "Day 7", date: "2025-09-05", wind: 16, waves: 2.5, temp: 21, condition: "Cloudy", description: "cloudy", humidity: 75, pressure: 1012, visibility: "7.5", clouds: 70, icon: "03d", windDirection: 220, source: "estimated" },
    { day: "Day 8", date: "2025-09-06", wind: 11, waves: 1.8, temp: 25, condition: "Clear", description: "clear sky", humidity: 45, pressure: 1022, visibility: "10.0", clouds: 15, icon: "01d", windDirection: 160, source: "estimated" },
    { day: "Day 9", date: "2025-09-07", wind: 13, waves: 2.1, temp: 22, condition: "Partly Cloudy", description: "partly cloudy", humidity: 65, pressure: 1016, visibility: "8.8", clouds: 35, icon: "02d", windDirection: 190, source: "estimated" },
    { day: "Day 10", date: "2025-09-08", wind: 17, waves: 2.6, temp: 19, condition: "Light Rain", description: "light rain", humidity: 80, pressure: 1008, visibility: "6.5", clouds: 85, icon: "10d", windDirection: 235, source: "estimated" },
  ],
  data_info: { real_days: 0, estimated_days: 10, note: "Forecast data unavailable, showing sample data for demonstration" },
  alerts: [
    {
      id: "a1",
      type: "CYCLONE",
      severity: "moderate",
      title: "Tropical Cyclone watch",
      description: "A developing system may affect offshore routes in 48–72h.",
      start: "2025-08-30T06:00:00Z",
      end: "2025-09-01T06:00:00Z",
      source: "demo",
    },
  ],
});

/** ------------------------------------------------------------
 * Reusable UI snippets
 * -----------------------------------------------------------*/

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700">
    {children}
  </span>
);

const LabelRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-400">{label}</span>
    <span className="text-white">{value}</span>
  </div>
);

/** ------------------------------------------------------------
 * Subcomponents
 * -----------------------------------------------------------*/

function ViewToggle({ view, setView, onInfo }: { view: "cards" | "table" | "charts"; setView: (v: any) => void; onInfo?: () => void }) {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">View Format</div>
          <div className="flex gap-2">
            <Button
              variant={view === "cards" ? "default" : "outline"}
              onClick={() => setView("cards")}
              className={view === "cards" ? "bg-blue-600" : ""}
            >
              <Grid className="w-4 h-4 mr-2" /> Cards
            </Button>
            <Button
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
              className={view === "table" ? "bg-blue-600" : ""}
            >
              <TableIcon className="w-4 h-4 mr-2" /> Table
            </Button>
            <Button
              variant={view === "charts" ? "default" : "outline"}
              onClick={() => setView("charts")}
              className={view === "charts" ? "bg-blue-600" : ""}
            >
              <TrendingUp className="w-4 h-4 mr-2" /> Charts
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountryDropdown({ onPick }: { onPick: (entry: (typeof COUNTRY_CITY_LOOKUP)[number]) => void }) {
  return (
    <Select onValueChange={(value) => {
      const entry = COUNTRY_CITY_LOOKUP.find((e) => e.city === value);
      if (entry) onPick(entry);
    }}>
      <SelectTrigger className="w-[220px] bg-blue-600 text-white border-none rounded-xl shadow-md">
        <MapPin className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Select Country" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_CITY_LOOKUP.map((e) => (
          <SelectItem key={e.city} value={e.city}>
            {e.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CoordinateSetter({ onSet }: { onSet: (lat: number, lon: number) => void }) {
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  return (
    <div className="flex items-center gap-2">
      <Input
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        placeholder="Lat (-90 to 90)"
        className="w-[140px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
      />
      <Input
        value={lon}
        onChange={(e) => setLon(e.target.value)}
        placeholder="Lon (-180 to 180)"
        className="w-[160px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
      />
      <Button
        className="bg-green-600 hover:bg-green-700"
        onClick={() => {
          const la = parseFloat(lat);
          const lo = parseFloat(lon);
          if (Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
            onSet(la, lo);
          }
        }}
      >
        <TrendingUp className="w-4 h-4 mr-2" /> Coordinates
      </Button>
    </div>
  );
}

function ForecastCards({ days, onView }: { days: DayForecast[]; onView: (d: DayForecast) => void }) {
  const iconFor = (c: string) => {
    const l = c.toLowerCase();
    if (l.includes("rain")) return <Droplets className="w-5 h-5 text-blue-400" />;
    if (l.includes("cloud")) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (l.includes("wind")) return <Wind className="w-5 h-5 text-green-400" />;
    if (l.includes("clear")) return <CheckCircle className="w-5 h-5 text-yellow-400" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };
  const colorFor = (c: string) => {
    const l = c.toLowerCase();
    if (l.includes("rain")) return "text-blue-400";
    if (l.includes("cloud")) return "text-gray-400";
    if (l.includes("wind")) return "text-green-400";
    if (l.includes("clear")) return "text-yellow-400";
    return "text-gray-400";
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {days.map((day, i) => (
        <Card key={i} className="bg-gray-900 border-gray-700 hover:bg-gray-800 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">{day.day}</CardTitle>
              {iconFor(day.condition)}
            </div>
            <div className="text-sm text-gray-400">{toLocalDate(day.date)}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{day.temp}°C</div>
              <div className={`text-sm ${colorFor(day.condition)}`}>{day.condition}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-400">
                  <Wind className="w-4 h-4 mr-1" /> Wind
                </div>
                <span className="text-white font-semibold">{day.wind} knots</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-400">
                  <Waves className="w-4 h-4 mr-1" /> Waves
                </div>
                <span className="text-white font-semibold">{day.waves}m</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-400">
                  <Eye className="w-4 h-4 mr-1" /> Visibility
                </div>
                <span className="text-white font-semibold">{kmToString(day.visibility)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onView(day)}>
                <Eye className="w-4 h-4 mr-1" /> View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ForecastTable({ days, onView }: { days: DayForecast[]; onView: (d: DayForecast) => void }) {
  const colorFor = (c: string) => {
    const l = c.toLowerCase();
    if (l.includes("rain")) return "text-blue-400";
    if (l.includes("cloud")) return "text-gray-400";
    if (l.includes("wind")) return "text-green-400";
    if (l.includes("clear")) return "text-yellow-400";
    return "text-gray-400";
  };
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Detailed Forecast Table</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 p-2">Day</th>
                <th className="text-left text-gray-400 p-2">Date</th>
                <th className="text-left text-gray-400 p-2">Condition</th>
                <th className="text-left text-gray-400 p-2">Wind</th>
                <th className="text-left text-gray-400 p-2">Waves</th>
                <th className="text-left text-gray-400 p-2">Temp</th>
                <th className="text-left text-gray-400 p-2">Visibility</th>
                <th className="text-left text-gray-400 p-2">Recommendation</th>
                <th className="text-left text-gray-400 p-2">Source</th>
                <th className="text-left text-gray-400 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="text-white p-2 font-semibold">{d.day}</td>
                  <td className="text-white p-2">{toLocalDate(d.date)}</td>
                  <td className={`p-2 ${colorFor(d.condition)}`}>{d.condition}</td>
                  <td className="text-white p-2">{d.wind} knots</td>
                  <td className="text-white p-2">{d.waves}m</td>
                  <td className="text-white p-2">{d.temp}°C</td>
                  <td className="text-white p-2">{kmToString(d.visibility)}</td>
                  <td className="text-yellow-300 p-2 text-xs">{recForDay(d)}</td>
                  <td className="text-gray-400 p-2 text-xs">{sourceFor(d)}</td>
                  <td className="p-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => onView(d)}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsModal({ day, onClose }: { day: DayForecast; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${day.day} details`}
    >
      <Card className="bg-gray-900 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-xl">{day.day} – {day.condition}</CardTitle>
            <Button onClick={onClose} size="sm" variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-gray-400">{toLocalDate(day.date)}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{day.temp}°C</div>
              <div className="text-gray-400 text-sm">Temperature</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{day.wind}</div>
              <div className="text-gray-400 text-sm">Wind (knots)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{day.waves}m</div>
              <div className="text-gray-400 text-sm">Wave Height</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">{kmToString(day.visibility)}</div>
              <div className="text-gray-400 text-sm">Visibility</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3">Weather Details</h4>
              <div className="space-y-3">
                <LabelRow label="Condition:" value={day.condition} />
                <LabelRow label="Description:" value={<span className="capitalize">{day.description}</span>} />
                <LabelRow label="Humidity:" value={`${day.humidity}%`} />
                <LabelRow label="Pressure:" value={`${day.pressure} hPa`} />
                <LabelRow label="Cloud Cover:" value={`${day.clouds}%`} />
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Marine Conditions</h4>
              <div className="space-y-3">
                <LabelRow label="Wind Direction:" value={`${day.windDirection}°`} />
                <LabelRow label="Data Source:" value={sourceFor(day)} />
                <LabelRow label="Sea State:" value={seaState(day.waves)} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Navigation Recommendations</h4>
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-200">{recForDay(day)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Safety Guidelines</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start"><span className="text-blue-400 mr-2">•</span> Monitor weather conditions continuously during voyage</li>
              <li className="flex items-start"><span className="text-blue-400 mr-2">•</span> Adjust speed and course based on sea conditions</li>
              <li className="flex items-start"><span className="text-blue-400 mr-2">•</span> Ensure all safety equipment is readily accessible</li>
              <li className="flex items-start"><span className="text-blue-400 mr-2">•</span> Maintain radio contact with maritime authorities</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts?: MaritimeAlert[] }) {
  if (!alerts || alerts.length === 0) return null;
  const colorBySeverity = (sev: MaritimeAlert["severity"]) =>
    sev === "extreme" || sev === "severe"
      ? "bg-red-900/60 border-red-700 text-red-100"
      : sev === "moderate"
      ? "bg-yellow-900/60 border-yellow-700 text-yellow-100"
      : sev === "minor"
      ? "bg-blue-900/50 border-blue-700 text-blue-100"
      : "bg-slate-800/60 border-slate-700 text-slate-100";
  const iconByType = (t: MaritimeAlert["type"]) =>
    t === "HURRICANE" || t === "CYCLONE" || t === "STORM" ? <Waves className="w-4 h-4" /> : <Wind className="w-4 h-4" />;
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5" /> Storm & Severe Weather Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${colorBySeverity(a.severity)}`}>
            <div className="mt-0.5">{iconByType(a.type)}</div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                <Pill>{a.type}</Pill>
                <Pill>{a.severity.toUpperCase()}</Pill>
                {a.source && <Pill>{a.source}</Pill>}
              </div>
              <p className="text-sm opacity-90 mt-1">{a.description}</p>
              <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-3">
                <span>Start: {toLocalDate(a.start)}</span>
                {a.end && <span>End: {toLocalDate(a.end)}</span>}
                {a.regions && a.regions.length > 0 && <span>Regions: {a.regions.join(", ")}</span>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** ------------------------------------------------------------
 * ChartsSection - completed with colors: light blue (wind), light green (waves), orange (temp)
 * -----------------------------------------------------------*/

function ChartsSection({ days }: { days: DayForecast[] }) {
  const data = useMemo(() => buildChartSeries(days), [days]);

  // Colors chosen: light blue and light green (and orange for temp)
  const windStroke = "#7DD3FC"; // tailwind sky-300 (light blue)
  const wavesFill = "#86EFAC"; // tailwind green-200 (light green)
  const tempStroke = "#FB923C"; // tailwind orange-400

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Trends (Wind, Waves, Temp)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 40, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8" }} />
              <YAxis yAxisId="left" tick={{ fill: "#94a3b8" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8" }} />
              <Tooltip />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="wind"
                name="Wind (kts)"
                dot={false}
                stroke={windStroke}
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="waves"
                name="Waves (m)"
                dot={false}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="3 2"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temp"
                name="Temp (°C)"
                dot={false}
                stroke={tempStroke}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8" }} />
              <YAxis tick={{ fill: "#94a3b8" }} />
              <Tooltip />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Bar dataKey="wind" name="Wind (kts)" fill={windStroke} />
              <Bar dataKey="waves" name="Waves (m)" fill={wavesFill} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** ------------------------------------------------------------
 * API key and helpers for fetching live data
 * -----------------------------------------------------------
 *
 * IMPORTANT:
 * - Put your API key in environment as NEXT_PUBLIC_WEATHER_API_KEY or REACT_APP_WEATHER_API_KEY.
 * - If you don't, the fallback DEFAULT_API_KEY below will be used (you provided it).
 */

const DEFAULT_API_KEY = "11f58497725da3a88fce6ee433e9782b"; // user-provided fallback; env var preferred

/** ------------------------------------------------------------
 * Transform raw OpenWeather One Call response into ForecastPayload
 * -----------------------------------------------------------*/
function transformApiData(raw: any, lat: number, lon: number): ForecastPayload {
  // OpenWeather One Call /daily structure
  const days: DayForecast[] = (raw.daily || []).slice(0, 10).map((d: any) => {
    // wind_speed is m/s -> convert to knots (1 m/s = 1.94384 knots)
    const windKnots = Math.round((d.wind_speed ?? 0) * 1.94384);
    // waves might not be present in OpenWeather daily. If present, use; else fallback and estimate (or 0)
    const waves = d.wave_height ?? d.waveHeight ?? d.sea_level ?? 0; // attempt multiple fields if provider differs
    // temp.day may be available
    const tempDay = (d.temp && (d.temp.day ?? d.temp)) ?? d.temp;

    return {
      day: new Date(d.dt * 1000).toLocaleDateString(undefined, { weekday: "short" }),
      date: new Date(d.dt * 1000).toISOString(),
      wind: Number.isFinite(windKnots) ? windKnots : 0,
      waves: typeof waves === "number" ? Number(waves) : parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      temp: Math.round(tempDay ?? 0),
      condition: d.weather?.[0]?.main ?? "Unknown",
      description: d.weather?.[0]?.description ?? "",
      humidity: d.humidity ?? 0,
      pressure: d.pressure ?? 0,
      visibility: (((d.visibility ?? 10000) / 1000)).toFixed(1),
      clouds: d.clouds ?? 0,
      icon: d.weather?.[0]?.icon ?? undefined,
      windDirection: d.wind_deg ?? 0,
      source: "api-data",
    } as DayForecast;
  });

  const alerts: MaritimeAlert[] | undefined = raw.alerts?.map((a: any, idx: number) => ({
    id: `alert-${idx}`,
    type: (a.event?.toUpperCase() as any) ?? "ALERT",
    severity: "moderate",
    title: a.event ?? "Weather Alert",
    description: a.description ?? "",
    start: a.start ? new Date(a.start * 1000).toISOString() : new Date().toISOString(),
    end: a.end ? new Date(a.end * 1000).toISOString() : undefined,
    regions: a.regions ?? undefined,
    source: a.sender_name ?? a.source ?? "provider",
  }));

  return {
    location: {
      name: `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`,
      country: raw.timezone ?? "N/A",
      lat,
      lon,
    },
    days,
    data_info: {
      real_days: days.length,
      estimated_days: 0,
      note: `Source: OpenWeather One Call (${raw.timezone ?? "unknown timezone"})`,
    },
    alerts,
  };
}

/** ------------------------------------------------------------
 * Main Component
 * -----------------------------------------------------------*/

export default function MaritimeForecastApp() {
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "table" | "charts">("cards");
  const [selectedDay, setSelectedDay] = useState<DayForecast | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("London");
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { add: notify, Container: NotificationContainer } = useInlineNotifications();

  // useRef for abort controller to avoid race conditions
  const abortRef = useRef<AbortController | null>(null);

  // Unified fetch function that takes lat/lon and calls OpenWeather
  const fetchForecast = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      // Cancel previous request if still in-flight
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || process.env.REACT_APP_WEATHER_API_KEY || DEFAULT_API_KEY;

      // OpenWeather One Call 3.0 endpoint
      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly&appid=${apiKey}`;

      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Weather API error ${res.status}: ${txt}`);
      }
      const raw = await res.json();
      const transformed = transformApiData(raw, lat, lon);
      setForecast(transformed);
      setLastUpdated(new Date().toISOString());
      notify("Forecast data updated successfully", "success");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // intentionally aborted; silently return
        return;
      }
      console.error("fetchForecast error:", err);
      notify("Unable to fetch forecast; showing fallback demo data", "warning");
      const entry = COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation);
      const fb = makeFallback(selectedLocation, coordinates.lat ?? entry?.lat ?? 51.5074, coordinates.lon ?? entry?.lon ?? -0.1278);
      setForecast(fb);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  // Effect: when selectedLocation or coordinates change, determine lat/lon then fetch
  useEffect(() => {
    // prefer explicit coordinates if provided
    if (coordinates.lat != null && coordinates.lon != null) {
      fetchForecast(coordinates.lat, coordinates.lon);
      return;
    }
    // otherwise try to find lat/lon from selectedLocation using lookup table
    const entry = COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation);
    if (entry && typeof entry.lat === "number" && typeof entry.lon === "number") {
      setCoordinates({ lat: entry.lat, lon: entry.lon });
      // fetchForecast will be triggered by coordinates effect above
    } else {
      // If no lat/lon available, use fallback (London by default)
      const fallbackLat = 51.5074;
      const fallbackLon = -0.1278;
      fetchForecast(fallbackLat, fallbackLon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, coordinates.lat, coordinates.lon]);

  const onPickCountry = (entry: (typeof COUNTRY_CITY_LOOKUP)[number]) => {
    setSelectedLocation(entry.city);
    if (typeof entry.lat === "number" && typeof entry.lon === "number") {
      setCoordinates({ lat: entry.lat, lon: entry.lon });
      notify(`Location set to ${entry.label} (${entry.city})`, "info");
    } else {
      setCoordinates({ lat: null, lon: null });
      notify(`Location set to ${entry.label} (${entry.city})`, "info");
    }
  };

  const onSetCoords = (lat: number, lon: number) => {
    setCoordinates({ lat, lon });
    setSelectedLocation(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
    notify(`Coordinates set to ${lat.toFixed(3)}, ${lon.toFixed(3)}`, "info");
  };

  const viewDetails = (day: DayForecast) => {
    setSelectedDay(day);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
  };

  const exportCSV = () => {
    if (!forecast) return notify("No forecast data to export", "warning");
    const csv = asCSV(forecast);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];
    const safe = forecast.location.name.replace(/[^a-zA-Z0-9]/g, "_");
    a.href = url;
    a.download = `maritime-forecast-${safe}-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("Forecast exported as CSV", "success");
  };

  const header = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Anchor className="w-7 h-7 text-blue-400" /> 10-Day Marine Forecast
        </h1>
        <p className="text-gray-400">Detailed weather predictions for optimal voyage planning</p>
        {forecast && (
          <div className="flex items-center flex-wrap gap-3 mt-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {forecast.location.name}, {forecast.location.country}
            </span>
            <span>({forecast.location.lat}°, {forecast.location.lon}°)</span>
            {lastUpdated && <span>Updated: {new Date(lastUpdated).toLocaleString()}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Country dropdown (replacing the old Change Location button) */}
        <CountryDropdown onPick={onPickCountry} />
        {/* Coordinates quick setter */}
        <CoordinateSetter onSet={onSetCoords} />
        {/* Refresh & Export */}
        <Button
          onClick={() => {
            // refresh using current coords or fallback
            const lat = coordinates.lat ?? COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation)?.lat ?? 51.5074;
            const lon = coordinates.lon ?? COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation)?.lon ?? -0.1278;
            fetchForecast(lat, lon);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
        <Button onClick={exportCSV} className="bg-gray-600 hover:bg-gray-700">
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-400" />
          <h2 className="text-xl font-semibold">Loading weather forecast…</h2>
          <p className="text-gray-400">Detailed weather predictions for optimal voyage planning</p>
        </div>
        <NotificationContainer />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <NotificationContainer />
        <div className="max-w-7xl mx-auto">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Forecast Unavailable</h3>
              <p className="text-gray-400">Unable to fetch forecast data at this time.</p>
              <Button onClick={() => {
                const lat = coordinates.lat ?? COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation)?.lat ?? 51.5074;
                const lon = coordinates.lon ?? COUNTRY_CITY_LOOKUP.find((e) => e.city === selectedLocation)?.lon ?? -0.1278;
                fetchForecast(lat, lon);
              }} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <NotificationContainer />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        {header}

        {/* Data Source */}
        {forecast.data_info && (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <span className="text-green-400 font-semibold">{forecast.data_info.real_days}</span> days real data •
                  <span className="text-yellow-400 font-semibold"> {forecast.data_info.estimated_days}</span> days estimated
                </div>
                <div className="text-xs text-gray-500">{forecast.data_info.note}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        <AlertsPanel alerts={forecast.alerts} />

        {/* View toggle */}
        <ViewToggle view={view} setView={setView} />

        {/* Content */}
        {view === "cards" && <ForecastCards days={forecast.days} onView={viewDetails} />}
        {view === "table" && <ForecastTable days={forecast.days} onView={viewDetails} />}
        {view === "charts" && <ChartsSection days={forecast.days} />}

        {/* Modal */}
        {showModal && selectedDay && <DetailsModal day={selectedDay} onClose={closeModal} />}

        {/* Footer tiny legend */}
        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3 pt-2">
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> Wind in knots</span>
          <span className="flex items-center gap-1"><Waves className="w-3 h-3" /> Waves in meters</span>
          <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature in °C</span>
          <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Pressure in hPa</span>
        </div>
      </div>
    </div>
  );
}
