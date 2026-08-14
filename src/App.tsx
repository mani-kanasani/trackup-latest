import React, { useState } from 'react';

import { EmberMark } from './components/UI/EmberMark';
import { AppBar } from './components/Layout/AppBar';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AuthForm } from './components/Auth/AuthForm';
import { SupabaseSetup } from './components/Setup/SupabaseSetup';
import { isSupabaseConfigured } from './lib/supabaseConfig';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { TrackUpApp } from './apps/trackup/TrackUpApp';
import { LinkedInApp } from './apps/linkedin/LinkedInApp';
import { ColdEmailApp } from './apps/coldemail/ColdEmailApp';
import { AppId } from './apps/registry';

// Shared platform settings (AI provider, database connection, theme).
const PlatformSettings: React.FC<{ onExit: () => void }> = ({ onExit }) => (
  <div className="min-h-screen app-canvas accent-ember">
    <AppBar title="Settings" mark={<EmberMark size="sm" className="!w-8 !h-8" />} onExit={onExit} />
    <Settings />
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

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
  if (showAnalytics) {
    return <Analytics onExit={() => setShowAnalytics(false)} />;
  }
  if (activeApp === 'trackup') {
    return <TrackUpApp onExit={() => setActiveApp(null)} />;
  }
  if (activeApp === 'linkedin') {
    return <LinkedInApp onExit={() => setActiveApp(null)} />;
  }

  if (activeApp === 'coldemail') {
    return <ColdEmailApp onExit={() => setActiveApp(null)} />;
  }
  return (
    <Home
      onOpenApp={setActiveApp}
      onOpenSettings={() => setShowSettings(true)}
      onOpenAnalytics={() => setShowAnalytics(true)}
    />
  );
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
