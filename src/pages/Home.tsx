import React, { useEffect, useState } from 'react';
import { Flame, ArrowRight, LogOut, Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { APPS, AppId } from '../apps/registry';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

interface HomeProps {
  onOpenApp: (id: AppId) => void;
  onOpenSettings: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenApp, onOpenSettings }) => {
  const { user, logout } = useAuth();
  const { materials } = useData();
  const { theme, toggleTheme } = useTheme();
  const [leadCount, setLeadCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (active) setLeadCount(error ? 0 : count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const statValue = (id: AppId): number | null => {
    if (id === 'trackup') return materials.length;
    return leadCount;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ember-50 via-orange-50 to-ember-100 dark:from-gray-900 dark:to-gray-950">
      {/* Top bar */}
      <header className="border-b border-ember-200/60 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-sm">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Ember</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:text-ember-600 hover:bg-ember-50 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={onOpenSettings} className="p-2 rounded-lg text-gray-500 hover:text-ember-600 hover:bg-ember-50 dark:hover:bg-gray-800 transition-colors" aria-label="Settings">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={logout} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 transition-colors" aria-label="Log out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero + cards */}
      <main className="max-w-5xl mx-auto px-6 py-12 animate-fade-in">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Welcome back{user?.name ? `, ${user.name}` : ''}.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            Your AI outreach command center. Pick an app to get started.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {APPS.map((app) => {
            const Icon = app.icon;
            const value = statValue(app.id);
            return (
              <button
                key={app.id}
                onClick={() => onOpenApp(app.id)}
                className="group text-left card-modern p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                      {value === null ? '—' : value}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">{app.statLabel}</div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5">{app.name}</h2>
                <p className="text-sm font-medium text-ember-600 dark:text-ember-400">{app.tagline}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{app.description}</p>

                <div className="flex items-center mt-5 text-sm font-semibold text-gray-900 dark:text-white group-hover:text-ember-600 dark:group-hover:text-ember-400 transition-colors">
                  Open {app.name}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
