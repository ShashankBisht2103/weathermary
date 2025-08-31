import React, { useState, useEffect, ChangeEvent } from 'react';
import { ResultsModal } from './ResultModal';

// --- Type Definitions ---
type ShipData = {
  [key: string]: {
    name: string;
    defaultSpeed: number;
    defaultFuel: number;
  };
};

type Waypoint = {
    lat: number;
    lon: number;
};

type Route = {
  name: string;
  waypoints: Waypoint[];
};

type CostParams = {
  bunker_price_usd_mt: number;
  co2_price_usd_mt: number;
};

type Laycan = {
  start: string;
  end: string;
};

type SimulationResult = {
    name: string;
    legs: any[]; // Define more specific leg type if needed
    total: {
        distance_nm: number;
        voyage_hours: number;
        fuel_consumption_mt: number;
        eta: string;
        costs: {
            bunker_cost_usd: number;
            eca_fuel_cost_usd: number;
            non_eca_fuel_cost_usd: number;
            co2_cost_usd: number;
            canal_cost_usd: number;
            port_costs_usd: number;
            total_voyage_cost_usd: number;
            canal_name: string;
        };
        laycanRisk: {
            status: 'on_time' | 'late' | 'early';
            diffHours: number;
        };
        eca_distance_nm: number;
        non_eca_distance_nm: number;
        eca_fuel_consumption_mt: number;
        non_eca_fuel_consumption_mt: number;
        cheapest_bunker: string;
        alternate_routes?: { name: string; cost: number; days: number }[];
    };
};

// --- Data for Frontend ---
const SHIP_DATA: ShipData = {
  container: { name: "Container Ship", defaultSpeed: 18, defaultFuel: 45 },
  bulk: { name: "Bulk Carrier", defaultSpeed: 14, defaultFuel: 35 },
  tanker: { name: "Oil Tanker", defaultSpeed: 15, defaultFuel: 40 },
};

