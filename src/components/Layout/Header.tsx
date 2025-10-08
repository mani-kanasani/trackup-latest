import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  currentPage: string;
}

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  apply: 'Apply',
  track: 'Track',
  settings: 'Settings'
};

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-12 lg:ml-0 animate-fade-in">
          {pageNames[currentPage] || 'TrackUp'}
        </h1>
        
        <div className="flex items-center space-x-4">
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            Hello, {user?.name}
          </span>
          <button
            onClick={logout}
            className="flex items-center px-4 py-2 text-sm font-semibold text-upwork-600 dark:text-upwork-400 hover:bg-upwork-50 dark:hover:bg-upwork-900/20 rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};