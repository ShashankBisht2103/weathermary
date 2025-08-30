from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from utils.enhancement_plan import generate_plan
from utils.components_analysis import analyze_components
from utils.generate_weather_graph import create_weather_graph
import requests
import pandas as pd
import os
import io
import matplotlib
import google.generativeai as genai
import openai
matplotlib.use("Agg")  # headless rendering
import matplotlib.pyplot as plt
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter
from config import (
    OPENWEATHER_API_KEY,
    OPENWEATHER_CURRENT,
    OPENWEATHER_FORECAST,
    OPENWEATHER_ONECALL,
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------- AI Configuration ----------
GENAI_API_KEY = "AIzaSyAojqDJBSH1swhJfxHzNdnW1oJVwiG0_jM"  # Replace with your actual key
OPENAI_API_KEY = "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"  # Replace with your actual key

genai.configure(api_key=GENAI_API_KEY)
openai.api_key = OPENAI_API_KEY

def ask_gemini(prompt: str) -> str:
    """Ask Gemini AI a question and return the response"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Enhanced prompt for maritime context
        maritime_prompt = f"""
        You are Shipmate, an expert maritime AI assistant. You specialize in:
        - Marine weather forecasting and interpretation
        - Maritime navigation safety
        - Ship routing and optimization
        - Ocean conditions analysis
        - Maritime emergency procedures
        - Vessel operations guidance
        
        Please respond as a knowledgeable maritime expert to this query:
        {prompt}
        
        Keep responses concise but informative, and always prioritize safety.
        """
        
        response = model.generate_content(maritime_prompt)
        return f"Shipmate: {response.candidates[0].content.parts[0].text}"
    except Exception as e:
        return f"Shipmate: I'm experiencing technical difficulties. Error: {str(e)}"

def ask_gpt(prompt: str) -> str:
    """Ask GPT a question and return the response (fallback option)"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{
                "role": "system", 
                "content": "You are Shipmate, an expert maritime AI assistant specializing in marine weather, navigation safety, and vessel operations."
            }, {
                "role": "user", 
                "content": prompt
            }],
            max_tokens=500,
        )
        return f"Shipmate: {response.choices[0].message.content}"
    except Exception as e:
        return f"Shipmate: GPT service unavailable. Error: {str(e)}"

# ---------- Datasets & bootstrap ----------
DATA_DIR = os.path.join(os.path.dirname(__file__), "datasets")
os.makedirs(DATA_DIR, exist_ok=True)
ALERTS_CSV = os.path.join(DATA_DIR, "alerts.csv")
RECS_CSV = os.path.join(DATA_DIR, "recommendations.csv")
CHAT_CSV = os.path.join(DATA_DIR, "expert_chat.csv")
HISTORICAL_CSV = os.path.join(DATA_DIR, "historical_weather.csv")

def ensure_csv(path: str, headers: list[str], sample_rows: list[list] | None = None):
    if not os.path.exists(path):
        df = pd.DataFrame(sample_rows or [], columns=headers)
        df.to_csv(path, index=False)

ensure_csv(
    ALERTS_CSV,
    ["id", "message", "severity", "acknowledged"],
    [
        [1, "High waves in Bay of Bengal", "High", 0],
        [2, "Storm warning near London", "Medium", 0],
        [3, "Fog advisory – North Sea", "Low", 0],
    ],
)

ensure_csv(
    RECS_CSV,
    ["condition", "rule", "advice", "severity"],
    [
        ["wind>20", "Wind speed over 20 knots", "Delay departure or adjust course.", "High"],
        ["wave>3", "Wave height over 3m", "Reduce speed and maintain safe distance from shore.", "High"],
        ["visibility<2", "Visibility below 2km", "Use radar/ais and slow down.", "Medium"],
    ],
)

ensure_csv(
    CHAT_CSV,
    ["timestamp", "user_message", "assistant_response"],
    [],
)

# ---------- Health ----------
@app.route("/")
def home():
    return {"message": "🌊 Maritime Weather Backend Running with Gemini AI!"}

# ---------- Weather: city ----------
@app.route("/api/weather/city", methods=["GET"])
def weather_city():
    city = request.args.get("city", "London")
    params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    r = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)
    return jsonify(r.json()), r.status_code

# ---------- Weather: coords (OneCall) ----------
@app.route("/api/weather/coords", methods=["GET"])
def weather_coords():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Latitude and Longitude required"}), 400
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
        "exclude": "minutely",
    }
    r = requests.get(OPENWEATHER_ONECALL, params=params, timeout=20)
    return jsonify(r.json()), r.status_code

