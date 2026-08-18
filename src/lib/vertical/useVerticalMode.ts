import { useState, useEffect } from 'react';
import { DEFAULT_MODE, type VerticalMode } from './types';

/**
 * The vertical / generic choice for one channel, remembered per device.
 *
 * Per channel, not global: the whole point of the defaults is that LinkedIn and
 * cold email want the vertical and Upwork usually does not, so one shared
 * setting would fight the person on every second generation.
 *
 * localStorage rather than the database because it is a working preference, not
 * part of the brief, and a generation should never wait on a round trip to find
 * out which mode it is in.
 */
export const useVerticalMode = (channel: string) => {
  const key = `ember.verticalMode.${channel}`;
  const [mode, setMode] = useState<VerticalMode>(
    () => DEFAULT_MODE[channel] ?? 'generic',
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'vertical' || saved === 'generic') setMode(saved);
    } catch {
      // Private browsing, or storage disabled. The channel default stands.
    }
  }, [key]);

  const choose = (m: VerticalMode) => {
    setMode(m);
    try {
      localStorage.setItem(key, m);
    } catch {
      // Not fatal: the choice still applies to this session.
    }
  };

  return { mode, setMode: choose };
};
