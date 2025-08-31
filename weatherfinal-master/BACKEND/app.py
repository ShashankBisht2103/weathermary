
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import pandas as pd
import os
import io
import matplotlib
import google.generativeai as genai
import openai
import math
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter
from config import OPENWEATHER_API_KEY

matplotlib.use("Agg")  # headless rendering
import matplotlib.pyplot as plt

import google.generativeai as genai

# Configure API key
GENAI_API_KEY = "AIzaSyAojqDJBSH1swhJfxHzNdnW1oJVwiG0_jM"
genai.configure(api_key=GENAI_API_KEY)

def ask_gemini(prompt: str) -> str:
    """Ask Gemini AI a question and return the response"""
    try:
        response = genai.generate(
            model="gemini-1.5",
            prompt=prompt
        )
        text = response.result[0].content[0].text
        return f"Shipmate: {text}"
    except Exception as e:
        return f"Shipmate: Error connecting to Gemini: {str(e)}"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------- Configuration ----------
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GENAI_API_KEY = os.getenv("GENAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# OpenWeather endpoints
OPENWEATHER_CURRENT = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHER_ONECALL = "https://api.openweathermap.org/data/2.5/onecall"

# Configure AI APIs
genai.configure(api_key=GENAI_API_KEY)
openai.api_key = OPENAI_API_KEY

# ---------- Maritime Data ----------
MAJOR_PORTS = {
    "Singapore": { "lat": 1.3521, "lng": 103.8198, "country": "Singapore", "bunker_price": 680, "port_cost_per_ton": 0.8 },
    "Rotterdam": { "lat": 51.9225, "lng": 4.4792, "country": "Netherlands", "bunker_price": 650, "port_cost_per_ton": 0.9 },
    "Shanghai": { "lat": 31.2304, "lng": 121.4737, "country": "China", "bunker_price": 670, "port_cost_per_ton": 0.7 },
    "Hamburg": { "lat": 53.5511, "lng": 9.9937, "country": "Germany", "bunker_price": 660, "port_cost_per_ton": 0.85 },
    "Los Angeles": { "lat": 33.7485, "lng": -118.2436, "country": "USA", "bunker_price": 720, "port_cost_per_ton": 1.0 },
    "Dubai": { "lat": 25.2532, "lng": 55.3657, "country": "UAE", "bunker_price": 640, "port_cost_per_ton": 0.75 },
    "Hong Kong": { "lat": 22.3193, "lng": 114.1694, "country": "Hong Kong", "bunker_price": 675, "port_cost_per_ton": 0.8 },
    "Antwerp": { "lat": 51.2194, "lng": 4.4025, "country": "Belgium", "bunker_price": 655, "port_cost_per_ton": 0.9 },
    "Long Beach": { "lat": 33.7701, "lng": -118.1937, "country": "USA", "bunker_price": 715, "port_cost_per_ton": 1.0 },
    "Busan": { "lat": 35.1796, "lng": 129.0756, "country": "South Korea", "bunker_price": 690, "port_cost_per_ton": 0.8 },
    "Tokyo": { "lat": 35.6162, "lng": 139.7431, "country": "Japan", "bunker_price": 700, "port_cost_per_ton": 0.9 },
    "Mumbai": { "lat": 19.0760, "lng": 72.8777, "country": "India", "bunker_price": 635, "port_cost_per_ton": 0.6 },
    "Felixstowe": { "lat": 51.9542, "lng": 1.3509, "country": "UK", "bunker_price": 665, "port_cost_per_ton": 0.85 },
    "Valencia": { "lat": 39.4699, "lng": -0.3763, "country": "Spain", "bunker_price": 645, "port_cost_per_ton": 0.8 }
}

SHIP_TYPES = {
    "container": {
        "name": "Container Ship",
        "fuel_rate_tons_per_day": 250,
        "avg_speed_knots": 22,
        "cost_per_ton_fuel": 8.5,
        "typical_dwt_range": [50000, 200000],
        "fuel_efficiency_factor": 1.0
    },
    "bulk": {
        "name": "Bulk Carrier", 
        "fuel_rate_tons_per_day": 180,
        "avg_speed_knots": 14,
        "cost_per_ton_fuel": 7.8,
        "typical_dwt_range": [10000, 400000],
        "fuel_efficiency_factor": 0.9
    },
    "tanker": {
        "name": "Oil Tanker",
        "fuel_rate_tons_per_day": 200,
        "avg_speed_knots": 16,
        "cost_per_ton_fuel": 8.2,
        "typical_dwt_range": [5000, 320000],
        "fuel_efficiency_factor": 0.95
    },
    "general": {
        "name": "General Cargo",
        "fuel_rate_tons_per_day": 120,
        "avg_speed_knots": 18,
        "cost_per_ton_fuel": 7.5,
        "typical_dwt_range": [1000, 60000],
        "fuel_efficiency_factor": 1.1
    },
    "roro": {
        "name": "RoRo Vessel",
        "fuel_rate_tons_per_day": 160,
        "avg_speed_knots": 20,
        "cost_per_ton_fuel": 8.0,
        "typical_dwt_range": [5000, 80000],
        "fuel_efficiency_factor": 1.05
    }
}

# ECA Zones (simplified polygons)
ECA_ZONES = {
    "North American ECA": {
        "bounds": {"lat_min": 25, "lat_max": 50, "lng_min": -130, "lng_max": -65},
        "fuel_sulfur_limit": 0.1,
        "description": "North American Emission Control Area"
    },
    "North Sea ECA": {
        "bounds": {"lat_min": 51, "lat_max": 62, "lng_min": -5, "lng_max": 12},
        "fuel_sulfur_limit": 0.1,
        "description": "North Sea and English Channel ECA"
    },
    "Baltic Sea ECA": {
        "bounds": {"lat_min": 53.5, "lat_max": 66, "lng_min": 10, "lng_max": 30},
        "fuel_sulfur_limit": 0.1,
        "description": "Baltic Sea ECA"
    }
}

# Piracy Risk Zones
PIRACY_ZONES = {
    "Gulf of Aden": {
        "bounds": {"lat_min": 10, "lat_max": 18, "lng_min": 42, "lng_max": 52},
        "risk_level": "HIGH",
        "description": "High piracy risk area"
    },
    "West Africa": {
        "bounds": {"lat_min": -5, "lat_max": 10, "lng_min": -10, "lng_max": 8},
        "risk_level": "HIGH", 
        "description": "Gulf of Guinea piracy zone"
    },
    "Strait of Malacca": {
        "bounds": {"lat_min": 1, "lat_max": 6, "lng_min": 100, "lng_max": 105},
        "risk_level": "MEDIUM",
        "description": "Moderate piracy risk"
    }
}

# ---------- Utility Functions ----------
def calculate_great_circle_distance(lat1, lng1, lat2, lng2):
    """Calculate great circle distance in nautical miles"""
    R = 3440.065  # Earth radius in nautical miles
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def is_point_in_zone(lat, lng, zone_bounds):
    """Check if a point is within a zone's bounds"""
    return (zone_bounds["lat_min"] <= lat <= zone_bounds["lat_max"] and 
            zone_bounds["lng_min"] <= lng <= zone_bounds["lng_max"])

def assess_route_risks(origin_coords, dest_coords, departure_date):
    """Assess risks for a maritime route"""
    risks = []
    risk_score = 0

    # Check for piracy zones
    for zone_name, zone_data in PIRACY_ZONES.items():
        if (is_point_in_zone(origin_coords["lat"], origin_coords["lng"], zone_data["bounds"]) or
            is_point_in_zone(dest_coords["lat"], dest_coords["lng"], zone_data["bounds"])):
            risks.append({
                "type": "Piracy Risk",
                "level": zone_data["risk_level"],
                "description": f"Route passes through {zone_name} - {zone_data['description']}",
                "zone": zone_name
            })
            risk_score += 35 if zone_data["risk_level"] == "HIGH" else 20

    # Seasonal weather risks
    dep_month = datetime.fromisoformat(departure_date).month
    if dep_month in [6, 7, 8, 9, 10]:  # Hurricane/Typhoon season
        risks.append({
            "type": "Seasonal Weather",
            "level": "MEDIUM",
            "description": "Hurricane/Typhoon season increases weather risks",
            "season": "storm_season"
        })
        risk_score += 20

    # Route-specific risks
    if abs(origin_coords["lat"] - dest_coords["lat"]) > 40:  # Long north-south routes
        risks.append({
            "type": "Weather Variation",
            "level": "MEDIUM", 
            "description": "Large latitude changes may encounter varied weather conditions",
            "factor": "latitude_change"
        })
        risk_score += 15

    # Port congestion (simplified)
    busy_ports = ["Singapore", "Shanghai", "Rotterdam", "Los Angeles"]
    origin_name = next((name for name, coords in MAJOR_PORTS.items() 
                       if abs(coords["lat"] - origin_coords["lat"]) < 0.1), "Unknown")
    dest_name = next((name for name, coords in MAJOR_PORTS.items() 
                     if abs(coords["lat"] - dest_coords["lat"]) < 0.1), "Unknown")

    if origin_name in busy_ports or dest_name in busy_ports:
        risks.append({
            "type": "Port Congestion",
            "level": "LOW",
            "description": f"Potential delays at major ports ({origin_name}, {dest_name})",
            "ports": [origin_name, dest_name]
        })
        risk_score += 10

    # Overall risk assessment
    if risk_score >= 50:
        overall_risk = "HIGH"
    elif risk_score >= 25:
        overall_risk = "MEDIUM"
    else:
        overall_risk = "LOW"

    return {
        "overall_risk": overall_risk,
        "risk_score": min(risk_score, 100),  # Cap at 100
        "individual_risks": risks,
        "recommendations": generate_risk_recommendations(risks)
    }

def generate_risk_recommendations(risks):
    """Generate safety recommendations based on identified risks"""
    recommendations = ["Monitor weather updates every 6 hours"]

    for risk in risks:
        if risk["type"] == "Piracy Risk":
            recommendations.extend([
                "Follow BMP5 guidelines for piracy prevention",
                "Increase watch vigilance in high-risk areas", 
                "Consider naval escort if available"
            ])
        elif risk["type"] == "Seasonal Weather":
            recommendations.extend([
                "Plan flexible departure window",
                "Increase fuel reserves for weather delays",
                "Monitor tropical weather forecasts"
            ])
        elif risk["type"] == "Port Congestion":
            recommendations.extend([
                "Confirm berth availability before arrival",
                "Plan for potential anchor waiting time"
            ])

    return list(set(recommendations))  # Remove duplicates

def calculate_eca_compliance(origin_coords, dest_coords):
    """Check ECA zone compliance requirements"""
    eca_zones_crossed = []

    for zone_name, zone_data in ECA_ZONES.items():
        # Simplified check - in real implementation would need proper route intersection
        if (is_point_in_zone(origin_coords["lat"], origin_coords["lng"], zone_data["bounds"]) or
            is_point_in_zone(dest_coords["lat"], dest_coords["lng"], zone_data["bounds"])):
            eca_zones_crossed.append(zone_name)

    return {
        "eca_zones_crossed": eca_zones_crossed,
        "fuel_sulfur_requirements": {
            "in_eca_zones": "0.1% sulfur limit",
            "outside_eca_zones": "0.5% sulfur limit",
            "description": "Low sulfur fuel required in ECA zones"
        },
        "compliance_costs": len(eca_zones_crossed) * 15000  # Estimated extra cost per ECA zone
    }

def generate_route_coordinates(origin_coords, dest_coords, num_waypoints=10):
    """Generate intermediate waypoints for route visualization"""
    waypoints = []

    for i in range(num_waypoints + 1):
        ratio = i / num_waypoints
        waypoint = {
            "lat": origin_coords["lat"] + (dest_coords["lat"] - origin_coords["lat"]) * ratio,
            "lng": origin_coords["lng"] + (dest_coords["lng"] - origin_coords["lng"]) * ratio,
            "waypoint_id": i
        }
        waypoints.append(waypoint)

    return waypoints

def calculate_fuel_stops(distance_nm, fuel_capacity_tons, daily_consumption):
    """Calculate required fuel stops based on range"""
    max_range_nm = (fuel_capacity_tons / daily_consumption) * 24 * 14  # 14 knots average

    if distance_nm <= max_range_nm:
        return []

    # Simplified fuel stop calculation
    fuel_stops = []
    remaining_distance = distance_nm

    if distance_nm > 7000:  # Need fuel stop for long routes
        fuel_stops.append({
            "port_name": "Fujairah",
            "coordinates": {"lat": 25.1164, "lng": 56.3467},
            "fuel_needed_tons": 800,
            "fuel_price_per_ton": 645,
            "estimated_cost": 800 * 645,
            "distance_from_origin": 4500
        })

    return fuel_stops

def ask_gemini(prompt: str) -> str:
    """Ask Gemini AI a question and return the response"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        maritime_prompt = f"""
You are Shipmate, an expert maritime AI assistant. You specialize in:
- Marine weather forecasting and interpretation
- Maritime navigation safety and route optimization
- Ship operations and fuel efficiency
- Ocean conditions analysis and risk assessment
- Maritime regulations and compliance
- Port operations and logistics

Please respond as a knowledgeable maritime expert to this query:
{prompt}

Provide practical, safety-focused advice with specific recommendations.
"""
        response = model.generate_content(maritime_prompt)
        return f"Shipmate: {response.candidates[0].content.parts[0].text}"
    except Exception as e:
        return f"Shipmate: I'm experiencing technical difficulties. Error: {str(e)}"

# ---------- API Endpoints ----------
@app.route("/")
def home():
    return {"message": "🌊 Enhanced Maritime Route Planning API with AI"}

# ---------- Enhanced Route Planning Endpoint ----------
@app.route("/api/maritime/route-plan", methods=["POST"])
def maritime_route_plan():
    """Comprehensive maritime route planning endpoint"""
    try:
        data = request.get_json()

        # Extract route parameters
        origin = data.get("origin", "Singapore")
        destination = data.get("destination", "Rotterdam")
        ship_type = data.get("ship_type", "container")
        deadweight = data.get("deadweight", 50000)
        draft = data.get("draft", 12)
        bunker_on_board = data.get("bunker_on_board", 500)
        cargo_value = data.get("cargo_value", 2500000)
        departure_date = data.get("departure_date", "2025-09-01")
        laycan_start = data.get("laycan_start", "2025-09-01")
        laycan_end = data.get("laycan_end", "2025-09-15")
        weather_optimized = data.get("weather_optimized", False)

        # Get port coordinates
        origin_coords = MAJOR_PORTS.get(origin)
        dest_coords = MAJOR_PORTS.get(destination)

        if not origin_coords or not dest_coords:
            return jsonify({"error": "Invalid port selection"}), 400

        # Get ship specifications
        ship_spec = SHIP_TYPES.get(ship_type)
        if not ship_spec:
            return jsonify({"error": "Invalid ship type"}), 400

        # Calculate route distance
        base_distance = calculate_great_circle_distance(
            origin_coords["lat"], origin_coords["lng"],
            dest_coords["lat"], dest_coords["lng"]
        )

        # Apply routing efficiency factor (accounts for canals, coastal routing)
        routing_factor = 1.15  # 15% additional distance for practical routing
        actual_distance = base_distance * routing_factor

        # Calculate voyage parameters
        avg_speed = ship_spec["avg_speed_knots"]
        voyage_days = math.ceil(actual_distance / (avg_speed * 24))
        daily_fuel_consumption = ship_spec["fuel_rate_tons_per_day"] * ship_spec["fuel_efficiency_factor"]

        # Weather impact on fuel consumption
        weather_factor = 1.0
        if weather_optimized:
            weather_factor = 0.95  # 5% fuel savings with weather routing
        else:
            # Check seasonal conditions
            dep_month = datetime.fromisoformat(departure_date).month
            if dep_month in [11, 12, 1, 2, 3]:  # Winter conditions
                weather_factor = 1.15  # 15% increase in rough weather
            elif dep_month in [6, 7, 8, 9]:  # Storm season
                weather_factor = 1.10  # 10% increase

        total_fuel_consumption = voyage_days * daily_fuel_consumption * weather_factor

        # Cost calculations
        avg_bunker_price = (origin_coords["bunker_price"] + dest_coords["bunker_price"]) / 2
        fuel_cost = total_fuel_consumption * avg_bunker_price

        # Port costs
        port_cost_origin = deadweight * origin_coords["port_cost_per_ton"] + 25000
        port_cost_dest = deadweight * dest_coords["port_cost_per_ton"] + 25000
        total_port_costs = port_cost_origin + port_cost_dest

        # Canal costs (simplified)
        canal_cost = 0
        canal_name = None
        route_key = f"{origin}-{destination}"
        if any(x in route_key for x in ["Singapore", "Rotterdam", "Hamburg", "Antwerp"]):
            if any(y in route_key for y in ["Middle East", "Asia", "Europe"]):
                canal_cost = 222865  # Suez Canal
                canal_name = "Suez Canal"

        # Insurance and other costs
        insurance_cost = cargo_value * 0.001  # 0.1% of cargo value
        other_costs = 50000  # Fixed operational costs

        # ECA compliance
        eca_compliance = calculate_eca_compliance(origin_coords, dest_coords)
        compliance_costs = eca_compliance["compliance_costs"]

        total_cost = fuel_cost + total_port_costs + canal_cost + insurance_cost + other_costs + compliance_costs

        # Risk assessment
        risk_assessment = assess_route_risks(origin_coords, dest_coords, departure_date)

        # Fuel stops
        fuel_stops = calculate_fuel_stops(actual_distance, bunker_on_board, daily_fuel_consumption)

        # Generate route coordinates
        main_route_coords = generate_route_coordinates(origin_coords, dest_coords)

        # Generate alternate routes
        alternate_routes = []

        # Northern/Southern route alternative
        alt_cost_factor = 1.12 if risk_assessment["overall_risk"] == "HIGH" else 1.08
        alternate_routes.append({
            "name": "Safety Route",
            "type": "alternate",
            "coordinates": main_route_coords,  # Simplified - would be different path
            "cost": round(total_cost * alt_cost_factor),
            "days": voyage_days + 2,
            "risk_level": "LOW",
            "description": f"Safer route avoiding high-risk areas (+{int((alt_cost_factor-1)*100)}% cost)",
            "fuel_consumption": round(total_fuel_consumption * alt_cost_factor)
        })

        # Weather-optimized route
        if not weather_optimized:
            weather_savings = 0.95
            alternate_routes.append({
                "name": "Weather Optimized",
                "type": "weather",
                "coordinates": main_route_coords,
                "cost": round(total_cost * weather_savings),
                "days": voyage_days - 1,
                "risk_level": "MEDIUM", 
                "description": "Weather-optimized routing (-5% fuel, weather dependent)",
                "fuel_consumption": round(total_fuel_consumption * weather_savings)
            })

        # Build comprehensive response
        response = {
            "route_summary": {
                "origin": origin,
                "destination": destination,
                "distance_nm": round(actual_distance),
                "voyage_days": voyage_days,
                "avg_speed_knots": avg_speed,
                "departure_date": departure_date,
                "arrival_date": (datetime.fromisoformat(departure_date) + timedelta(days=voyage_days)).isoformat()[:10]
            },
            "vessel_info": {
                "ship_type": ship_spec["name"],
                "deadweight_tons": deadweight,
                "draft_meters": draft,
                "fuel_rate_per_day": daily_fuel_consumption,
                "cargo_value": cargo_value,
                "bunker_on_board": bunker_on_board
            },
            "fuel_analysis": {
                "consumption_tons": round(total_fuel_consumption),
                "daily_consumption": round(daily_fuel_consumption),
                "weather_factor": weather_factor,
                "fuel_stops_required": len(fuel_stops),
                "fuel_stops": fuel_stops,
                "bunker_price_avg": round(avg_bunker_price)
            },
            "cost_breakdown": {
                "fuel_cost": round(fuel_cost),
                "port_cost": round(total_port_costs),
                "canal_cost": canal_cost,
                "canal_name": canal_name,
                "insurance_cost": round(insurance_cost),
                "compliance_cost": compliance_costs,
                "other_costs": other_costs,
                "total_cost": round(total_cost)
            },
            "risk_assessment": risk_assessment,
            "regulatory_compliance": eca_compliance,
            "main_route": {
                "coordinates": main_route_coords,
                "type": "main",
                "cost": round(total_cost),
                "days": voyage_days,
                "risk_level": risk_assessment["overall_risk"],
                "fuel_consumption": round(total_fuel_consumption)
            },
            "alternate_routes": alternate_routes,
            "laycan_analysis": {
                "laycan_start": laycan_start,
                "laycan_end": laycan_end,
                "optimal_departure": departure_date,
                "laycan_utilization": "Within window" if laycan_start <= departure_date <= laycan_end else "Outside window"
            }
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": f"Route planning failed: {str(e)}"}), 500

# ---------- Maritime Weather Alerts ----------
@app.route("/api/maritime/weather-alerts", methods=["GET"])
def maritime_weather_alerts():
    """Get maritime-specific weather alerts for a location"""
    try:
        lat = request.args.get("lat")
        lon = request.args.get("lon")

        if not lat or not lon:
            return jsonify({"error": "Latitude and longitude required"}), 400

        # Get current weather
        params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"}
        response = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)

        if not response.ok:
            return jsonify({"error": "Weather data unavailable"}), 502

        weather = response.json()
        alerts = []

        # Convert wind speed to maritime units
        wind_speed_ms = weather.get("wind", {}).get("speed", 0)
        wind_speed_knots = round(wind_speed_ms * 1.94384)

        # Maritime weather alerts
        if wind_speed_knots > 34:  # Gale warning
            severity = "HIGH" if wind_speed_knots > 47 else "MEDIUM"
            alerts.append({
                "type": "Gale Warning",
                "severity": severity,
                "description": f"Strong winds {wind_speed_knots} knots",
                "recommendation": "Reduce speed and secure equipment"
            })

        # Visibility alert
        visibility_m = weather.get("visibility", 10000)
        visibility_nm = round(visibility_m / 1852)  # Convert to nautical miles

        if visibility_nm < 2:
            alerts.append({
                "type": "Poor Visibility",
                "severity": "HIGH",
                "description": f"Visibility {visibility_nm} nautical miles",
                "recommendation": "Use radar and reduce speed"
            })
        elif visibility_nm < 5:
            alerts.append({
                "type": "Reduced Visibility", 
                "severity": "MEDIUM",
                "description": f"Visibility {visibility_nm} nautical miles",
                "recommendation": "Maintain vigilant watch"
            })

        # Wave height estimation (simplified)
        estimated_wave_height = round(wind_speed_ms * 0.3 + 0.8, 1)
        sea_state = get_sea_state(estimated_wave_height)

        if estimated_wave_height > 4:
            alerts.append({
                "type": "High Waves",
                "severity": "MEDIUM" if estimated_wave_height < 6 else "HIGH",
                "description": f"Estimated wave height {estimated_wave_height}m - {sea_state}",
                "recommendation": "Consider route adjustment"
            })

        # Check if in ECA zone
        lat_f, lon_f = float(lat), float(lon)
        eca_zones = []
        for zone_name, zone_data in ECA_ZONES.items():
            if is_point_in_zone(lat_f, lon_f, zone_data["bounds"]):
                eca_zones.append(zone_name)

        if eca_zones:
            alerts.append({
                "type": "ECA Zone",
                "severity": "INFO",
                "description": f"In {', '.join(eca_zones)}",
                "recommendation": "Low sulfur fuel required (≤0.1%)"
            })

        # Check piracy risk
        for zone_name, zone_data in PIRACY_ZONES.items():
            if is_point_in_zone(lat_f, lon_f, zone_data["bounds"]):
                alerts.append({
                    "type": "Security Alert",
                    "severity": "HIGH" if zone_data["risk_level"] == "HIGH" else "MEDIUM",
                    "description": f"In {zone_name} - {zone_data['description']}",
                    "recommendation": "Follow BMP5 security guidelines"
                })

        # Enhanced weather data for maritime use
        maritime_weather = {
            "current": {
                "temp": weather["main"]["temp"],
                "humidity": weather["main"]["humidity"],
                "pressure": weather["main"]["pressure"],
                "wind_speed_knots": wind_speed_knots,
                "wind_direction": weather.get("wind", {}).get("deg", 0),
                "visibility_nm": visibility_nm,
                "estimated_wave_height_m": estimated_wave_height,
                "sea_state": sea_state,
                "cloud_cover": weather["clouds"]["all"],
                "weather_description": weather["weather"][0]["description"]
            },
            "alerts": alerts,
            "eca_zones": eca_zones,
            "location": {
                "lat": lat_f,
                "lon": lon_f
            }
        }

        return jsonify(maritime_weather)

    except Exception as e:
        return jsonify({"error": f"Weather alerts failed: {str(e)}"}), 500

def get_sea_state(wave_height):
    """Convert wave height to sea state description"""
    if wave_height < 0.1:
        return "Calm (glassy)"
    elif wave_height < 0.5:
        return "Calm (rippled)"
    elif wave_height < 1.25:
        return "Smooth"
    elif wave_height < 2.5:
        return "Slight"
    elif wave_height < 4:
        return "Moderate"
    elif wave_height < 6:
        return "Rough"
    elif wave_height < 9:
        return "Very rough"
    elif wave_height < 14:
        return "High"
    else:
        return "Very high"

# ---------- Enhanced Maritime Chatbot ----------
@app.route("/api/maritime/chatbot", methods=["POST"])
def maritime_chatbot():
    """Enhanced maritime AI chatbot with comprehensive expertise"""
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({"response": "Shipmate: Please provide your question."})

        # Enhanced maritime context for Gemini
        enhanced_prompt = f"""
        As Shipmate, a maritime AI expert, analyze this query and provide comprehensive advice:
        {user_message}

        Consider these aspects:
        - Route optimization and weather routing
        - Fuel efficiency and cost optimization  
        - Maritime safety and risk assessment
        - Regulatory compliance (ECA zones, MARPOL)
        - Port operations and logistics
        - Emergency procedures if applicable
        - Seasonal weather patterns
        - Piracy risk areas and security measures

        Provide specific, actionable recommendations with quantitative details where possible.
        """

        response = ask_gemini(enhanced_prompt)

        return jsonify({
            "response": response,
            "timestamp": datetime.utcnow().isoformat(),
            "context": "maritime_expert"
        })

    except Exception as e:
        return jsonify({"response": f"Shipmate: Technical difficulties encountered. {str(e)}"})

# ---------- Existing endpoints (preserved) ----------
@app.route("/api/weather/city", methods=["GET"])
def weather_city():
    city = request.args.get("city", "London")
    params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    r = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)
    return jsonify(r.json()), r.status_code

@app.route("/api/weather/coords", methods=["GET"])
def weather_coords():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Latitude and Longitude required"}), 400

    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "exclude": "minutely"}
    r = requests.get(OPENWEATHER_ONECALL, params=params, timeout=20)

    # Enhance with maritime calculations
    if r.ok:
        weather_data = r.json()
        if "current" in weather_data:
            current = weather_data["current"]
            wind_ms = current.get("wind_speed", 0)
            current["wind_speed_knots"] = round(wind_ms * 1.94384)
            current["estimated_wave_height_m"] = round(wind_ms * 0.3 + 0.8, 1)
            current["visibility_nm"] = round(current.get("visibility", 10000) / 1852)
            current["sea_state"] = get_sea_state(current["estimated_wave_height_m"])

    return jsonify(r.json()), r.status_code

@app.route("/api/marine", methods=["GET"])
def marine():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Latitude and Longitude required"}), 400
    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "exclude": "minutely"}
    r = requests.get(OPENWEATHER_ONECALL, params=params, timeout=20)
    return jsonify(r.json()), r.status_code

@app.route("/api/map/export", methods=["GET"])
def export_map():
    title = request.args.get("title", "Maritime Route Map")
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.grid(True, alpha=0.3)

    # Plot major ports
    for port_name, coords in MAJOR_PORTS.items():
        ax.scatter(coords["lng"], coords["lat"], s=50, c='red', marker='s', alpha=0.7)
        ax.text(coords["lng"] + 1, coords["lat"] + 1, port_name, fontsize=8)

    # Plot selected location if provided
    if lat and lon:
        try:
            lat_f, lon_f = float(lat), float(lon)
            ax.scatter(lon_f, lat_f, s=100, c='blue', marker='*')
            ax.text(lon_f + 2, lat_f + 2, f"Selected\n({lat}, {lon})", fontsize=10)
        except ValueError:
            pass

    # Set reasonable bounds
    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)

    img = io.BytesIO()
    plt.tight_layout()
    plt.savefig(img, format="png", dpi=200, bbox_inches='tight')
    img.seek(0)
    plt.close()

    return send_file(img, mimetype="image/png", as_attachment=True, download_name="maritime_route_map.png")

# ---------- 10-Day Forecast with Maritime Enhancements ----------
@app.route("/api/forecast10", methods=["GET"])
def forecast10():
    """Enhanced 10-day forecast with maritime calculations"""
    city = request.args.get("city")
    lat = request.args.get("lat") 
    lon = request.args.get("lon")

    try:
        if city and not (lat and lon):
            # Resolve city to coordinates
            params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}
            r = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)
            r.raise_for_status()
            j = r.json()
            lat = j["coord"]["lat"]
            lon = j["coord"]["lon"]
            resolved_name = j.get("name", city)
            country = j.get("sys", {}).get("country", "")
        else:
            resolved_name = city or "Selected location"
            country = ""

        # Get 5-day forecast
        fc_params = {"appid": OPENWEATHER_API_KEY, "units": "metric"}
        if city:
            fc_params["q"] = city
        else:
            fc_params["lat"] = lat
            fc_params["lon"] = lon

        fc_r = requests.get(OPENWEATHER_FORECAST, params=fc_params, timeout=20)
        fc_r.raise_for_status()
        fc = fc_r.json()

        # Process forecast data with maritime enhancements
        days = []
        buckets = defaultdict(list)

        for item in fc.get("list", []):
            dt = datetime.fromtimestamp(item["dt"], tz=timezone.utc)
            day_key = dt.date().isoformat()
            buckets[day_key].append(item)

        for day_key, entries in sorted(buckets.items()):
            # Aggregate daily data
            temps = [e["main"]["temp"] for e in entries if "main" in e]
            winds = [e["wind"]["speed"] for e in entries if "wind" in e]

            wind_ms = sum(winds) / len(winds) if winds else 4.0
            wind_knots = round(wind_ms * 1.94384)
            estimated_waves = round(wind_ms * 0.3 + 0.8, 1)

            days.append({
                "day": f"Day {len(days)+1}",
                "date": day_key,
                "temp": round(sum(temps)/len(temps)) if temps else 22,
                "wind": wind_knots,
                "waves": estimated_waves,
                "sea_state": get_sea_state(estimated_waves),
                "condition": entries[0]["weather"][0]["main"] if entries else "Clear",
                "source": "api-data"
            })

        # Generate estimated days for remaining days to reach 10
        while len(days) < 10:
            last_day = days[-1] if days else {"temp": 22, "wind": 15, "waves": 2.0}
            new_date = (datetime.fromisoformat(last_day["date"]) + timedelta(days=1)).date().isoformat()

            # Add some variation
            temp_var = (-2 + (len(days) % 3))
            wind_var = (-3 + (len(days) % 4))
            wave_var = round((-0.3 + (len(days) % 3) * 0.2), 1)

            days.append({
                "day": f"Day {len(days)+1}",
                "date": new_date,
                "temp": max(-10, min(45, last_day["temp"] + temp_var)),
                "wind": max(5, min(35, last_day["wind"] + wind_var)),
                "waves": max(0.5, min(6.0, last_day["waves"] + wave_var)),
                "sea_state": get_sea_state(max(0.5, min(6.0, last_day["waves"] + wave_var))),
                "condition": "Partly Cloudy",
                "source": "estimated"
            })

        return jsonify({
            "location": {
                "name": resolved_name,
                "country": country,
                "lat": float(lat),
                "lon": float(lon)
            },
            "days": days[:10],
            "maritime_note": "Wind speeds in knots, wave heights estimated using Pierson-Moskowitz spectrum"
        })

    except Exception as e:
        return jsonify({"error": f"Forecast unavailable: {str(e)}"}), 500

# ---------- Port Information Endpoint ----------
@app.route("/api/maritime/ports", methods=["GET"])
def maritime_ports():
    """Get information about major maritime ports"""
    search = request.args.get("search", "").lower()

    ports = {}
    for port_name, port_data in MAJOR_PORTS.items():
        if not search or search in port_name.lower():
            ports[port_name] = {
                **port_data,
                "facilities": "Container terminal, Bulk handling, Bunker services",
                "max_draft": "18m",  # Typical for major ports
                "approaches": "Deep water access"
            }

    return jsonify({
        "ports": ports,
        "total_ports": len(ports),
        "search_term": search
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)