# ---------- Forecast (original) ----------
@app.route("/api/forecast", methods=["GET"])
def forecast():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    city = request.args.get("city")
    params = {"appid": OPENWEATHER_API_KEY, "units": "metric"}
    if city:
        params["q"] = city
        r = requests.get(OPENWEATHER_FORECAST, params=params, timeout=20)
    elif lat and lon:
        params["lat"] = lat
        params["lon"] = lon
        r = requests.get(OPENWEATHER_FORECAST, params=params, timeout=20)
    else:
        return jsonify({"error": "Provide city or lat/lon"}), 400
    return jsonify(r.json()), r.status_code

# ---------- Marine (OneCall passthrough) ----------
@app.route("/api/marine", methods=["GET"])
def marine():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Latitude and Longitude required"}), 400
    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "exclude": "minutely"}
    r = requests.get(OPENWEATHER_ONECALL, params=params, timeout=20)
    return jsonify(r.json()), r.status_code

# ---------- Historical dataset (simple) ----------
@app.route("/api/history", methods=["GET"])
def historical_weather():
    if not os.path.exists(HISTORICAL_CSV):
        return jsonify([])  # no file yet
    city = request.args.get("city")
    df = pd.read_csv(HISTORICAL_CSV)
    if city and "city" in df.columns:
        df = df[df["city"].str.lower() == city.lower()]
    return jsonify(df.to_dict(orient="records"))

# ---------- Export map (PNG) ----------
@app.route("/api/map/export", methods=["GET"])
def export_map():
    title = request.args.get("title", "Exported Map")
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.set_title(title)
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.grid(True, alpha=0.3)
    # Render a simple "world box"
    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)
    if lat and lon:
        try:
            ax.scatter(float(lon), float(lat), s=80)
            ax.text(float(lon) + 2, float(lat) + 2, f"({lat}, {lon})")
        except ValueError:
            pass
    img = io.BytesIO()
    plt.tight_layout()
    plt.savefig(img, format="png", dpi=160)
    img.seek(0)
    return send_file(img, mimetype="image/png", as_attachment=True, download_name="map.png")

# ---------- Recommendations ----------
@app.route("/api/recommendations", methods=["GET"])
def recommendations():
    wind = float(request.args.get("wind", 12))  # demo defaults
    wave = float(request.args.get("wave", 1.2))
    visibility = float(request.args.get("visibility", 10))
    # Load rules
    df = pd.read_csv(RECS_CSV)
    advice = []
    severity = "Low"
    if wind > 20:
        advice.append(df[df["condition"] == "wind>20"].iloc[0].to_dict())
        severity = "High"
    if wave > 3:
        advice.append(df[df["condition"] == "wave>3"].iloc[0].to_dict())
        severity = "High"
    if visibility < 2:
        advice.append(df[df["condition"] == "visibility<2"].iloc[0].to_dict())
        severity = "Medium" if severity != "High" else "High"
    status = "safe" if len(advice) == 0 else "caution"
    return jsonify({"status": status, "severity": severity, "advice": advice})

# ✅ NEW: Recommendation Actions
@app.route("/api/recommendations/action", methods=["POST"])
def rec_action():
    data = request.json or {}
    action = data.get("action")
    return jsonify({"status": "success", "action_taken": action})

# ---------- Alerts ----------
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    df = pd.read_csv(ALERTS_CSV)
    return jsonify(df.to_dict(orient="records"))

@app.route("/api/alerts/acknowledge", methods=["POST"])
def acknowledge_alerts():
    ids = request.json.get("ids", [])
    df = pd.read_csv(ALERTS_CSV)
    df.loc[df["id"].isin(ids), "acknowledged"] = 1
    df.to_csv(ALERTS_CSV, index=False)
    return jsonify({"status": "acknowledged", "ids": ids})

# ✅ NEW: Alert Details
@app.route("/api/alerts/details/<int:alert_id>", methods=["GET"])
def alert_details(alert_id):
    df = pd.read_csv(ALERTS_CSV)
    row = df[df["id"] == alert_id]
    if row.empty:
        return jsonify({"error": "Alert not found"}), 404
    return jsonify(row.iloc[0].to_dict())

# ✅ NEW: Alert Preferences
@app.route("/api/alerts/preferences", methods=["POST"])
def alert_preferences():
    prefs = request.json or {}
    return jsonify({"status": "updated", "preferences": prefs})

