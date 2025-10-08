import React from 'react';
import { JobStatus } from '../../types';

interface StatusBadgeProps {
  status: JobStatus;
  onClick?: () => void;
  clickable?: boolean;
}

const statusConfig: Record<JobStatus, { color: string; label: string }> = {
  drafted: { color: 'bg-white text-gray-900 dark:bg-white dark:text-gray-900 border border-gray-300 dark:border-gray-300', label: 'Drafted' },
  applied: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700', label: 'Applied' },
  responded: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-700', label: 'Responded' },
  meeting: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700', label: 'Meeting' },
  won: { color: 'bg-upwork-100 text-upwork-800 dark:bg-upwork-900 dark:text-upwork-200 border border-upwork-200 dark:border-upwork-700', label: 'Won' },
  lost: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-700', label: 'Lost' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick, clickable = false }) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm
        ${config.color}
        ${clickable ? 'cursor-pointer hover:opacity-80 transition-all duration-200 transform hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      {config.label}
    </span>
  );
};