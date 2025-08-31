import React, { useState, useEffect } from 'react';

// --- BASE PROFILES FOR CALCULATION ENGINE ---
const CO2_EMISSION_FACTOR_MT = 3.17; // MT of CO2 per MT of VLSFO fuel

// 🚢 Base Ship Profiles (Used for mathematical formulas)
const SHIP_PROFILES = {
  container: {
    name: "Container Ship",
    base_speed_knots: 18,
    base_fuel_mt_day: 45,
    cargo_capacity_dwt: 150000,
  },
  bulk: {
    name: "Bulk Carrier",
    base_speed_knots: 14,
    base_fuel_mt_day: 35,
    cargo_capacity_dwt: 80000,
  },
  tanker: {
    name: "Oil Tanker",
    base_speed_knots: 15,
    base_fuel_mt_day: 40,
    cargo_capacity_dwt: 120000,
  },
};

// 🗺️ Base Route Profiles (Used for mathematical formulas)
const ROUTE_PROFILES = {
  "Gopalpur to New Harbour": {
    total_distance_nm: 8387.79,
    eca_distance_nm: 2355.37,
    canal: { name: "Suez Canal", cost_usd: 222864 },
    base_port_costs_usd: 62439,
    from: { lat: 30.21, lon: 32.55 },
    to: { lat: 32.31, lon: 30.40 },
    alternate_route: { name: "Cape of Good Hope", distance_nm: 12100, cost_multiplier: 1.15 }
  },
  "Rotterdam to Singapore": {
    total_distance_nm: 8295.0,
    eca_distance_nm: 550.0,
    canal: { name: "Suez Canal", cost_usd: 235000 },
    base_port_costs_usd: 75000,
    from: { lat: 51.92, lon: 4.47 },
    to: { lat: 1.29, lon: 103.85 },
    alternate_route: { name: "Cape of Good Hope", distance_nm: 11750, cost_multiplier: 1.1 }
  }
};

