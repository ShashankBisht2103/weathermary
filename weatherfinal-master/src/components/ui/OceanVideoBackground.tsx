import React from 'react';

// Ocean Video Background Component - Use this if you need a standalone ocean background
const OceanVideoBackground = ({ 
  children, 
  videoSrc = "/ocean-waves.mp4", 
  overlayOpacity = 0.3,
  className = "",
  autoPlay = true,
  muted = true,
  loop = true 
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Ocean Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video 
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          className="w-full h-full object-cover"
          style={{ 
            minHeight: '100vh', 
            minWidth: '100vw',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
          
          {/* Fallback animated background if video fails */}
          <div className="w-full h-full wave-animation bg-gradient-to-b from-blue-500 to-blue-800" />
        </video>
        
        {/* Video Overlay for Better Text Readability */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `rgba(0, 0, 0, ${overlayOpacity})`,
            backdropFilter: 'blur(1px)'
          }}
        />
        
        {/* Animated Ocean Surface Effect */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-blue-900/20" />
          <div className="wave-animation absolute inset-0 bg-gradient-to-r from-blue-400/20 to-teal-400/20" />
        </div>
      </div>

      {/* Content with proper z-index */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Example Usage Component
const OceanBackgroundExample = () => {
  return (
    <OceanVideoBackground 
      videoSrc="/src/assets/ocean-waves.mp4"
      overlayOpacity={0.4}
    >
      {/* Your content goes here */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4 text-shadow-strong">
            Maritime Weather Intelligence
          </h1>
          <p className="text-xl text-white/90 mb-6 text-shadow-medium">
            Professional ocean video background with glassmorphism overlay
          </p>
          
          {/* Example Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { title: "Wind Speed", value: "15 knots", icon: "💨" },
              { title: "Wave Height", value: "2.3m", icon: "🌊" },
              { title: "Temperature", value: "24°C", icon: "🌡️" }
            ].map((item, index) => (
              <div key={index} className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className="text-sm text-white/70">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OceanVideoBackground>
  );
};

// CSS Animation Backup Component (if video fails)
const AnimatedOceanBackground = ({ children, className = "" }) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Animated CSS Ocean Background */}
      <div className="absolute inset-0">
        {/* Base ocean gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900" />
        
        {/* Animated wave layers */}
        <div className="absolute inset-0 wave-animation bg-gradient-to-r from-blue-500/30 to-teal-500/30" />
        <div className="absolute inset-0 wave-animation-fast bg-gradient-to-r from-teal-400/20 to-blue-400/20" 
             style={{ animationDelay: '2s' }} />
        
        {/* Surface ripples */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
        
        {/* Floating bubbles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 bubble-animation"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${Math.random() * 3 + 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default OceanVideoBackground;
export { OceanBackgroundExample, AnimatedOceanBackground };

// Usage Instructions:
/*
1. Import the component:
   import OceanVideoBackground from '@/components/OceanVideoBackground';

2. Wrap your content:
   <OceanVideoBackground videoSrc="/your-ocean-video.mp4">
     <YourContent />
   </OceanVideoBackground>

3. Customize props:
   - videoSrc: Path to your ocean video file
   - overlayOpacity: Darkness of overlay (0-1)
   - autoPlay, muted, loop: Video playback options
   - className: Additional CSS classes

4. Video file recommendations:
   - Format: MP4 (best compatibility)
   - Resolution: 1920x1080 minimum
   - Duration: 30-60 seconds
   - Size: Under 50MB for web performance
   - Content: Seamless loop of ocean waves

5. Fallback support:
   - Component automatically falls back to CSS animation if video fails
   - Use AnimatedOceanBackground for pure CSS version
   - Includes wave animations and bubble effects

6. Accessibility:
   - Video is muted by default (required for autoplay)
   - Includes prefers-reduced-motion support in CSS
   - Text shadows ensure readability
   - Glass effects maintain contrast ratios
*/