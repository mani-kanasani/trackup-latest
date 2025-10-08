import React from 'react';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14a800" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer Ring - Rotating */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="url(#primaryGradient)"
          strokeWidth="2"
          strokeDasharray="20 10"
          className="animate-spin"
          style={{ 
            transformOrigin: '20px 20px',
            animationDuration: '8s',
            animationDirection: 'normal'
          }}
        />

        {/* Inner Ring - Counter Rotating */}
        <circle
          cx="20"
          cy="20"
          r="14"
          fill="none"
          stroke="url(#accentGradient)"
          strokeWidth="1.5"
          strokeDasharray="15 5"
          className="animate-spin"
          style={{ 
            transformOrigin: '20px 20px',
            animationDuration: '6s',
            animationDirection: 'reverse'
          }}
        />

        {/* Central Hexagon - Pulsing */}
        <polygon
          points="20,8 28,14 28,26 20,32 12,26 12,14"
          fill="url(#primaryGradient)"
          filter="url(#glow)"
          className="animate-pulse"
          style={{ animationDuration: '2s' }}
        />

        {/* Inner Triangle - Floating */}
        <polygon
          points="20,14 25,22 15,22"
          fill="white"
          className="animate-bounce"
          style={{ 
            animationDuration: '3s',
            transformOrigin: '20px 20px'
          }}
        />

        {/* Orbiting Dots */}
        <circle
          cx="32"
          cy="20"
          r="2"
          fill="url(#accentGradient)"
          className="animate-spin"
          style={{ 
            transformOrigin: '20px 20px',
            animationDuration: '4s'
          }}
        />
        <circle
          cx="8"
          cy="20"
          r="1.5"
          fill="url(#primaryGradient)"
          className="animate-spin"
          style={{ 
            transformOrigin: '20px 20px',
            animationDuration: '5s',
            animationDirection: 'reverse'
          }}
        />

        {/* Data Flow Lines */}
        <path
          d="M 5 15 Q 20 5 35 15"
          fill="none"
          stroke="url(#primaryGradient)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
          className="animate-pulse"
          style={{ animationDuration: '1.5s' }}
        />
        <path
          d="M 5 25 Q 20 35 35 25"
          fill="none"
          stroke="url(#accentGradient)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
          className="animate-pulse"
          style={{ 
            animationDuration: '1.5s',
            animationDelay: '0.75s'
          }}
        />
      </svg>
    </div>
  );
};