# config.py

import os

# --- OpenWeather API ---
OPENWEATHER_API_KEY = "11f58497725da3a88fce6ee433e9782b"
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
OPENWEATHER_CURRENT = f"{OPENWEATHER_BASE_URL}/weather"
OPENWEATHER_FORECAST = f"{OPENWEATHER_BASE_URL}/forecast"
OPENWEATHER_ONECALL = f"{OPENWEATHER_BASE_URL}/onecall"

# --- AI API Keys ---
GENAI_API_KEY = "AIzaSyAojqDJBSH1swhJfxHzNdnW1oJVwiG0_jM"
OPENAI_API_KEY = "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"

# --- Database ---
DATABASE_URL = "sqlite:///maritime_routes.db"

# --- Flask ---
DEBUG = True
PORT = 5000
HOST = "0.0.0.0"

# --- CORS ---
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]

# --- Maritime Calculation Constants ---
EARTH_RADIUS_NM = 3440.065  # Earth radius in nautical miles
DEFAULT_FUEL_EFFICIENCY = 1.0
DEFAULT_WEATHER_FACTOR = 1.0

# --- Cost Constants ---
DEFAULT_BUNKER_PRICE = 650  # USD per MT
DEFAULT_CO2_PRICE = 90      # USD per MT CO2
CO2_EMISSION_FACTOR = 3.17  # Tons CO2 per ton of HFO
ECA_FUEL_PREMIUM = 0.35     # 35% premium for low sulfur fuel in ECA zones

# --- Simulation Constants ---
MIN_SIMULATION_SPEED = 6
MAX_SIMULATION_SPEED = 25
FUEL_STOP_THRESHOLD = 0.8

# --- Weather Thresholds ---
GALE_WARNING_THRESHOLD = 34
HIGH_WIND_THRESHOLD = 47
POOR_VISIBILITY_THRESHOLD = 2
HIGH_WAVE_THRESHOLD = 4

# --- Route Optimization ---
MAX_SPEED_ADJUSTMENT = 2.0
OPTIMIZATION_BUFFER_HOURS = 12

# --- Cache Settings ---
WEATHER_CACHE_DURATION = 1800
ROUTE_CACHE_DURATION = 3600

# --- Logging ---
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
