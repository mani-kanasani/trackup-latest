import React from 'react';
import { Moon, Sun, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedLogo } from '../components/UI/AnimatedLogo';

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Dark Mode Toggle */}
      <div className="card-modern p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center mr-3">
                {theme === 'light' ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
              </div>
              Dark Mode
            </h3>
            <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
              Toggle between light and dark themes
            </p>
          </div>
          
          <button
            onClick={toggleTheme}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-upwork-500 focus:ring-offset-2 transform hover:scale-105
              ${theme === 'dark' ? 'bg-upwork-500 shadow-lg' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md
                ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
            <span className="sr-only">Toggle dark mode</span>
          </button>
        </div>
        
        <div className="flex items-center mt-6 text-base text-gray-500 dark:text-gray-400 font-medium">
          {theme === 'light' ? (
            <>
              <Sun className="w-5 h-5 mr-3" />
              Light mode active
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 mr-3" />
              Dark mode active
            </>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="card-modern p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-upwork-500/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <AnimatedLogo size="sm" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            How It Works
          </h3>
        </div>
        
        <div className="space-y-6 text-base text-gray-600 dark:text-gray-400">
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              1
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Paste Job Details</p>
              <p className="leading-relaxed">Copy the job title and description from Upwork and paste them into the Apply section.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              2
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Generate Proposal</p>
              <p className="leading-relaxed">Click "Generate Proposal" to create your cover letter, diagram code, proposal document, and video script.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              3
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Save Materials</p>
              <p className="leading-relaxed">Review and edit your materials, then save them as a complete record for tracking.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              4
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Track Progress</p>
              <p className="leading-relaxed">Update the status of your proposals in the Track section as you progress through the application process.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              5
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Monitor Success</p>
              <p className="leading-relaxed">View your performance metrics and success rates on the Dashboard to improve your proposal strategy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};