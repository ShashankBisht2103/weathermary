import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { XMarkIcon, ChartBarIcon, CurrencyDollarIcon, MapIcon } from '@heroicons/react/24/solid';

const formatNumber = (num?: number) => num ? num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
const formatCurrency = (num?: number) => `$${formatNumber(num)}`;

const COLORS = {
  bunker: '#3B82F6',
  co2: '#FBBF24',
  port: '#10B981',
  canal: '#F59E0B',
  other: '#8B5CF6'
};

const DUMMY_RESULT = {
  total: {
    distance_nm: 1000,
    voyage_hours: 120,
    fuel_consumption_mt: 500,
    eta: new Date().toISOString(),
    costs: {
      bunker_cost_usd: 200000,
      co2_cost_usd: 4500,
      port_costs_usd: 15000,
      canal_cost_usd: 5000,
      total_voyage_cost_usd: 225500,
      canal_name: 'Suez Canal'
    },
    laycanRisk: { status: 'on_time', diffHours: 0 }
  },
  legs: Array.from({ length: 5 }, (_, i) => ({
    index: i,
    from: { lat: 10 + i, lon: 20 + i },
    to: { lat: 11 + i, lon: 21 + i },
    distance_nm: 200,
    stw_commanded: 18,
    stw_effective: 18,
    sog: 17.5,
    leg_hours: 24,
    fuel_consumption_mt: 100,
    arrivalTime: new Date().toISOString()
  }))
};

export function ResultsModal({ normalResult, ecoResult, comparison, onClose, stw, ecoStw }) {
  const [activeTab, setActiveTab] = useState('overview');

  const normal = normalResult || DUMMY_RESULT;
  const eco = ecoResult || DUMMY_RESULT;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Normal Route ({stw} kn)</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span>Total Cost:</span><span className="font-bold text-2xl">{formatCurrency(normal.total.costs.total_voyage_cost_usd)}</span></div>
            <div className="flex justify-between"><span>Voyage Days:</span><span>{formatNumber(normal.total.voyage_hours / 24)} days</span></div>
            <div className="flex justify-between"><span>Total Fuel:</span><span>{formatNumber(normal.total.fuel_consumption_mt)} MT</span></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-900 to-green-700 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Eco Route ({ecoStw} kn)</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span>Total Cost:</span><span className="font-bold text-2xl">{formatCurrency(eco.total.costs.total_voyage_cost_usd)}</span></div>
            <div className="flex justify-between"><span>Voyage Days:</span><span>{formatNumber(eco.total.voyage_hours / 24)} days</span></div>
            <div className="flex justify-between"><span>Total Fuel:</span><span>{formatNumber(eco.total.fuel_consumption_mt)} MT</span></div>
          </div>
        </div>
      </div>
      {comparison && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center"><div className="text-3xl font-bold text-green-400">{formatNumber(comparison.fuelSaved)} MT</div><div className="text-sm text-gray-400">Fuel Saved</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-green-400">{formatCurrency(comparison.costSaved)}</div><div className="text-sm text-gray-400">Cost Saved</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-red-400">+{formatNumber(comparison.delayHours / 24)} days</div><div className="text-sm text-gray-400">Additional Time</div></div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLegsTable = (result) => (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Detailed Legs Analysis</h3>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-600"><th>#</th><th>From</th><th>To</th><th>Dist (nm)</th><th>SOG</th><th>Fuel (MT)</th><th>ETA</th></tr></thead>
          <tbody>
            {result.legs.map((leg) => (
              <tr key={leg.index} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="p-2">{leg.index + 1}</td>
                <td className="p-2">{`${leg.from.lat.toFixed(2)}, ${leg.from.lon.toFixed(2)}`}</td>
                <td className="p-2">{`${leg.to.lat.toFixed(2)}, ${leg.to.lon.toFixed(2)}`}</td>
                <td className="p-2">{formatNumber(leg.distance_nm)}</td>
                <td className="p-2">{formatNumber(leg.sog)}</td>
                <td className="p-2">{formatNumber(leg.fuel_consumption_mt)}</td>
                <td className="p-2">{new Date(leg.arrivalTime).toUTCString().slice(5, 22)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'legs_normal': return renderLegsTable(normal);
      case 'legs_eco': return renderLegsTable(eco);
      default: return renderOverview();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Route Analysis Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="flex border-b border-gray-700 bg-gray-800 flex-wrap">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center px-4 py-3 ${activeTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300'}`}><ChartBarIcon className="w-5 h-5 mr-2" />Overview</button>
          <button onClick={() => setActiveTab('legs_normal')} className={`flex items-center px-4 py-3 ${activeTab === 'legs_normal' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300'}`}><MapIcon className="w-5 h-5 mr-2" />Normal Legs</button>
          <button onClick={() => setActiveTab('legs_eco')} className={`flex items-center px-4 py-3 ${activeTab === 'legs_eco' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300'}`}><MapIcon className="w-5 h-5 mr-2" />Eco Legs</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        <div className="flex justify-end gap-4 p-6 border-t border-gray-700 bg-gray-800">
          <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
}
