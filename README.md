🌊 Weather Engine
Project Info
A full-stack weather application that provides real-time weather updates, historical data, alerts, and expert recommendations.  
The project includes a **React + Vite + TailwindCSS frontend** and a **Flask backend** with datasets for weather insights.

## 📌 Features
- Current weather information
- Historical weather dataset integration
- Alerts & recommendations
- Expert chatbot support
- Responsive UI with TailwindCSS

 This project provides an interactive ocean weather dashboard with:
- Moving ocean water animation
- Interactive world map with country boundaries
- Modern UI built with React, TailwindCSS, shadcn/ui

## How to Run Locally
The only requirement is having Node.js & npm installed - Install Node.js

---

## ⚙️ Project Setup

Back end:

# Step 1: Navigate to backend folder
cd Weather-main/BACKEND

# Step 2: Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Step 3: Install required packages
pip install -r requirements.txt

# Step 4: Run the backend server:
python app.py

---
Front end:

# Step 1: Clone the repository using your Git URL
git clone <https://github.com/Pranjalbisht4/Weather.git>

# Step 2: Navigate to the project directory
cd c:/Weather-main

# Step 3: Install the necessary dependencies
npm install

# Step 4: Start the development server with auto-reloading
npm run dev
Now open http://localhost:5173 in your browser 🎉

🛠️ Technologies Used
⚡ Vite (for fast builds & dev server)

⚛️ React (frontend library)

🎨 Tailwind CSS (styling)

🧩 shadcn-ui (UI components)

🌍 Interactive Map (world map with country boundaries)

📦 Deployment
You can deploy this project to Vercel, Netlify, or any hosting provider that supports static React apps.

For example, with Vercel:

npm run build
Then deploy the dist/ folder.


## Project Structure
## 📂 Project Structure

```plaintext
Weather-main/
├── index.html             # Frontend entry
├── package.json           # Frontend dependencies
├── tailwind.config.ts     # Tailwind setup
├── vite.config.ts         # Vite config
├── BACKEND/
│   ├── app.py             # Flask API
│   ├── config.py          # Configurations
│   ├── requirements.txt   # Backend dependencies
│   └── DataSets/          # Weather datasets
│       ├── alerts.csv
│       ├── expert_chat.csv
│       ├── historical_weather.csv
│       └── recommendations.csv