# ---------- Expert Chat (simple rule-based) ----------
@app.route("/api/expert", methods=["POST"])
def expert():
    data = request.get_json(force=True, silent=True) or {}
    user_msg = (data.get("message") or "").strip()
    if not user_msg:
        return jsonify({"response": "Please provide a message."}), 400

    # Very simple deterministic "expert"
    user_lower = user_msg.lower()
    if "route" in user_lower or "course" in user_lower:
        resp = "Consider a coastal route with shelter options. Check wind forecasts every 6 hours."
    elif "storm" in user_lower or "cyclone" in user_lower:
        resp = "Delay departure and secure vessel. Monitor alerts and keep safe harbor options ready."
    elif "fuel" in user_lower:
        resp = "Maintain 30% reserve fuel for contingencies; plan refuel points along the route."
    else:
        resp = "Maintain safe speed, monitor wind/wave forecasts, and keep AIS/radar active in low visibility."

    # Log to CSV
    now = datetime.utcnow().isoformat()
    row = pd.DataFrame([[now, user_msg, resp]], columns=["timestamp", "user_message", "assistant_response"])
    if os.path.exists(CHAT_CSV):
        row.to_csv(CHAT_CSV, mode="a", header=False, index=False)
    else:
        row.to_csv(CHAT_CSV, index=False)
    return jsonify({"response": resp})

# ---------- Enhancement Plan ----------
@app.route("/api/enhancement", methods=["POST"])
def enhancement():
    data = request.json or {}
    result = generate_plan(data)
    return jsonify(result)

# ---------- Component Analysis ----------
@app.route("/api/analysis", methods=["POST"])
def analysis():
    data = request.json or {}
    result = analyze_components(data)
    return jsonify(result)

# ---------- Weather Graph ----------
@app.route("/api/graph", methods=["POST"])
def graph():
    data = request.json or {}
    img = create_weather_graph(data)
    return send_file(
        img,
        mimetype="image/png",
        as_attachment=True,
        download_name="weather_graph.png",
    )

# ================================
# 🚀 10-Day Forecast Endpoint
# ================================
def resolve_coords_for_city(city: str):
    """Resolve city -> (lat, lon, name/country) using current weather endpoint."""
    params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    r = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)
    r.raise_for_status()
    j = r.json()
    lat = j["coord"]["lat"]
    lon = j["coord"]["lon"]
    name = j.get("name", city)
    country = j.get("sys", {}).get("country", "")
    return lat, lon, name, country

def aggregate_3h_to_daily(list3h):
    """
    Turn 3-hourly forecast (5-day) into per-day aggregates.
    Returns list of dicts keyed like our frontend expects.
    """
    buckets = defaultdict(list)
    for it in list3h:
        dt = datetime.fromtimestamp(it["dt"], tz=timezone.utc)
        day_key = dt.date().isoformat()
        buckets[day_key].append(it)

    daily = []
    for day_key, entries in sorted(buckets.items()):
        temps = [e["main"]["temp"] for e in entries if "main" in e]
        hums = [e["main"]["humidity"] for e in entries if "main" in e]
        press = [e["main"]["pressure"] for e in entries if "main" in e]
        winds = [e["wind"]["speed"] for e in entries if "wind" in e]
        wind_deg = [e["wind"].get("deg", 0) for e in entries if "wind" in e]
        clouds = [e["clouds"]["all"] for e in entries if "clouds" in e]
        vis = [e.get("visibility", 10000) for e in entries]

        # most frequent condition/icon
        conds = [e["weather"][0]["main"] for e in entries if e.get("weather")]
        descs = [e["weather"][0]["description"] for e in entries if e.get("weather")]
        icons = [e["weather"][0]["icon"] for e in entries if e.get("weather")]

        cond = Counter(conds).most_common(1)[0][0] if conds else "Clear"
        desc = Counter(descs).most_common(1)[0][0] if descs else "clear sky"
        icon = Counter(icons).most_common(1)[0][0] if icons else "01d"

        wind_ms = sum(winds) / len(winds) if winds else 4.0
        wind_knots = round(wind_ms * 1.94384)
        waves = round((wind_ms * 0.3 + 0.8), 1)

        daily.append({
            "day": "",  # filled on client
            "date": day_key,
            "wind": wind_knots,
            "waves": waves,
            "temp": round(sum(temps)/len(temps)) if temps else 22,
            "condition": cond,
            "description": desc,
            "humidity": round(sum(hums)/len(hums)) if hums else 60,
            "pressure": round(sum(press)/len(press)) if press else 1013,
            "visibility": f"{(sum(vis)/len(vis))/1000:.1f}" if vis else "10.0",
            "clouds": round(sum(clouds)/len(clouds)) if clouds else 20,
            "icon": icon,
            "windDirection": round(sum(wind_deg)/len(wind_deg)) if wind_deg else 0,
            "source": "api-data"
        })
    return daily

