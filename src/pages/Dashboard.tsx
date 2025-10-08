import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { KPICard } from '../components/UI/KPICard';
import { CircularProgress } from '../components/UI/CircularProgress';
import { DateFilter } from '../components/UI/DateFilter';
import { StatusBadge } from '../components/UI/StatusBadge';
import { useData } from '../contexts/DataContext';
import { DateFilter as DateFilterType, DateRange } from '../types';
import { AnimatedLogo } from '../components/UI/AnimatedLogo';

export const Dashboard: React.FC = () => {
  const { materials, getKPIData, getDateRange } = useData();
  const [currentFilter, setCurrentFilter] = useState<DateFilterType>('today');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const dateRange = useMemo(() => 
    getDateRange(currentFilter, customRange), 
    [currentFilter, customRange, getDateRange]
  );

  const kpiData = useMemo(() => 
    getKPIData(dateRange), 
    [dateRange, getKPIData]
  );

  const handleFilterChange = (filter: DateFilterType, range?: DateRange) => {
    setCurrentFilter(filter);
    if (range) {
      setCustomRange(range);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = {
      drafted: 0,
      applied: 0,
      responded: 0,
      meeting: 0,
      won: 0,
      lost: 0
    };
    materials.forEach(m => {
      counts[m.status]++;
    });
    return counts;
  }, [materials]);

  const recentItems = useMemo(() => 
    materials
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
      .slice(0, 5),
    [materials]
  );

  const getOutcomePercentage = (numerator: number, denominator: number) => {
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Top Row - KPI Cards with Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 flex-1">
          <KPICard title="Proposals Generated" value={kpiData.proposalsGenerated} />
          <KPICard title="Applied" value={kpiData.applied} />
          <KPICard title="Responses" value={kpiData.responses} />
          <KPICard title="Meetings Scheduled" value={kpiData.meetingsScheduled} />
          <KPICard 
            title="Revenue Generated" 
            value={kpiData.revenueGenerated} 
            prefix="$" 
            className="col-span-2 lg:col-span-1"
          />
          <KPICard 
            title="Cash Collected" 
            value={kpiData.cashCollected} 
            prefix="$" 
            className="col-span-2 lg:col-span-1"
          />
        </div>
        
        <DateFilter 
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Bottom Split */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left - Pipeline Overview */}
        <div className="card-modern p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-upwork-500/10 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
              <AnimatedLogo size="sm" />
            </div>
            Pipeline Overview
          </h2>
          
          {/* Status Chips */}
          <div className="flex flex-wrap gap-3 mb-8">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center space-x-2 animate-fade-in">
                <StatusBadge status={status as any} />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  ({count})
                </span>
              </div>
            ))}
          </div>

          {/* Recent Items */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Recent Items
            </h3>
            {recentItems.length === 0 ? (
              <p className="text-base text-gray-500 dark:text-gray-400 py-8 text-center bg-gray-50 dark:bg-gray-700 rounded-xl">
                No materials yet. Start by creating your first proposal in the Apply section.
              </p>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Updated {formatRelativeTime(item.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Outcome Percentages */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            Outcome Metrics
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <CircularProgress
              title="Apply Rate"
              percentage={getOutcomePercentage(kpiData.applied, kpiData.proposalsGenerated)}
              numerator={kpiData.applied}
              denominator={kpiData.proposalsGenerated}
            />
            <CircularProgress
              title="Response Rate"
              percentage={getOutcomePercentage(kpiData.responses, kpiData.applied)}
              numerator={kpiData.responses}
              denominator={kpiData.applied}
            />
            <CircularProgress
              title="Meeting Rate"
              percentage={getOutcomePercentage(kpiData.meetingsScheduled, kpiData.responses)}
              numerator={kpiData.meetingsScheduled}
              denominator={kpiData.responses}
            />
            <CircularProgress
              title="Win Rate"
              percentage={getOutcomePercentage(statusCounts.won, kpiData.applied)}
              numerator={statusCounts.won}
              denominator={kpiData.applied}
            />
          </div>
          
          {/* Advanced Data Visualizers */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Job Level Breakdown */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                </div>
                Job Level Distribution
              </h3>
              <div className="space-y-3">
                {(['entry', 'intermediate', 'expert'] as const).map((level) => {
                  const count = materials.filter(m => m.job_level === level).length;
                  const percentage = materials.length > 0 ? Math.round((count / materials.length) * 100) : 0;
                  return (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          level === 'entry' ? 'bg-blue-500' : 
                          level === 'intermediate' ? 'bg-upwork-500' : 'bg-purple-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {level}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              level === 'entry' ? 'bg-blue-500' : 
                              level === 'intermediate' ? 'bg-upwork-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white w-8">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compensation Type Breakdown */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                </div>
                Compensation Types
              </h3>
              <div className="space-y-3">
                {(['hourly', 'fixed_price'] as const).map((type) => {
                  const count = materials.filter(m => m.compensation_type === type).length;
                  const percentage = materials.length > 0 ? Math.round((count / materials.length) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          type === 'hourly' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {type === 'hourly' ? 'Hourly' : 'Fixed Price'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              type === 'hourly' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white w-8">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};