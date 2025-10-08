import React from 'react';
import { BarChart3, FileText, CheckSquare, Settings, Menu, X } from 'lucide-react';
import { AnimatedLogo } from '../UI/AnimatedLogo';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', id: 'dashboard', icon: BarChart3 },
  { name: 'Apply', id: 'apply', icon: FileText },
  { name: 'Track', id: 'track', icon: CheckSquare },
  { name: 'Settings', id: 'settings', icon: Settings }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isOpen, onToggle }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-gray-800 text-white"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 z-40 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="bg-upwork-500/10 rounded-xl p-2 backdrop-blur-sm">
                <AnimatedLogo size="md" />
              </div>
              <h1 className="text-2xl font-bold text-white">TrackUp</h1>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    onToggle();
                  }}
                  className={`
                    w-full flex items-center px-4 py-4 text-sm font-semibold rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 group
                    ${isActive 
                      ? 'bg-upwork-500 text-white shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-md'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${isActive ? 'animate-bounce-subtle' : 'group-hover:scale-110'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};