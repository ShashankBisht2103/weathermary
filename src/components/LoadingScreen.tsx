import { useEffect, useState } from 'react';
import { Ship } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center wave-animation">
      <div className="text-center space-y-8">
        {/* Animated ship */}
        <div className="relative w-full h-20 overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="animate-ship-sail">
              <Ship className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
          </div>
          {/* Wave line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-full">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Weather Engine</h2>
          <p className="text-white/90 text-lg">Maritime Weather Intelligence</p>
          <p className="text-white/70">Loading maritime data...</p>
          
          {/* Progress indicator */}
          <div className="w-64 mx-auto bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/60 text-sm">{progress}%</p>
        </div>

        {/* Floating bubbles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-white/20 rounded-full bubble-animation"
              style={{
                left: `${20 + i * 12}%`,
                animationDelay: `${i * 0.8}s`,
                bottom: '20%'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;