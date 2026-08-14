// The dashboard.
//
// One rule governs everything on this screen: it reports what WENT OUT, not what
// was produced. A tool that counts its own generations flatters the person using
// it, and the number that actually predicts whether they get a client is how many
// messages left the building.
//
// The second rule is that it withholds rates it cannot support. A reply rate over
// four sends is not a reply rate, and a dashboard that prints one teaches people
// to make decisions on noise.

import React, { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, CalendarCheck, Trophy, AlertTriangle, BarChart3 } from 'lucide-react';
import { AppBar } from '../components/Layout/AppBar';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import type { Lead } from '../apps/linkedin/types';
import type { Prospect } from '../apps/coldemail/types';
import {
  linkedInStats, coldEmailStats, upworkStats, totalStats,
  proofPerformance, activityByDay, sentInLast, safeRate, MIN_SAMPLE,
  type ChannelStats,
} from '../lib/analytics';

const pct = (v: number | null): string => (v == null ? '—' : `${Math.round(v * 100)}%`);

const money = (v: number): string =>
  v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const Kpi: React.FC<{ label: string; value: string; sub?: string; icon: React.ElementType }> = ({
  label, value, sub, icon: Icon,
}) => (
  <div className="card-modern p-5">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-ember-500" />
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    </div>
    <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
    {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{sub}</p>}
  </div>
);

