# 🌦️ Weathermary – Smart Weather & Route Planner  

Weathermary is a **full-stack web application** that combines **real-time weather updates**, **route planning**, and **travel cost estimation**.  
It helps users plan journeys efficiently by considering **live weather conditions, potential delays, and estimated travel costs**.  

---

## 🔗 Live Demo & Resources
- 🌐 **Live URL:** [Click Here](https://vercel-frontend-nine-topaz.vercel.app/)  
- 📑 **Hackathon PPT:** [View Presentation](https://docs.google.com/presentation/d/15QfzGMapsxUORMl4FlOzoMDB-1M1YO3g/edit?usp=drive_link&ouid=101371929165342517171&rtpof=true&sd=true) 


---

## ✨ Features
- 🌍 **Real-time weather data** from APIs  
- 🗺️ **Route planner** with travel distance & time estimation  
- ⛽ **Fuel cost calculation** based on live fuel prices  
- ⏱️ **Delay prediction** due to weather conditions  
- 📊 **User-friendly dashboard** with cards and charts  
- 📱 Responsive UI for desktop & mobile  

---

## 🛠️ Tech Stack  

### **Frontend**
- React.js (UI rendering & components)  
- TailwindCSS (styling)  
- Axios / Fetch API (to call backend & weather APIs)  

### **Backend**
- Node.js with Express.js (REST API)  
- Business logic for routes, weather integration & cost calculation  
- Error handling for API failures  

### **APIs**
- OpenWeather API (real-time weather data)  
- Google Maps / Mapbox API (routes & distance)  
- (Optional) Fuel API (for fuel price calculation)  

### **Database (Optional Layer)**
- MongoDB / Firebase (to store user history, cached weather data, saved routes)  

---

## ⚙️ How to Run Locally  

### 🔹 Backend Setup
```bash
# Navigate to backend folder
cd weathermary-main/backend

# Install dependencies
npm install

# Create .env file and add your API keys
# Example:
# WEATHER_API_KEY=your_openweather_key
# MAPS_API_KEY=your_googlemaps_key

# Start backend server
npm run start


# Navigate to frontend folder
cd weathermary-main/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
http://localhost:5173

## Project Structure
## 📂 Project Structure

```plaintext
weathermary-main/
├── frontend/              # React + Tailwind frontend
│   ├── src/               # Components & pages
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite config
├── backend/               # Node.js backend
│   ├── app.js             # Main Express server
│   ├── routes/            # API routes (weather, routes, costs)
│   ├── controllers/       # Business logic
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Example environment variables
└── README.md              # Project documentation