// --- HELPER FUNCTIONS ---
const formatDateForInput = (dateStr) => {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = `0${d.getUTCMonth() + 1}`.slice(-2);
  const day = `0${d.getUTCDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
};
const formatNumber = (num, digits = 2) => num != null ? num.toLocaleString(undefined, { maximumFractionDigits: digits }) : 'N/A';
const formatCurrency = (num) => `$${formatNumber(num)}`;

// --- REAL-TIME CALCULATION ENGINE ---
const calculateVoyageScenario = ({ ship, route, commanded_speed, weather_factor = 1.0, costParams, laycan, scenarioName }) => {
  // 1. Voyage Duration (Days = Distance / Speed)
  const effective_sog_knots = commanded_speed / weather_factor;
  const voyage_hours = route.total_distance_nm / effective_sog_knots;
  const voyage_days = voyage_hours / 24;

  // 2. Fuel Consumption (Cubic Law: new_fuel = base_fuel * (new_speed / base_speed)^3)
  const daily_fuel_consumption = ship.base_fuel_mt_day * Math.pow(commanded_speed / ship.base_speed_knots, 3);
  const total_fuel_mt = daily_fuel_consumption * voyage_days;

  // 3. Costs (Based on user inputs)
  const bunker_cost_usd = total_fuel_mt * costParams.bunker_price_usd_mt;
  const co2_cost_usd = total_fuel_mt * CO2_EMISSION_FACTOR_MT * costParams.co2_price_usd_mt;
  
  // Scale operational costs by ship size
  const dwt_factor = ship.cargo_capacity_dwt / 120000;
  const port_costs_usd = route.base_port_costs_usd * dwt_factor;
  const canal_cost_usd = route.canal.cost_usd * dwt_factor;
  
  const total_voyage_cost_usd = bunker_cost_usd + co2_cost_usd + port_costs_usd + canal_cost_usd;

  // 4. ECA Fuel Split
  const eca_ratio = route.eca_distance_nm / route.total_distance_nm;
  const eca_fuel_consumption_mt = total_fuel_mt * eca_ratio;
  const non_eca_fuel_consumption_mt = total_fuel_mt * (1 - eca_ratio);
  const eca_fuel_cost_usd = eca_fuel_consumption_mt * costParams.bunker_price_usd_mt;
  const non_eca_fuel_cost_usd = non_eca_fuel_consumption_mt * costParams.bunker_price_usd_mt;

  // 5. ETA & Laycan Risk (Based on user inputs)
  const departureDate = new Date(laycan.start);
  const arrivalDate = new Date(departureDate.getTime() + voyage_hours * 60 * 60 * 1000);
  const laycanEndDate = new Date(laycan.end);
  const diffHours = (laycanEndDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60);
  const laycanRisk = { status: diffHours >= 0 ? 'on_time' : 'late', diffHours };

  // 6. Alternate Route
  const alternate_voyage_days = (route.alternate_route.distance_nm / effective_sog_knots) / 24;
  const alternate_cost = total_voyage_cost_usd * route.alternate_route.cost_multiplier;

  // 7. Assemble final object in the required format for rendering
  return {
    name: scenarioName,
    legs: [{ index: 0, from: route.from, to: route.to, distance_nm: route.total_distance_nm, stw_commanded: commanded_speed, stw_effective: effective_sog_knots, sog: effective_sog_knots, leg_hours: voyage_hours, fuel_consumption_mt: total_fuel_mt, arrivalTime: arrivalDate.toISOString() }],
    total: {
      distance_nm: route.total_distance_nm,
      voyage_hours,
      fuel_consumption_mt: total_fuel_mt,
      eta: arrivalDate.toISOString(),
      costs: {
        bunker_cost_usd, eca_fuel_cost_usd, non_eca_fuel_cost_usd, co2_cost_usd,
        canal_cost_usd, port_costs_usd, total_voyage_cost_usd,
        canal_name: route.canal.name,
      },
      laycanRisk,
      eca_distance_nm: route.eca_distance_nm,
      non_eca_distance_nm: route.total_distance_nm - route.eca_distance_nm,
      eca_fuel_consumption_mt,
      non_eca_fuel_consumption_mt,
      cheapest_bunker: `User Price – VLSFO @ $${costParams.bunker_price_usd_mt.toFixed(2)}/MT`,
      alternate_routes: [{ name: route.alternate_route.name, cost: alternate_cost, days: alternate_voyage_days }]
    }
  };
};

// --- Main Simulation Panel Component ---
function SimulationPanel() {
  const [routes] = useState(Object.keys(ROUTE_PROFILES));
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);
  const [shipType, setShipType] = useState('container');
  
  const [stw, setStw] = useState(SHIP_PROFILES.container.base_speed_knots);
  const [ecoStw, setEcoStw] = useState(SHIP_PROFILES.container.base_speed_knots - 2.5);

  const [costParams, setCostParams] = useState({ bunker_price_usd_mt: 650, co2_price_usd_mt: 90 });
  const [laycan, setLaycan] = useState({ start: '2025-09-01T00:00:00Z', end: '2025-09-25T23:59:59Z' });
  
  const [simulationResults, setSimulationResults] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const newShipProfile = SHIP_PROFILES[shipType];
    if (newShipProfile) {
      setStw(newShipProfile.base_speed_knots);
      setEcoStw(newShipProfile.base_speed_knots - 2.5);
    }
  }, [shipType]);

  const handleSimulate = () => {
    setSimLoading(true);
    setError(null);
    setSimulationResults(null);

    const currentShipProfile = SHIP_PROFILES[shipType];
    const currentRouteProfile = ROUTE_PROFILES[selectedRoute];

    setTimeout(() => {
      try {
        const simulationParams = {
          ship: currentShipProfile,
          route: currentRouteProfile,
          costParams,
          laycan
        };
        const results = {
          normal: calculateVoyageScenario({ ...simulationParams, commanded_speed: stw, scenarioName: "Normal Voyage" }),
          eco: calculateVoyageScenario({ ...simulationParams, commanded_speed: ecoStw, scenarioName: "Eco Voyage" }),
          high_cost: calculateVoyageScenario({ ...simulationParams, commanded_speed: stw, weather_factor: 1.15, scenarioName: "High-Cost (Hindrance)" }),
          optimal: calculateVoyageScenario({ ...simulationParams, commanded_speed: stw - 1, scenarioName: "Optimal (Low-Cost)" }),
        };
        setSimulationResults(results);
      } catch (err) {
        setError("An error occurred during calculation. Check input values.");
        console.error(err);
      }
      setSimLoading(false);
    }, 500);
  };

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: Number(value) || 0 }));
  };

  const handleDateChange = (e) => {
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

  const renderResultCard = (result) => {
    if (!result) return null;
    const { name, total } = result;
    const { costs } = total;

    return (
      <div className="bg-gray-800 p-6 rounded-lg">
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
            <div className="flex justify-between text-sm"><span className="text-gray-400">ECA Consumption:</span><span>{formatNumber(total.eca_fuel_consumption_mt)} MT</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Non-ECA Consumption:</span><span>{formatNumber(total.non_eca_fuel_consumption_mt)} MT</span></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-2">Cost Details</h3>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Total Fuel Cost:</span><span>{formatCurrency(costs.bunker_cost_usd)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Canal Cost ({costs.canal_name}):</span><span>{formatCurrency(costs.canal_cost_usd)}</span></div>
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
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Maritime Route Simulation & Analysis</h1>
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Simulation Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Route</label>
              <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg">
                {routes.map(routeName => <option key={routeName} value={routeName}>{routeName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ship Type</label>
              <select value={shipType} onChange={(e) => setShipType(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg">
                {Object.entries(SHIP_PROFILES).map(([key, profile]) => <option key={key} value={key}>{profile.name}</option>)}
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
            <button onClick={handleSimulate} disabled={simLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              {simLoading ? "Running Simulations..." : "Run Simulations & Compare"}
            </button>
          </div>
        </div>
        {error && <div className="bg-red-900 bg-opacity-50 text-red-200 text-center px-4 py-3 rounded-lg mb-6">{error}</div>}
        {simulationResults && (
          <div className="space-y-8">
            {Object.values(simulationResults).map(result => <div key={result.name}>{renderResultCard(result)}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationPanel;