import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from '../../components/Layout/Sidebar';
import { Header } from '../../components/Layout/Header';
import { Dashboard } from '../../pages/Dashboard';
import { Apply } from '../../pages/Apply';
import { Track } from '../../pages/Track';
import { Settings } from '../../pages/Settings';

export const TrackUpApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'apply':
        return <Apply />;
      case 'track':
        return <Track />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Platform bar */}
      <div className="h-9 flex-shrink-0 bg-ember-500 text-white flex items-center px-4">
        <button onClick={onExit} className="flex items-center text-sm font-semibold hover:opacity-90 transition-opacity">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> All apps
        </button>
        <span className="mx-2 opacity-50">/</span>
        <span className="text-sm font-medium opacity-90">TrackUp</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentPage={currentPage} />
          <main className="flex-1 overflow-y-auto animate-fade-in">{renderPage()}</main>
        </div>
      </div>
    </div>
  );
};
