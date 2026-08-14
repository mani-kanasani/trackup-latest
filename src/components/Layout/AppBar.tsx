// The bar across the top of every screen inside an app.
//
// Three screens used to carry a 36px solid orange strip holding nothing but a
// back link, while two others had a proper header with the app's mark, its name
// and its actions. The strip was a leftover, and it looked like one — a band of
// brand colour with no content, sitting above the thing you actually came for.
//
// One component now, so a new screen cannot reinvent it and drift again. The
// accent comes from the surrounding `accent-*` scope, so this is green inside
// TrackUp, blue inside LinkedIn and orange on the platform screens without
// anything being passed in.

import React from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

export const AppBar: React.FC<{
  title: string;
  /** The app's own icon. Ignored when `mark` is supplied. */
  icon?: LucideIcon;
  /** Tailwind gradient classes for the chip, e.g. `from-upwork-400 to-upwork-600`. */
  gradient?: string;
  /**
   * An explicit mark, for platform screens.
   *
   * Settings and the dashboard belong to Ember rather than to a channel, so they
   * carry the Ember flame. An app carries its own icon, which is what tells you
   * at a glance which of the three you are inside.
   */
  mark?: React.ReactNode;
  onExit: () => void;
  /** Buttons for the right-hand side. */
  children?: React.ReactNode;
}> = ({ title, icon: Icon, gradient, mark, onExit, children }) => (
  <header className="sticky top-0 z-30 flex-shrink-0 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onExit}
          className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> All apps
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* The mark carries the colour, so the bar itself does not have to. */}
          {mark ?? (
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              {Icon && <Icon className="w-4 h-4 text-white" />}
            </div>
          )}
          <span className="font-bold text-gray-900 dark:text-white truncate">{title}</span>
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  </header>
);
