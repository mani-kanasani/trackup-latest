import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { DateFilter as DateFilterType, DateRange } from '../../types';

interface DateFilterProps {
  currentFilter: DateFilterType;
  onFilterChange: (filter: DateFilterType, customRange?: DateRange) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({ currentFilter, onFilterChange }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      const range: DateRange = {
        start: new Date(customStart),
        end: new Date(customEnd)
      };
      onFilterChange('custom', range);
      setShowDatePicker(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-3">
        <div className="flex bg-white dark:bg-gray-700 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-600">
          {(['today', 'week', 'month'] as DateFilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`
                px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 capitalize transform hover:scale-105
                ${currentFilter === filter
                  ? 'bg-upwork-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-upwork-600 dark:hover:text-white hover:bg-upwork-50 dark:hover:bg-gray-600'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`
            p-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-sm
            ${currentFilter === 'custom'
              ? 'bg-upwork-500 text-white shadow-lg'
              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-upwork-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            }
          `}
        >
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {showDatePicker && (
        <div className="absolute right-0 top-16 z-10 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-6 min-w-72 animate-fade-in">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-modern"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCustomRangeApply}
                disabled={!customStart || !customEnd}
                className="btn-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
              >
                Apply
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};