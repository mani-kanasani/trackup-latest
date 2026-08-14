import React, { useEffect, useState } from 'react';
import { Flame, ArrowRight, LogOut, Settings as SettingsIcon, Moon, Sun, BarChart3 } from 'lucide-react';
import { APPS, AppId } from '../apps/registry';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

interface HomeProps {
  onOpenApp: (id: AppId) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenApp, onOpenSettings, onOpenAnalytics }) => {
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
    <div className="min-h-screen app-canvas accent-ember">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="glow-accent w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Ember</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl text-gray-500 hover:text-ember-600 dark:hover:text-ember-400 hover:bg-ember-500/10 transition-all duration-200 active:scale-95" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={onOpenAnalytics} className="p-2.5 rounded-xl text-gray-500 hover:text-ember-600 dark:hover:text-ember-400 hover:bg-ember-500/10 transition-all duration-200 active:scale-95" aria-label="Your numbers" title="Your numbers">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button onClick={onOpenSettings} className="p-2.5 rounded-xl text-gray-500 hover:text-ember-600 dark:hover:text-ember-400 hover:bg-ember-500/10 transition-all duration-200 active:scale-95" aria-label="Settings">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={logout} className="p-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-500/10 transition-all duration-200 active:scale-95" aria-label="Log out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero + cards */}
      <main className="max-w-5xl mx-auto px-6 py-12 animate-fade-in">
        <div className="mb-10 animate-rise">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white">
            Welcome back{user?.name ? <>, <span className="text-gradient">{user.name}</span></> : ''}.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-3 max-w-xl">
            Three channels, one method. Pick where today's work is going.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPS.map((app, i) => {
            const Icon = app.icon;
            const value = statValue(app.id);
            return (
              <button
                key={app.id}
                onClick={() => onOpenApp(app.id)}
                /* accent-* scopes the glow to this channel's colour, so hovering
                   LinkedIn blooms blue and cold email blooms orange. */
                className={`group text-left card-interactive p-7 animate-rise accent-${app.accent}`}
                /* Inline rather than a stagger-N class: Tailwind tree-shakes
                   @layer utilities against literal class names, and a template
                   string is invisible to it, so the delays would be purged. */
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                      {value === null ? <span className="inline-block w-10 h-8 rounded-lg shimmer align-middle" /> : value}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">{app.statLabel}</div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5">{app.name}</h2>
                <p className="text-sm font-semibold text-gradient">{app.tagline}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{app.description}</p>

                <div className="flex items-center mt-5 text-sm font-semibold text-gray-900 dark:text-white transition-colors">
                  <span className="group-hover:text-gradient">Open {app.name}</span>
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1.5" />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