def generate_estimated_days(last_real_day, num_days=5):
    """Generate estimated weather data for days 6-10 based on the last real day"""
    estimated_days = []
    base_date = datetime.fromisoformat(last_real_day["date"])
    
    for i in range(1, num_days + 1):
        new_date = base_date + timedelta(days=i)
        # Create slight variations based on last real day
        temp_variation = (-2 + (i % 3))  # Slight temperature variation
        wind_variation = (-3 + (i % 4))  # Slight wind variation
        wave_variation = round((-0.3 + (i % 3) * 0.2), 1)  # Slight wave variation
        
        # Ensure reasonable bounds
        new_temp = max(-10, min(45, last_real_day["temp"] + temp_variation))
        new_wind = max(5, min(35, last_real_day["wind"] + wind_variation))
        new_waves = max(0.5, min(6.0, last_real_day["waves"] + wave_variation))
        
        # Vary conditions slightly
        conditions = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain"]
        condition_idx = (i + hash(last_real_day["condition"])) % len(conditions)
        new_condition = conditions[condition_idx]
        
        estimated_days.append({
            "day": f"Day {5 + i}",
            "date": new_date.date().isoformat(),
            "wind": new_wind,
            "waves": new_waves,
            "temp": new_temp,
            "condition": new_condition,
            "description": new_condition.lower(),
            "humidity": max(30, min(90, last_real_day["humidity"] + (-10 + i * 3))),
            "pressure": max(980, min(1030, last_real_day["pressure"] + (-5 + i * 2))),
            "visibility": f"{max(3.0, min(10.0, float(last_real_day['visibility']) + (-1 + i * 0.3))):.1f}",
            "clouds": max(10, min(90, last_real_day["clouds"] + (-20 + i * 8))),
            "icon": "02d" if "cloudy" in new_condition.lower() else "01d",
            "windDirection": (last_real_day["windDirection"] + i * 15) % 360,
            "source": "estimated"
        })
    
    return estimated_days