// --- Comprehensive Dummy Simulation Data ---
const DUMMY_SIMULATION_DATA: { [key: string]: { [key: string]: SimulationResult } } = {
  "Gopalpur to New Harbour": {
    normal: {
      name: "Normal Voyage",
      legs: [ { index: 0, from: { lat: 30.21, lon: 32.55 }, to: { lat: 32.31, lon: 30.40 }, distance_nm: 8387.79, stw_commanded: 18, stw_effective: 17.5, sog: 17.5, leg_hours: 698.4, fuel_consumption_mt: 931.98, arrivalTime: '2025-10-20T12:00:00Z' } ],
      total: {
        distance_nm: 8387.79,
        voyage_hours: 698.4,
        fuel_consumption_mt: 931.98,
        eta: '2025-10-20T12:00:00Z',
        costs: {
          bunker_cost_usd: 404477.87,
          eca_fuel_cost_usd: 113581.18,
          non_eca_fuel_cost_usd: 290896.70,
          co2_cost_usd: 83182.21,
          canal_cost_usd: 222864.64,
          port_costs_usd: 62439.15,
          total_voyage_cost_usd: 772963.87,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'on_time', diffHours: 24 },
        eca_distance_nm: 2355.37,
        non_eca_distance_nm: 6032.42,
        eca_fuel_consumption_mt: 261.71,
        non_eca_fuel_consumption_mt: 670.27,
        cheapest_bunker: "Djibouti I Bunker – VLSFO @ $434.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 890000, days: 35.5 }]
      },
    },
    eco: {
      name: "Eco Voyage",
      legs: [ { index: 0, from: { lat: 30.21, lon: 32.55 }, to: { lat: 32.31, lon: 30.40 }, distance_nm: 8387.79, stw_commanded: 16.5, stw_effective: 16, sog: 16, leg_hours: 762.5, fuel_consumption_mt: 820.50, arrivalTime: '2025-10-23T02:30:00Z' } ],
      total: {
        distance_nm: 8387.79,
        voyage_hours: 762.5,
        fuel_consumption_mt: 820.50,
        eta: '2025-10-23T02:30:00Z',
        costs: {
          bunker_cost_usd: 356017.50,
          eca_fuel_cost_usd: 100000,
          non_eca_fuel_cost_usd: 256017.50,
          co2_cost_usd: 73286.85,
          canal_cost_usd: 222864.64,
          port_costs_usd: 62439.15,
          total_voyage_cost_usd: 714608.14,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'late', diffHours: -38.5 },
        eca_distance_nm: 2355.37,
        non_eca_distance_nm: 6032.42,
        eca_fuel_consumption_mt: 230.0,
        non_eca_fuel_consumption_mt: 590.50,
        cheapest_bunker: "Djibouti I Bunker – VLSFO @ $434.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 810000, days: 38.0 }]
      },
    },
    high_cost: {
      name: "High-Cost (Hindrance)",
      legs: [ { index: 0, from: { lat: 30.21, lon: 32.55 }, to: { lat: 32.31, lon: 30.40 }, distance_nm: 8387.79, stw_commanded: 18, stw_effective: 16, sog: 15.5, leg_hours: 750, fuel_consumption_mt: 1050, arrivalTime: '2025-10-22T06:00:00Z' } ],
      total: {
        distance_nm: 8387.79,
        voyage_hours: 750,
        fuel_consumption_mt: 1050,
        eta: '2025-10-22T06:00:00Z',
        costs: {
          bunker_cost_usd: 455700,
          eca_fuel_cost_usd: 130000,
          non_eca_fuel_cost_usd: 325700,
          co2_cost_usd: 93885,
          canal_cost_usd: 222864.64,
          port_costs_usd: 62439.15,
          total_voyage_cost_usd: 834888.79,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'late', diffHours: -20 },
        eca_distance_nm: 2355.37,
        non_eca_distance_nm: 6032.42,
        eca_fuel_consumption_mt: 290,
        non_eca_fuel_consumption_mt: 760,
        cheapest_bunker: "Djibouti I Bunker – VLSFO @ $434.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 950000, days: 37.0 }]
      },
    },
    optimal: {
      name: "Optimal (Low-Cost)",
       legs: [ { index: 0, from: { lat: 30.21, lon: 32.55 }, to: { lat: 32.31, lon: 30.40 }, distance_nm: 8387.79, stw_commanded: 17, stw_effective: 17, sog: 17.5, leg_hours: 680, fuel_consumption_mt: 890, arrivalTime: '2025-10-19T18:00:00Z' } ],
      total: {
        distance_nm: 8387.79,
        voyage_hours: 680,
        fuel_consumption_mt: 890,
        eta: '2025-10-19T18:00:00Z',
        costs: {
          bunker_cost_usd: 386150,
          eca_fuel_cost_usd: 110000,
          non_eca_fuel_cost_usd: 276150,
          co2_cost_usd: 79415,
          canal_cost_usd: 222864.64,
          port_costs_usd: 62439.15,
          total_voyage_cost_usd: 750868.79,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'on_time', diffHours: 48 },
        eca_distance_nm: 2355.37,
        non_eca_distance_nm: 6032.42,
        eca_fuel_consumption_mt: 250,
        non_eca_fuel_consumption_mt: 640,
        cheapest_bunker: "Djibouti I Bunker – VLSFO @ $434.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 850000, days: 34.0 }]
      },
    }
  },
  "Rotterdam to Singapore": {
    normal: {
      name: "Normal Voyage",
      legs: [ { index: 0, from: { lat: 51.92, lon: 4.47 }, to: { lat: 1.35, lon: 103.81 }, distance_nm: 8500, stw_commanded: 18, stw_effective: 17, sog: 17.2, leg_hours: 708.3, fuel_consumption_mt: 950.00, arrivalTime: '2025-10-20T20:00:00Z' } ],
      total: {
        distance_nm: 8500,
        voyage_hours: 708.3,
        fuel_consumption_mt: 950.00,
        eta: '2025-10-20T20:00:00Z',
        costs: {
          bunker_cost_usd: 412000,
          eca_fuel_cost_usd: 150000,
          non_eca_fuel_cost_usd: 262000,
          co2_cost_usd: 84765,
          canal_cost_usd: 230000,
          port_costs_usd: 65000,
          total_voyage_cost_usd: 791765,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'on_time', diffHours: 16 },
        eca_distance_nm: 2400,
        non_eca_distance_nm: 6100,
        eca_fuel_consumption_mt: 270,
        non_eca_fuel_consumption_mt: 680,
        cheapest_bunker: "Gibraltar - VLSFO @ $660.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 910000, days: 36.0 }]
      },
    },
    eco: {
      name: "Eco Voyage",
      legs: [ { index: 0, from: { lat: 51.92, lon: 4.47 }, to: { lat: 1.35, lon: 103.81 }, distance_nm: 8500, stw_commanded: 16.5, stw_effective: 16, sog: 16.2, leg_hours: 772.7, fuel_consumption_mt: 840.00, arrivalTime: '2025-10-22T12:30:00Z' } ],
      total: {
        distance_nm: 8500,
        voyage_hours: 772.7,
        fuel_consumption_mt: 840.00,
        eta: '2025-10-22T12:30:00Z',
        costs: {
          bunker_cost_usd: 364560,
          eca_fuel_cost_usd: 132300,
          non_eca_fuel_cost_usd: 232260,
          co2_cost_usd: 74988,
          canal_cost_usd: 230000,
          port_costs_usd: 65000,
          total_voyage_cost_usd: 734548,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'late', diffHours: -50.5 },
        eca_distance_nm: 2400,
        non_eca_distance_nm: 6100,
        eca_fuel_consumption_mt: 240,
        non_eca_fuel_consumption_mt: 600,
        cheapest_bunker: "Gibraltar - VLSFO @ $660.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 830000, days: 39.0 }]
      },
    },
     high_cost: {
      name: "High-Cost (Hindrance)",
      legs: [ { index: 0, from: { lat: 51.92, lon: 4.47 }, to: { lat: 1.35, lon: 103.81 }, distance_nm: 8500, stw_commanded: 18, stw_effective: 15.5, sog: 15.0, leg_hours: 800, fuel_consumption_mt: 1100, arrivalTime: '2025-10-23T08:00:00Z' } ],
      total: {
        distance_nm: 8500,
        voyage_hours: 800,
        fuel_consumption_mt: 1100,
        eta: '2025-10-23T08:00:00Z',
        costs: {
          bunker_cost_usd: 477400,
          eca_fuel_cost_usd: 170000,
          non_eca_fuel_cost_usd: 307400,
          co2_cost_usd: 98230,
          canal_cost_usd: 230000,
          port_costs_usd: 65000,
          total_voyage_cost_usd: 870630,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'late', diffHours: -72 },
        eca_distance_nm: 2400,
        non_eca_distance_nm: 6100,
        eca_fuel_consumption_mt: 300,
        non_eca_fuel_consumption_mt: 800,
        cheapest_bunker: "Gibraltar - VLSFO @ $660.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 990000, days: 40.0 }]
      },
    },
    optimal: {
      name: "Optimal (Low-Cost)",
       legs: [ { index: 0, from: { lat: 51.92, lon: 4.47 }, to: { lat: 1.35, lon: 103.81 }, distance_nm: 8500, stw_commanded: 17, stw_effective: 17.2, sog: 17.8, leg_hours: 690, fuel_consumption_mt: 910, arrivalTime: '2025-10-19T10:00:00Z' } ],
      total: {
        distance_nm: 8500,
        voyage_hours: 690,
        fuel_consumption_mt: 910,
        eta: '2025-10-19T10:00:00Z',
        costs: {
          bunker_cost_usd: 395140,
          eca_fuel_cost_usd: 140000,
          non_eca_fuel_cost_usd: 255140,
          co2_cost_usd: 81217,
          canal_cost_usd: 230000,
          port_costs_usd: 65000,
          total_voyage_cost_usd: 771357,
          canal_name: 'Suez Canal',
        },
        laycanRisk: { status: 'on_time', diffHours: 60 },
        eca_distance_nm: 2400,
        non_eca_distance_nm: 6100,
        eca_fuel_consumption_mt: 260,
        non_eca_fuel_consumption_mt: 650,
        cheapest_bunker: "Gibraltar - VLSFO @ $660.00/MT",
        alternate_routes: [{ name: "Cape of Good Hope", cost: 880000, days: 35.0 }]
      },
    }
  }
};


