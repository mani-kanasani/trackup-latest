// The Ember mark.
//
// The same flame as the favicon, drawn from the same coordinates, so the tab,
// the sign-in page and every header show one identity rather than three
// near-misses. Previously the sign-in page and the launcher used Lucide's
// outline flame while the tab showed Vite's default logo and Settings showed a
// green mark left over from when this was an Upwork tool.
//
// Two details carry it: the tip leans rather than pointing straight up, which is
// the difference between a flame and a water droplet, and the hot core is what
// makes fire read as fire at small sizes where the silhouette alone is too
// coarse to be recognisable.

import React, { useId } from 'react';

const SIZES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
} as const;

export const EmberMark: React.FC<{
  size?: keyof typeof SIZES;
  className?: string;
  /** A soft bloom behind the mark. For the sign-in page, where it is the hero. */
  glow?: boolean;
  /** The flame slowly breathes. Respects prefers-reduced-motion via index.css. */
  animate?: boolean;
}> = ({ size = 'md', className = '', glow = false, animate = false }) => {
  // Unique per instance. Several marks render at once, and duplicate SVG ids in
  // one document are invalid: the first definition wins for every reference, so
  // any future variant would silently inherit the wrong gradient.
  const gradientId = useId();
  return (
  <div className={`${SIZES[size]} ${className} relative ${glow ? 'glow-accent' : ''}`}>
    <svg viewBox="0 0 64 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />

      {/* Outer flame: a belly at (32,41) tapering to a leaning tip. */}
      <path
        fill="#ffffff"
        d="M40.3 8.5
           C 36.5 15.5 34.5 19.5 39.5 25.5
           C 44.5 31.5 51 34.5 51 41
           A 19 19 0 0 1 13 41
           C 13 33 20 28.5 25.5 21
           C 30 14.5 33.5 10.5 40.3 8.5 Z"
      />

      {/* The hot core. */}
      <path
        fill="#fde047"
        className={animate ? 'ember-core' : undefined}
        d="M35.6 29.5
           C 33.5 34 32.5 36 35 39
           C 37.6 42 41 43.6 41 47
           A 9.8 9.8 0 0 1 21.4 47
           C 21.4 42.8 25 40.4 27.9 36.5
           C 30.2 33.1 32 31 35.6 29.5 Z"
      />
    </svg>
  </div>

  );
};
