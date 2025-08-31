import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import LoadingScreen from "./components/LoadingScreen";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Forecast from "./pages/Forecast";
import Recommendations from "./pages/Recommendations";
import Alerts from "./pages/Alerts";
import SimulationPanel from "./pages/SimulationPanel"; // <- Added Simulation Panel
import NotFound from "./pages/NotFound";
import Chatbot from "./components/Chatbot"; 

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Chatbot />
          <div className="min-h-screen bg-background">
            <Navigation />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<Map />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/simulation" element={<SimulationPanel />} /> {/* Connected */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
