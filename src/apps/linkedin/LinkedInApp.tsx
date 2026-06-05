import React from 'react';
import { ArrowLeft, Linkedin, Hammer } from 'lucide-react';

// Placeholder shell — the full LinkedIn DM Generator (leads, campaigns, AI
// connection requests + DM sequences) is ported in the next build step.
export const LinkedInApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-linkedin-50 to-white dark:from-gray-900 dark:to-gray-950">
      <header className="border-b border-linkedin-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onExit} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-linkedin-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> All apps
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-linkedin-500 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">LinkedIn DM Generator</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-linkedin-50 dark:bg-linkedin-900/20 flex items-center justify-center mx-auto mb-6">
          <Hammer className="w-8 h-8 text-linkedin-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wiring this up</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-3">
          The LinkedIn DM Generator — lead management, AI connection requests and DM sequences — is being
          ported onto Ember's shared backend. It'll appear here shortly.
        </p>
      </main>
    </div>
  );
};
