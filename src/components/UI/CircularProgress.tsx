import React from 'react';

interface CircularProgressProps {
  percentage: number;
  title: string;
  numerator: number;
  denominator: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  percentage, 
  title, 
  numerator, 
  denominator 
}) => {
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="card-modern p-6">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wide">
        {title}
      </h3>
      
      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-gray-200 dark:text-gray-600"
            />
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="text-upwork-500 dark:text-upwork-400 transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out opacity-50"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14a800" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white animate-pulse-slow">
              {percentage}%
            </span>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
          {numerator}/{denominator}
        </div>
      </div>
    </div>
  );
};