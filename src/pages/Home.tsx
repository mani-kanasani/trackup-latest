import React, { useEffect, useState } from 'react';
import { ArrowRight, LogOut, Settings as SettingsIcon, Moon, Sun, BarChart3 } from 'lucide-react';
import { EmberMark } from '../components/UI/EmberMark';
import { DailyReceipt } from '../components/Receipt/DailyReceipt';
import { UnmarkedDrafts } from '../components/Activity/UnmarkedDrafts';
import { TodayQueue } from '../components/Queue/TodayQueue';
import { CompletenessMeter } from '../components/Setup/CompletenessMeter';
import { useOutreachRows } from '../lib/activity/useOutreachRows';
import { APPS, AppId } from '../apps/registry';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

interface HomeProps {
  onOpenApp: (id: AppId, focusId?: string, stepKey?: string) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenApp, onOpenSettings, onOpenAnalytics }) => {
  const { user, logout } = useAuth();
  const { materials } = useData();
  const { theme, toggleTheme } = useTheme();
  // One read of leads and prospects, shared by the two cards below that both
  // count and change them.
  const rows = useOutreachRows();
  /**
   * One count per app, keyed by app id.
   *
   * This used to be a single `leadCount` that both LinkedIn and cold email fell
   * through to, so the cold email card displayed the LinkedIn lead count: adding
   * a lead made it read 1, and opening it showed nothing. Keying the counts by
   * app means a fourth channel cannot inherit the same bug by omission.
   */
  const [counts, setCounts] = useState<Partial<Record<AppId, number>>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const countOf = async (table: string) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        // A failed read stays undefined rather than becoming 0: a shimmer is
        // honest about not knowing, a zero is a claim that they have nothing.
        return error ? undefined : count ?? 0;
      };
      const [leads, prospects] = await Promise.all([countOf('leads'), countOf('prospects')]);
      if (active) setCounts({ linkedin: leads, coldemail: prospects });
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const statValue = (id: AppId): number | null => {
    if (id === 'trackup') return materials.length;
    return counts[id] ?? null;
  };

  return (
    <div className="min-h-screen app-canvas accent-ember">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <EmberMark size="sm" glow className="!w-9 !h-9 drop-shadow-md" />
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

        {/* The order is the argument. The queue is what today is, so it goes
            first. The drafts prompt only appears when there is something
            unanswered, and it comes before the receipt because an unmarked
            draft from yesterday is a missing number in it. Reporting the day
            is itself a daily act, so it sits above the channels rather than
            behind one. */}
        <div className="mb-8 space-y-6">
          <TodayQueue rows={rows} onOpen={onOpenApp} />
          {/* Silent when the setup is complete. A green tick every morning is
              one more thing to read on the screen meant for doing the work. */}
          <CompletenessMeter compact onOpenSettings={onOpenSettings} />
          <UnmarkedDrafts rows={rows} />
          <DailyReceipt rows={rows} />
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
