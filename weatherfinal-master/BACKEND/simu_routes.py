from flask import Blueprint, request, jsonify
import math
import random
from datetime import datetime, timedelta

simuapp = Blueprint('simuapp', __name__)

# --- Enhanced Data for Simulation ---
BUNKERING_PORTS = {
    "Singapore": {"lat": 1.3521, "lng": 103.8198, "bunker_price": 680},
    "Rotterdam": {"lat": 51.9225, "lng": 4.4792, "bunker_price": 650},
    "Fujairah": {"lat": 25.1164, "lng": 56.3467, "bunker_price": 645},
    "Gibraltar": {"lat": 36.1408, "lng": -5.3536, "bunker_price": 660},
}

# Expanded SHIP_TYPES with more details for accurate simulation
SHIP_TYPES = {
    "container": {
        "name": "Container Ship",
        "fuel_rate_tons_per_day": 45,
        "avg_speed_knots": 18,
        "fuel_capacity_tons": 5000
    },
    "bulk": {
        "name": "Bulk Carrier",
        "fuel_rate_tons_per_day": 35,
        "avg_speed_knots": 14,
        "fuel_capacity_tons": 4000
    },
    "tanker": {
        "name": "Oil Tanker",
        "fuel_rate_tons_per_day": 40,
        "avg_speed_knots": 15,
        "fuel_capacity_tons": 4500
    }
}

# --- Utility Functions ---
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance in nautical miles."""
    R = 3440.065  # Earth radius in nautical miles
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- API Endpoint ---
@simuapp.route("/api/route/simulate", methods=["POST"])
def simulate_route():
    """
    Main simulation endpoint that calculates voyage details based on
    waypoints, vessel parameters, and dynamic weather conditions.
    """
    try:
        data = request.get_json()
        waypoints = data.get("waypoints", [])
        start_time_str = data.get("startTime", "2025-09-21T00:00:00Z")
        stw = float(data.get("stw", 14))
        cost_params = data.get("costs", {})
        laycan = data.get("laycan", {})
        speed_adjustments = data.get("speedAdjustments")
        
        # Get ship type from request and look up its specifications
        ship_type = data.get("shipType", "container")
        ship_spec = SHIP_TYPES.get(ship_type)
        if not ship_spec:
            return jsonify({"error": "Invalid ship type provided."}), 400

        legs = []
        total_dist_nm = 0
        total_hours = 0
        total_fuel = 0
        current_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))

        for i in range(len(waypoints) - 1):
            from_wp = waypoints[i]
            to_wp = waypoints[i + 1]
            dist_nm = calculate_distance(from_wp[0], from_wp[1], to_wp[0], to_wp[1])

            current_stw = stw
            if speed_adjustments:
                adjustment = next((adj for adj in speed_adjustments if adj.get("legIndex") == i), None)
                if adjustment:
                    current_stw = adjustment.get("newStw", stw)

            # Simulate weather effects
            wind_effect = random.uniform(-1.5, 0.5)
            wave_effect = random.uniform(-1.0, -0.2)
            current_effect = random.uniform(-2.0, 2.0)
            stw_effective = current_stw + wind_effect + wave_effect
            sog = stw_effective + current_effect

            if sog < 1.0: # Ensure a minimum speed
                sog = 1.0

            leg_hours = dist_nm / sog if sog > 0 else float('inf')

            # Use ship-specific data for fuel calculation
            base_fuel_per_day = ship_spec.get("fuel_rate_tons_per_day", 30)
            design_speed = ship_spec.get("avg_speed_knots", 14)
            
            # Cubic relationship between speed and fuel consumption
            fuel_consumption_mt = (
                (base_fuel_per_day / 24)
                * leg_hours
                * (current_stw / design_speed) ** 3
            )

            arrival_time = current_time + timedelta(hours=leg_hours)
            legs.append({
                "index": i,
                "from": from_wp,
                "to": to_wp,
                "distance_nm": round(dist_nm, 2),
                "stw_commanded": round(current_stw, 2),
                "stw_effective": round(stw_effective, 2),
                "sog": round(sog, 2),
                "leg_hours": round(leg_hours, 2),
                "fuel_consumption_mt": round(fuel_consumption_mt, 2),
                "arrivalTime": arrival_time.isoformat(),
                "penalties": {"wave": round(-wave_effect, 2), "wind": round(-wind_effect, 2)},
                "c_parallel": round(current_effect, 2),
            })

            total_dist_nm += dist_nm
            total_hours += leg_hours
            total_fuel += fuel_consumption_mt
            current_time = arrival_time

        # --- Post-Voyage Calculations ---
        final_eta = current_time.isoformat()

        # Laycan Analysis
        laycan_end = datetime.fromisoformat(laycan.get("end").replace('Z', '+00:00'))
        diff = (laycan_end - current_time).total_seconds() / 3600
        laycan_status = "on_time"
        if diff < 0:
            laycan_status = "late"
        elif diff > 48:  # More than 2 days early
            laycan_status = "early"

        # Cost Calculation
        bunker_cost = total_fuel * cost_params.get("bunker_price_usd_mt", 650)
        co2_cost = total_fuel * 3.17 * cost_params.get("co2_price_usd_mt", 90) # CO2 emission factor for HFO
        total_voyage_cost = bunker_cost + co2_cost

        # Fuel Stop Calculation (using ship-specific fuel capacity)
        fuel_capacity = ship_spec.get("fuel_capacity_tons", 5000)
        fuel_stops = []
        if total_fuel > fuel_capacity:
            # Simple logic: add one stop at the cheapest port
            cheapest_port = min(BUNKERING_PORTS, key=lambda p: BUNKERING_PORTS[p]["bunker_price"])
            fuel_stops.append({
                "port_name": cheapest_port,
                "fuel_needed_tons": round(total_fuel - fuel_capacity + 500, 2), # Add buffer
            })

        return jsonify({
            "legs": legs,
            "total": {
                "distance_nm": round(total_dist_nm, 2),
                "voyage_hours": round(total_hours, 2),
                "fuel_consumption_mt": round(total_fuel, 2),
                "eta": final_eta,
                "costs": {
                    "bunker_cost_usd": round(bunker_cost),
                    "co2_cost_usd": round(co2_cost),
                    "total_voyage_cost_usd": round(total_voyage_cost),
                },
                "laycanRisk": {
                    "status": laycan_status,
                    "diffHours": round(diff, 2)
                },
                "fuel_stops": fuel_stops
            }
        })

    except Exception as e:
        print(f"Error in simulation: {e}")
        return jsonify({"error": "An internal simulation error occurred."}), 500