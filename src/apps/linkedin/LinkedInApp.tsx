import React, { useState } from 'react';
import {
  ArrowLeft, Linkedin, Plus, Sparkles, Copy, Check, Trash2, Loader2, ExternalLink, X,
} from 'lucide-react';
import { useLeads } from './useLeads';
import { Lead, LeadStatus, OutreachResponse } from './types';
import { supabase } from '../../lib/supabase';
import { loadAIConfig } from '../../lib/aiConfig';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New', requested: 'Requested', connected: 'Connected', replied: 'Replied', meeting: 'Meeting',
};
const STATUS_ORDER: LeadStatus[] = ['new', 'requested', 'connected', 'replied', 'meeting'];

const copyText = async (text: string, onDone: () => void) => {
  try { await navigator.clipboard.writeText(text); onDone(); } catch { /* ignore */ }
};

export const LinkedInApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { leads, loading, addLead, updateLead, deleteLead } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-linkedin-50/50 to-white dark:from-gray-900 dark:to-gray-950">
      <header className="border-b border-linkedin-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-linkedin-600">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> All apps
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linkedin-500 flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">LinkedIn DM Generator</span>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700 shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add lead
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid lg:grid-cols-[340px_1fr] gap-6 overflow-hidden">
        {/* Leads list */}
        <div className="overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Leads ({leads.length})</h2>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400 p-4">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 card-modern p-6 text-center">
              No leads yet. Click <span className="font-semibold">Add lead</span> to start.
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === lead.id
                      ? 'border-linkedin-400 bg-linkedin-50 dark:bg-linkedin-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-linkedin-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{lead.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-linkedin-100 text-linkedin-700 dark:bg-linkedin-900/40 dark:text-linkedin-300">
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {[lead.job_title, lead.company_name].filter(Boolean).join(' · ') || lead.linkedin_url}
                  </p>
                  {lead.connection_request && (
                    <p className="text-[11px] text-linkedin-600 dark:text-linkedin-400 mt-1 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" /> Outreach generated
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="overflow-y-auto">
          {selected ? (
            <LeadDetail
              key={selected.id}
              lead={selected}
              onUpdate={updateLead}
              onDelete={async (id) => { await deleteLead(id); setSelectedId(null); }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-400 card-modern p-10">
              <div>
                <Linkedin className="w-10 h-10 mx-auto mb-3 text-linkedin-300" />
                <p>Select a lead to generate and manage their outreach.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={addLead} />}
    </div>
  );
};

// --- Lead detail + generation -----------------------------------------------

const LeadDetail: React.FC<{
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onDelete: (id: string) => void;
}> = ({ lead, onUpdate, onDelete }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const flash = (id: string) => { setCopied(id); setTimeout(() => setCopied(null), 1500); };

  const handleGenerate = async () => {
    const cfg = loadAIConfig();
    if (!cfg) {
      setError('Add your AI provider and key first (Settings, top-right on the Ember home screen).');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<OutreachResponse>('generate-outreach', {
        body: {
          lead: {
            name: lead.name, job_title: lead.job_title, company_name: lead.company_name,
            industry: lead.industry, linkedin_url: lead.linkedin_url,
            company_website: lead.company_website, potential_services: lead.potential_services,
          },
          provider: cfg.provider, model: cfg.model, apiKey: cfg.apiKey,
        },
      });
      if (fnError) {
        let message = fnError.message;
        const ctx = (fnError as { context?: Response }).context;
        if (ctx?.json) { const b = await ctx.json().catch(() => null); if (b?.error) message = b.error; }
        throw new Error(message);
      }
      if (!data) throw new Error('No response from the generator.');
      onUpdate(lead.id, { connection_request: data.connection_request, dm_2: data.dm_2, dm_3: data.dm_3 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outreach.');
    } finally {
      setGenerating(false);
    }
  };

  const Message: React.FC<{ id: string; title: string; value?: string | null; sentKey: 'connection_request_sent' | 'dm_2_sent' | 'dm_3_sent' }> = ({ id, title, value, sentKey }) => (
    <div className="card-modern p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <div className="flex items-center gap-3">
          <label className="flex items-center text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" className="mr-1.5 accent-linkedin-600" checked={lead[sentKey]} onChange={(e) => onUpdate(lead.id, { [sentKey]: e.target.checked } as Partial<Lead>)} />
            Sent
          </label>
          {value && (
            <button onClick={() => copyText(value, () => flash(id))} className="text-xs font-medium text-linkedin-600 hover:text-linkedin-700 inline-flex items-center">
              {copied === id ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied === id ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      {value ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not generated yet.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Lead header */}
      <div className="card-modern p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {[lead.job_title, lead.company_name].filter(Boolean).join(' · ')}
            </p>
            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-linkedin-600 hover:text-linkedin-700 mt-2">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> LinkedIn profile
            </a>
          </div>
          <button onClick={() => onDelete(lead.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete lead">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select
            value={lead.status}
            onChange={(e) => onUpdate(lead.id, { status: e.target.value as LeadStatus })}
            className="input-modern !py-2 !w-auto text-sm"
          >
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-linkedin-500 to-linkedin-700 hover:from-linkedin-600 hover:to-linkedin-800 shadow-sm disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {generating ? 'Generating…' : lead.connection_request ? 'Regenerate' : 'Generate outreach'}
          </button>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
      </div>

      <Message id="cr" title="Connection request" value={lead.connection_request} sentKey="connection_request_sent" />
      <Message id="dm2" title="Follow-up DM 1" value={lead.dm_2} sentKey="dm_2_sent" />
      <Message id="dm3" title="Follow-up DM 2" value={lead.dm_3} sentKey="dm_3_sent" />
    </div>
  );
};

// --- Add lead modal ----------------------------------------------------------

const AddLeadModal: React.FC<{ onClose: () => void; onAdd: (lead: Partial<Lead>) => Promise<{ error?: string }> }> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState<Partial<Lead>>({ status: 'new' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof Lead, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.linkedin_url?.trim()) { setError('Name and LinkedIn URL are required.'); return; }
    setSaving(true);
    const { error: err } = await onAdd(form);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  const field = (k: keyof Lead, label: string, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}{required && ' *'}</label>
      <input type={type} value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} className="input-modern" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add lead</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {field('name', 'Name', 'text', true)}
          {field('linkedin_url', 'LinkedIn URL', 'url', true)}
          <div className="grid grid-cols-2 gap-4">
            {field('job_title', 'Job title')}
            {field('company_name', 'Company')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('industry', 'Industry')}
            {field('company_website', 'Company website', 'url')}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Services you could offer them</label>
            <textarea value={form.potential_services ?? ''} onChange={(e) => set('potential_services', e.target.value)} rows={2} className="input-modern resize-none" />
          </div>
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          <button type="submit" disabled={saving} className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add lead'}
          </button>
        </form>
      </div>
    </div>
  );
};
