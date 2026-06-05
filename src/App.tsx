import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AuthForm } from './components/Auth/AuthForm';
import { SupabaseSetup } from './components/Setup/SupabaseSetup';
import { isSupabaseConfigured } from './lib/supabaseConfig';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { TrackUpApp } from './apps/trackup/TrackUpApp';
import { LinkedInApp } from './apps/linkedin/LinkedInApp';
import { AppId } from './apps/registry';

// Shared platform settings (AI provider, database connection, theme).
const PlatformSettings: React.FC<{ onExit: () => void }> = ({ onExit }) => (
  <div className="min-h-screen bg-gradient-to-br from-ember-50 to-orange-100 dark:from-gray-900 dark:to-gray-950">
    <div className="h-9 bg-ember-500 text-white flex items-center px-4">
      <button onClick={onExit} className="flex items-center text-sm font-semibold hover:opacity-90">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> All apps
      </button>
    </div>
    <Settings />
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (showSettings) {
    return <PlatformSettings onExit={() => setShowSettings(false)} />;
  }
  if (activeApp === 'trackup') {
    return <TrackUpApp onExit={() => setActiveApp(null)} />;
  }
  if (activeApp === 'linkedin') {
    return <LinkedInApp onExit={() => setActiveApp(null)} />;
  }
  return <Home onOpenApp={setActiveApp} onOpenSettings={() => setShowSettings(true)} />;
};

function App() {
  // Before a Supabase project is connected, show the setup screen instead of
  // mounting the auth/data providers (which need a live client).
  if (!isSupabaseConfigured()) {
    return (
      <ThemeProvider>
        <SupabaseSetup />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