@app.route("/api/forecast10", methods=["GET"])
def forecast10():
    """
    Returns exactly 10 days with a mix of real API data (first 5 days)
    and estimated data (days 6-10) based on patterns from real data.
    """
    city = request.args.get("city")
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    try:
        if city and not (lat and lon):
            lat, lon, resolved_name, country = resolve_coords_for_city(city)
        else:
            resolved_name = city or "Selected location"
            country = ""

        # Get 5-day forecast data (this is what the free API supports)
        fc_params = {"appid": OPENWEATHER_API_KEY, "units": "metric"}
        if city:
            fc_params["q"] = city
        else:
            fc_params["lat"] = lat
            fc_params["lon"] = lon

        fc_r = requests.get(OPENWEATHER_FORECAST, params=fc_params, timeout=20)
        fc_r.raise_for_status()
        fc = fc_r.json()

        # Convert 3-hourly data to daily aggregates (gets us ~5 days)
        days = aggregate_3h_to_daily(fc.get("list", []))

        # Ensure we have at least 1 day of real data
        if not days:
            raise Exception("No forecast data available")

        # Take first 5 days of real data (or however many we got)
        real_days = days[:5]

        # Generate estimated data for remaining days to make total 10
        if len(real_days) > 0:
            estimated_days = generate_estimated_days(real_days[-1], 10 - len(real_days))
            days = real_days + estimated_days

        # Ensure exactly 10 days
        days = days[:10]

        # Add friendly labels
        for i, d in enumerate(days):
            if i == 0:
                d["day"] = "Today"
            elif i == 1:
                d["day"] = "Tomorrow"
            else:
                d["day"] = f"Day {i+1}"

        return jsonify({
            "location": {
                "name": resolved_name,
                "country": country,
                "lat": float(lat),
                "lon": float(lon)
            },
            "days": days,
            "data_info": {
                "real_days": len(real_days),
                "estimated_days": len(days) - len(real_days),
                "note": f"First {len(real_days)} days from weather API, remaining days are estimates based on current trends"
            }
        })

    except requests.HTTPError as e:
        return jsonify({"error": "Weather service unavailable", "detail": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Unable to fetch forecast", "detail": str(e)}), 500

# ---------- Ocean coordinates for chatbot ----------
OCEAN_COORDS = {
    "pacific ocean": (0, -160),
    "atlantic ocean": (0, -30),
    "indian ocean": (-20, 80),
    "arctic ocean": (80, 0),
    "southern ocean": (-60, 0),
    "north atlantic": (40, -40),
    "south atlantic": (-30, -20),
    "north pacific": (40, -160),
    "south pacific": (-30, -140),
    "mediterranean sea": (35, 18),
    "bay of bengal": (15, 90),
    "arabian sea": (15, 65),
    "caribbean sea": (15, -75),
    "bering sea": (60, -175),
    "gulf of mexico": (25, -90),
}

# ---------- Enhanced Gemini-powered Chatbot ----------
@app.route("/api/chatbot", methods=["POST"])
def chatbot():
    """
    Shipmate: Enhanced Maritime AI Chatbot powered by Gemini AI
    Falls back to rule-based responses if Gemini fails
    """
    data = request.get_json(force=True, silent=True) or {}
    user_msg = (data.get("message") or "").strip()
    
    if not user_msg:
        return jsonify({"response": "Shipmate: Please enter a message."})

    # Log the conversation
    now = datetime.utcnow().isoformat()
    
    try:
        # Try to use Gemini AI first
        response_text = ask_gemini(user_msg)
        
        # Log successful AI response
        row = pd.DataFrame([[now, user_msg, response_text]], 
                          columns=["timestamp", "user_message", "assistant_response"])
        if os.path.exists(CHAT_CSV):
            row.to_csv(CHAT_CSV, mode="a", header=False, index=False)
        else:
            row.to_csv(CHAT_CSV, index=False)
            
        return jsonify({"response": response_text})
        
    except Exception as e:
        # Fallback to rule-based system if Gemini fails
        user_lower = user_msg.lower()
        
        # Ocean/sea queries (waves, wind, weather)
        for ocean, (lat, lon) in OCEAN_COORDS.items():
            if ocean in user_lower:
                try:
                    params = {
                        "lat": lat,
                        "lon": lon,
                        "appid": OPENWEATHER_API_KEY,
                        "units": "metric",
                        "exclude": "minutely"
                    }
                    r = requests.get(OPENWEATHER_ONECALL, params=params, timeout=20)
                    if r.ok:
                        j = r.json()
                        current = j.get("current", {})
                        wind_ms = current.get("wind_speed", 4.0)
                        wind_knots = round(wind_ms * 1.94384)
                        waves = round((wind_ms * 0.3 + 0.8), 1)
                        cond = current.get("weather", [{"description": "clear sky"}])[0]["description"]
                        resp = (
                            f"Shipmate: {ocean.title()} conditions:\n"
                            f"- Wind: {wind_knots} knots\n"
                            f"- Waves: {waves} meters\n"
                            f"- Weather: {cond}\n"
                            f"- Location: ({lat}, {lon})"
                        )
                    else:
                        resp = f"Shipmate: Sorry, I couldn't fetch data for the {ocean.title()}."
                except:
                    resp = f"Shipmate: Weather data unavailable for {ocean.title()}."
                
                # Log fallback response
                row = pd.DataFrame([[now, user_msg, resp]], 
                                  columns=["timestamp", "user_message", "assistant_response"])
                if os.path.exists(CHAT_CSV):
                    row.to_csv(CHAT_CSV, mode="a", header=False, index=False)
                else:
                    row.to_csv(CHAT_CSV, index=False)
                    
                return jsonify({"response": resp})

        # Weather by city queries
        if "weather" in user_lower or "forecast" in user_lower:
            import re
            match = re.search(r"(?:in|at)\s+([a-zA-Z\s]+)", user_msg)
            city = match.group(1).strip().title() if match else None
            if city:
                try:
                    params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}
                    r = requests.get(OPENWEATHER_CURRENT, params=params, timeout=20)
                    if r.ok:
                        j = r.json()
                        temp = j["main"]["temp"]
                        cond = j["weather"][0]["description"]
                        resp = f"Shipmate: The weather in {city} is {temp}°C with {cond}."
                    else:
                        resp = f"Shipmate: Sorry, I couldn't fetch weather for {city}."
                except:
                    resp = f"Shipmate: Weather service unavailable for {city}."
                return jsonify({"response": resp})

        # Default fallback response
        resp = (
            f"Shipmate: I'm experiencing technical difficulties with my AI system. "
            f"Try asking about weather, ocean conditions, alerts, or navigation advice. "
            f"For example: 'weather in Pacific Ocean', 'waves in Bay of Bengal', 'show alerts'."
        )
        
        # Log fallback response
        row = pd.DataFrame([[now, user_msg, resp]], 
                          columns=["timestamp", "user_message", "assistant_response"])
        if os.path.exists(CHAT_CSV):
            row.to_csv(CHAT_CSV, mode="a", header=False, index=False)
        else:
            row.to_csv(CHAT_CSV, index=False)
        
        return jsonify({"response": resp})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
