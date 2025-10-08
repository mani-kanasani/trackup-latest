import React from 'react';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, prefix = '', className = '' }) => {
  return (
    <div className={`card-modern p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-4xl font-bold text-gray-900 dark:text-white animate-pulse-slow">
        {prefix}{typeof value === 'number' && prefix === '$' ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value}
      </p>
      <div className="mt-2 h-1 bg-gradient-to-r from-upwork-500 to-upwork-300 rounded-full"></div>
    </div>
  );
};