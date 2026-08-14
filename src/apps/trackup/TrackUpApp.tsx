import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { AppBar } from '../../components/Layout/AppBar';
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
    <div className="flex flex-col h-screen app-canvas accent-upwork">
      {/* Platform bar */}
      <AppBar title="TrackUp" icon={Send} gradient="from-upwork-400 to-upwork-600" onExit={onExit} />

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