// --- Helper function to format date ---
const formatDateForInput = (dateStr: string): string => {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = `0${d.getUTCMonth() + 1}`.slice(-2);
  const day = `0${d.getUTCDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
};

// --- Helper functions for formatting numbers ---
const formatNumber = (num: number | null | undefined, digits = 2): string => num != null ? num.toLocaleString(undefined, { maximumFractionDigits: digits }) : 'N/A';
const formatCurrency = (num: number | null | undefined): string => `$${formatNumber(num)}`;

// --- Main Simulation Panel Component ---
function SimulationPanel() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [shipType, setShipType] = useState<string>('container');
  const [stw, setStw] = useState<number>(SHIP_DATA.container.defaultSpeed);
  const [ecoStw, setEcoStw] = useState<number>(SHIP_DATA.container.defaultSpeed - 1.5);

  const [costParams, setCostParams] = useState<CostParams>({ bunker_price_usd_mt: 650, co2_price_usd_mt: 90 });
  const [laycan, setLaycan] = useState<Laycan>({ start: '2025-09-21T00:00:00Z', end: '2025-10-25T23:59:59Z' });

  const [simulationResults, setSimulationResults] = useState<{ [key: string]: SimulationResult } | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  
  useEffect(() => {
    async function fetchRoutes() {
        try {
            const response = await fetch('/routes.json');
            if (!response.ok) throw new Error("Could not load route data.");
            const data = await response.json();
            
            // Convert the object of routes into an array
            if (data && typeof data.routes === 'object') {
                const routesArray = Object.values(data.routes);
                setRoutes(routesArray as Route[]);
            } else {
                throw new Error("Invalid route data format.");
            }
        } catch (err: any) {
            console.error("Failed to fetch routes:", err);
            setError(err.message);
        }
    }
    fetchRoutes();
  }, []);

  useEffect(() => {
    const newShipData = SHIP_DATA[shipType];
    if (newShipData) {
      setStw(newShipData.defaultSpeed);
      setEcoStw(newShipData.defaultSpeed - 1.5);
    }
  }, [shipType]);

  const handleSimulate = () => {
    if (!routes[selectedRouteIndex]) {
        setError("Please select a valid route.");
        return;
    }
    setSimLoading(true);
    setError(null);
    setSimulationResults(null);

    setTimeout(() => {
      const selectedRouteName = routes[selectedRouteIndex].name;
      const routeDummyData = DUMMY_SIMULATION_DATA[selectedRouteName];

      if (!routeDummyData) {
          setError(`No dummy data available for the selected route: ${selectedRouteName}`);
          setSimLoading(false);
          return;
      }
      
      setSimulationResults(routeDummyData);
      setSimLoading(false);
    }, 500);
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<CostParams>>) => (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [year, month, day] = value.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    let isoString = utcDate.toISOString();
    if (name === 'end') {
      utcDate.setUTCHours(23, 59, 59, 999);
      isoString = utcDate.toISOString();
    }
    setLaycan(prev => ({ ...prev, [name]: isoString }));
  };

  const renderResultCard = (result: SimulationResult, key: string) => {
    if (!result) return null;

    const { name, total } = result;
    const { costs } = total;

    return (
        <div key={key} className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-white text-center mb-4">{name}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div>
                    <p className="text-sm text-gray-400">Total Voyage Cost</p>
                    <p className="text-xl font-bold text-blue-400">{formatCurrency(costs.total_voyage_cost_usd)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Voyage Days</p>
                    <p className="text-xl font-bold">{formatNumber(total.voyage_hours / 24, 1)} days</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Total Fuel</p>
                    <p className="text-xl font-bold">{formatNumber(total.fuel_consumption_mt)} MT</p>
                </div>
                 <div>
                    <p className="text-sm text-gray-400">Laycan Match</p>
                    <p className={`text-xl font-bold ${total.laycanRisk.status === 'on_time' ? 'text-green-400' : 'text-red-400'}`}>
                        {total.laycanRisk.status.replace('_', ' ')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-700">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white mb-2">Voyage Details</h3>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Total Distance:</span><span>{formatNumber(total.distance_nm)} nm</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">ECA Distance:</span><span>{formatNumber(total.eca_distance_nm)} nm</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Non-ECA Distance:</span><span>{formatNumber(total.non_eca_distance_nm)} nm</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">ECA Consumption:</span><span>{formatNumber(total.eca_fuel_consumption_mt)} MT</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Non-ECA Consumption:</span><span>{formatNumber(total.non_eca_fuel_consumption_mt)} MT</span></div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white mb-2">Cost Details</h3>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Total Fuel Cost:</span><span>{formatCurrency(costs.bunker_cost_usd)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">ECA Fuel Cost:</span><span>{formatCurrency(costs.eca_fuel_cost_usd)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Non-ECA Fuel Cost:</span><span>{formatCurrency(costs.non_eca_fuel_cost_usd)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Canal Cost ({costs.canal_name}):</span><span>{formatCurrency(costs.canal_cost_usd)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Port Costs:</span><span>{formatCurrency(costs.port_costs_usd)}</span></div>
                     <div className="flex justify-between text-sm"><span className="text-gray-400">CO2 Costs:</span><span>{formatCurrency(costs.co2_cost_usd)}</span></div>
                </div>
            </div>
             <div className="text-center pt-4 mt-4 border-t border-gray-700">
                <p className="text-sm text-yellow-400">{total.cheapest_bunker}</p>
                {total.alternate_routes && (
                    <p className="text-sm text-gray-400 mt-1">
                        Alternate via {total.alternate_routes[0].name}: {formatCurrency(total.alternate_routes[0].cost)} ({formatNumber(total.alternate_routes[0].days, 1)} days)
                    </p>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Maritime Route Simulation & Analysis</h1>

        {/* Simulation Config */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Simulation Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Route</label>
              <select 
                value={selectedRouteIndex} 
                onChange={(e) => setSelectedRouteIndex(Number(e.target.value))} 
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
                disabled={!routes.length}
              >
                {routes.length > 0 ? (
                    routes.map((route, index) => <option key={index} value={index}>{route.name}</option>)
                ) : (
                    <option>Loading routes...</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ship Type</label>
              <select value={shipType} onChange={(e) => setShipType(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg">
                {Object.entries(SHIP_DATA).map(([k,d]) => <option key={k} value={k}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Normal Speed (knots)</label>
              <input type="number" value={stw} onChange={(e) => setStw(Number(e.target.value))} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Eco Speed (knots)</label>
              <input type="number" value={ecoStw} onChange={(e) => setEcoStw(Number(e.target.value))} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"/>
            </div>
             <div>
              <label className="block text-sm font-medium mb-2">Bunker Price ($/MT)</label>
              <input type="number" name="bunker_price_usd_mt" value={costParams.bunker_price_usd_mt} onChange={handleInputChange(setCostParams)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CO2 Price ($/MT)</label>
              <input type="number" name="co2_price_usd_mt" value={costParams.co2_price_usd_mt} onChange={handleInputChange(setCostParams)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Laycan Start</label>
              <input type="date" name="start" value={formatDateForInput(laycan.start)} onChange={handleDateChange} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Laycan End</label>
              <input type="date" name="end" value={formatDateForInput(laycan.end)} onChange={handleDateChange} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" />
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button onClick={handleSimulate} disabled={simLoading || !routes.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              {simLoading ? "Running Simulations..." : "Run Simulations & Compare"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900 bg-opacity-50 text-red-200 text-center px-4 py-3 rounded-lg mb-6">{error}</div>}
        
        {simulationResults && (
            <div className="space-y-8">
                {Object.entries(simulationResults).map(([key, result]) => renderResultCard(result, key))}
            </div>
        )}
      </div>
    </div>
  );
}

export default SimulationPanel;