export const Analytics: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  const { materials } = useData();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [l, p] = await Promise.all([
          supabase.from('leads').select('*').eq('user_id', user.id),
          supabase.from('prospects').select('*').eq('user_id', user.id),
        ]);
        if (!active) return;
        // A failed read must not render as zero activity. Someone who has been
        // working for a month should never be shown an empty dashboard because a
        // query failed — that is demoralising and false in the same breath.
        const failed = [l.error, p.error].filter(Boolean);
        setLoadError(failed.length ? failed.map((e) => e!.message).join('; ') : null);
        setLeads((l.data as Lead[]) ?? []);
        setProspects((p.data as Prospect[]) ?? []);
      } catch (err) {
        // A rejected query, rather than one that resolves with an error, used to
        // skip the line below and leave this page on "Loading…" forever — which
        // is the worst of the three outcomes, because it looks like the app is
        // still working on it.
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not reach the database.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const now = useMemo(() => new Date(), []);
  const channels: ChannelStats[] = useMemo(
    () => [upworkStats(materials), linkedInStats(leads), coldEmailStats(prospects)],
    [materials, leads, prospects],
  );
  const all = useMemo(() => totalStats(channels), [channels]);
  const outreachRows = useMemo(() => [...leads, ...prospects], [leads, prospects]);
  const last30 = useMemo(() => activityByDay(outreachRows, 30, now), [outreachRows, now]);
  const sent7 = useMemo(() => sentInLast(outreachRows, 7, now), [outreachRows, now]);
  const sent30 = useMemo(() => sentInLast(outreachRows, 30, now), [outreachRows, now]);

  const proof = useMemo(
    () =>
      proofPerformance([
        ...leads.map((l) => ({
          generation_meta: l.generation_meta,
          replied: ['replied', 'meeting', 'won', 'lost'].includes(l.status),
        })),
        ...prospects.map((p) => ({
          generation_meta: p.generation_meta,
          replied: ['replied', 'meeting', 'won', 'lost'].includes(p.status),
        })),
      ]),
    [leads, prospects],
  );

  const peak = Math.max(1, ...last30.map((d) => d.sent));
  const nothingYet = all.messagesSent === 0;

  return (
    <div className="min-h-screen app-canvas accent-ember">
      <AppBar title="Your numbers" icon={BarChart3} gradient="from-ember-400 to-ember-600" onExit={onExit} />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your numbers</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Everything here counts what actually went out, not what Ember wrote. A message only
            counts once you have marked it sent.
          </p>
        </div>

        {loadError && (
          <div className="text-sm bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            Some of your data could not be loaded, so these numbers are incomplete: {loadError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi
                icon={Send}
                label="Messages out"
                value={String(all.messagesSent)}
                sub={`${sent7} in the last 7 days · ${sent30} in 30`}
              />
              <Kpi
                icon={MessageSquare}
                label="Replies"
                value={String(all.replied)}
                sub={
                  safeRate(all.replied, all.contacted) != null
                    ? `${pct(safeRate(all.replied, all.contacted))} of people contacted`
                    : `Needs ${MIN_SAMPLE} contacted to rate`
                }
              />
              <Kpi
                icon={CalendarCheck}
                label="Meetings"
                value={String(all.meetings)}
                sub={
                  safeRate(all.meetings, all.replied) != null
                    ? `${pct(safeRate(all.meetings, all.replied))} of replies`
                    : 'From replies'
                }
              />
              <Kpi
                icon={Trophy}
                label="Won"
                value={String(all.won)}
                sub={all.revenue > 0 ? money(all.revenue) : `${all.closed} closed so far`}
              />
            </div>

            {/* The single most actionable number on the page. Written and never
                sent is where outreach quietly stops, and nothing else in the app
                would ever surface it. */}
            {all.generatedNotSent > 0 && (
              <div className="flex items-start text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold">{all.generatedNotSent} written and not sent.</span>{' '}
                  Copy sitting in the app does nothing. This is usually the whole gap between a week
                  that worked and a week that did not.
                </span>
              </div>
            )}

            {nothingYet && (
              <div className="card-modern p-6 text-center text-gray-500 dark:text-gray-400">
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Nothing sent yet</p>
                <p className="text-sm">
                  Generate a sequence, send the first message, and tick it as sent. These numbers
                  measure what leaves the building, so they stay at zero until something does.
                </p>
              </div>
            )}

            {/* Activity, 30 days. A plain bar row rather than a chart library:
                the shape is the whole message and consistency is the thing the
                doctrine is most insistent about. */}
            <div className="card-modern p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">Last 30 days</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {last30.filter((d) => d.sent > 0).length} active days
                </p>
              </div>
              <div className="flex items-end gap-1 h-24">
                {last30.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col justify-end group relative">
                    <div
                      className={`w-full rounded-sm ${d.sent > 0 ? 'bg-ember-400' : 'bg-gray-100 dark:bg-gray-800'}`}
                      style={{ height: `${Math.max(d.sent > 0 ? 8 : 3, (d.sent / peak) * 100)}%` }}
                      title={`${d.date}: ${d.sent} sent`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Sends per day. Gaps are days nothing went out.
              </p>
            </div>

            {/* Per channel. Kept side by side because the useful comparison is
                which one is worth more of the operator's week. */}
            <div className="card-modern p-5 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">By channel</h2>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-2 font-bold">Channel</th>
                    <th className="pb-2 font-bold">In pipeline</th>
                    <th className="pb-2 font-bold">Contacted</th>
                    <th className="pb-2 font-bold">Messages out</th>
                    <th className="pb-2 font-bold">Replies</th>
                    <th className="pb-2 font-bold">Reply rate</th>
                    <th className="pb-2 font-bold">Won</th>
                    <th className="pb-2 font-bold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {channels.map((c) => (
                    <tr key={c.channel}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{c.channel}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.total}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.contacted}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.messagesSent}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.replied}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {safeRate(c.replied, c.contacted) != null
                          ? pct(safeRate(c.replied, c.contacted))
                          : <span title={`Needs ${MIN_SAMPLE} contacted before a rate means anything`}>—</span>}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{c.won}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {c.revenue > 0 ? money(c.revenue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                A dash means too few to rate. Under {MIN_SAMPLE} contacted, a percentage is noise
                dressed as a measurement.
              </p>
            </div>

            {/* The payoff of recording provenance: which proof actually earns
                replies. Nothing else in the app can answer this, because the
                vault records what you own and not what each message carried. */}
            {proof.length > 0 && (
              <div className="card-modern p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Which proof is working</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Reply rate by the case study the message cited.
                </p>
                <div className="space-y-2">
                  {proof.map((p) => (
                    <div key={p.caseStudyId} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.title}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {p.replied}/{p.used}
                        {p.replyRate != null
                          ? ` · ${pct(p.replyRate)}`
                          : ` · too few to rate`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
