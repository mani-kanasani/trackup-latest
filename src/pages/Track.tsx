import React, { useState, useMemo } from 'react';
import { Search, X, ExternalLink, FileText, Video, BarChart3, Copy, Briefcase } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { StatusBadge } from '../components/UI/StatusBadge';
import { JobMaterial, JobStatus } from '../types';

export const Track: React.FC = () => {
  const { materials, updateMaterialStatus } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [selectedMaterial, setSelectedMaterial] = useState<JobMaterial | null>(null);

  const filteredAndSortedMaterials = useMemo(() => {
    let filtered = materials;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const aTime = a.updated_at.getTime();
      const bTime = b.updated_at.getTime();
      return sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [materials, searchQuery, statusFilter, sortOrder]);

  const statusCounts = useMemo(() => {
    const counts: Record<JobStatus | 'all', number> = {
      all: materials.length,
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

  const handleStatusUpdate = (materialId: string, newStatus: JobStatus) => {
    updateMaterialStatus(materialId, newStatus);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Top Controls */}
        <div className="space-y-6">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap gap-3">
            {(Object.keys(statusCounts) as Array<JobStatus | 'all'>).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm
                  ${statusFilter === status
                    ? 'bg-upwork-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-upwork-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }
                `}
              >
                {status === 'all' ? (
                  <span>All</span>
                ) : (
                  <StatusBadge status={status} />
                )}
                <span className="font-bold">({statusCounts[status]})</span>
              </button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-upwork-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-upwork-500 focus:border-upwork-500 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-upwork-600 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest')}
              className="px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-upwork-500 focus:border-upwork-500 transition-all duration-200 shadow-sm font-medium"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Materials List */}
        <div className="card-modern overflow-hidden">
          {filteredAndSortedMaterials.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {materials.length === 0 
                  ? 'No materials yet. Create your first proposal in the Apply section.'
                  : 'No materials match your current filters.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-upwork-50 to-upwork-100 dark:from-gray-700 dark:to-gray-600 border-b border-upwork-200 dark:border-gray-600">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Job Level
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Compensation
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Proposed Amount
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Actual Amount
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-upwork-700 dark:text-gray-300 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredAndSortedMaterials.map((material) => (
                    <tr
                      key={material.id}
                      onClick={() => setSelectedMaterial(material)}
                      className="hover:bg-upwork-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-300 transform hover:scale-[1.01]"
                    >
                      <td className="px-8 py-6">
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {material.title}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            material.job_level === 'entry' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' 
                              : material.job_level === 'intermediate'
                              ? 'bg-upwork-100 text-upwork-800 dark:bg-upwork-900/50 dark:text-upwork-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                          }`}>
                            {material.job_level ? material.job_level.charAt(0).toUpperCase() + material.job_level.slice(1) : 'Not specified'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            material.compensation_type === 'hourly'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          }`}>
                            {material.compensation_type === 'hourly' ? 'Hourly' : 'Fixed Price'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {material.proposed_amount ? `$${material.proposed_amount.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {material.actual_amount ? `$${material.actual_amount.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={material.status} />
                          <select
                            value={material.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(material.id, e.target.value as JobStatus);
                            }}
                            className="text-xs rounded-lg px-2 py-1 font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-upwork-500 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="drafted">Drafted</option>
                            <option value="applied">Applied</option>
                            <option value="responded">Responded</option>
                            <option value="meeting">Meeting</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-base text-gray-500 dark:text-gray-400 font-medium">
                        {formatDate(material.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Drawer */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={() => setSelectedMaterial(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-fade-in">
            <div className="p-8 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-upwork-50 to-upwork-100 dark:from-gray-700 dark:to-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Material Details
                </h2>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="p-3 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 transform hover:scale-110"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {selectedMaterial.title}
                </h3>
                <div className="mt-3">
                  <StatusBadge status={selectedMaterial.status} />
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-upwork-600 dark:text-upwork-400" />
                </div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Job Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600">
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Job Level</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                    {selectedMaterial.job_level || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Compensation</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {selectedMaterial.compensation_type === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Proposed Amount</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {selectedMaterial.proposed_amount ? `$${selectedMaterial.proposed_amount.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Actual Amount</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {selectedMaterial.actual_amount ? `$${selectedMaterial.actual_amount.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Cover Letter */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">Cover Letter</h4>
                </div>
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
                  <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {selectedMaterial.cover_letter}
                  </p>
                </div>
              </div>

              {/* Proposal Document */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">Proposal Document</h4>
                </div>
                <a
                  href={selectedMaterial.proposal_document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-6 py-4 border-2 border-dashed border-upwork-300 dark:border-upwork-600 rounded-xl hover:border-upwork-500 dark:hover:border-upwork-400 transition-all duration-300 text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50/50 dark:bg-upwork-900/10 hover:bg-upwork-100 dark:hover:bg-upwork-900/20 transform hover:scale-105 font-semibold"
                >
                  <ExternalLink className="w-5 h-5 mr-3" />
                  Open Document
                </a>
              </div>

              {/* Diagram Code */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">Diagram Code</h4>
                </div>
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
                  <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedMaterial.mermaid_code}
                  </pre>
                </div>
              </div>

              {/* Video Script */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                      <Video className="w-4 h-4 text-upwork-600 dark:text-upwork-400" />
                    </div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">Video Script</h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedMaterial.video_script)}
                    className="flex items-center px-3 py-2 text-sm text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-all duration-200 font-semibold"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </button>
                </div>
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
                  <pre className="text-base text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {selectedMaterial.video_script}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};