import React, { useState } from 'react';
import { Send, ExternalLink, Copy, FileText, Video, BarChart3, Eye, EyeOff, DollarSign, Briefcase } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { GenerateResponse, JobLevel, CompensationType } from '../types';
import { supabase } from '../lib/supabase';
import { loadAIConfig } from '../lib/aiConfig';
import { loadUserContext, contextToPrompt } from '../lib/userContext';
import { effectivePrompt } from '../lib/prompts';

export const Apply: React.FC = () => {
  const { addMaterial } = useData();
  const [jobTitle, setJobTitle] = useState('');
  const [jobSummary, setJobSummary] = useState('');
  const [jobLevel, setJobLevel] = useState<JobLevel>('intermediate');
  const [compensationType, setCompensationType] = useState<CompensationType>('fixed_price');
  const [proposedAmount, setProposedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GenerateResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !jobSummary.trim()) {
      setError('Please fill in both job title and summary');
      return;
    }

    const aiConfig = loadAIConfig();
    if (!aiConfig) {
      setError('Add your AI provider and API key in Settings before generating.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke<GenerateResponse>(
        'generate-proposal',
        {
          body: {
            job_title: jobTitle,
            job_summary: jobSummary,
            context: contextToPrompt(loadUserContext()),
            systemPrompt: effectivePrompt('proposal'),
            provider: aiConfig.provider,
            model: aiConfig.model,
            apiKey: aiConfig.apiKey,
          },
        }
      );

      if (fnError) {
        // Our function returns { error } as JSON on failure — surface that message.
        let message = fnError.message;
        const context = (fnError as { context?: Response }).context;
        if (context && typeof context.json === 'function') {
          const body = await context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }

      if (!data) {
        throw new Error('No response from the proposal generator.');
      }

      setGeneratedData(data);
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate proposal';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaterials = async () => {
    if (!generatedData) return;

    setLoading(true);
    setError('');

    const result = await addMaterial({
      title: jobTitle,
      summary: jobSummary,
      cover_letter: generatedData.cover_letter,
      proposal_document: generatedData.proposal_url,
      mermaid_code: generatedData.mermaid_code,
      video_script: generatedData.video_script,
      status: 'drafted',
      job_level: jobLevel,
      compensation_type: compensationType,
      proposed_amount: proposedAmount ? parseFloat(proposedAmount) : undefined,
      actual_amount: actualAmount ? parseFloat(actualAmount) : undefined
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to save materials');
      return;
    }

    // Reset form
    setJobTitle('');
    setJobSummary('');
    setJobLevel('intermediate');
    setCompensationType('fixed_price');
    setProposedAmount('');
    setActualAmount('');
    setGeneratedData(null);
    setShowPreview(false);

    // Show success message
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 transition-opacity duration-200';
    toast.textContent = 'Materials saved successfully!';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 200);
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg z-50 transition-opacity duration-200';
      toast.textContent = 'Copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 200);
      }, 2000);
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Job Input Card */}
      <div className="card-modern p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center mr-3">
            <Send className="w-4 h-4 text-white" />
          </div>
          Job Details
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8">
          Paste the Upwork job details and generate your first draft materials.
        </p>

        <div className="space-y-6">
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input-modern"
              placeholder="Enter the job title from Upwork"
            />
          </div>

          <div>
            <label htmlFor="jobSummary" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Job Summary
            </label>
            <textarea
              id="jobSummary"
              value={jobSummary}
              onChange={(e) => setJobSummary(e.target.value)}
              rows={6}
              className="input-modern resize-none"
              placeholder="Paste the complete job description and requirements"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="jobLevel" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Job Level
              </label>
              <select
                id="jobLevel"
                value={jobLevel}
                onChange={(e) => setJobLevel(e.target.value as JobLevel)}
                className="input-modern"
              >
                <option value="entry">Entry Level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label htmlFor="compensationType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Compensation Type
              </label>
              <select
                id="compensationType"
                value={compensationType}
                onChange={(e) => setCompensationType(e.target.value as CompensationType)}
                className="input-modern"
              >
                <option value="fixed_price">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="proposedAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-upwork-500" />
                Proposed Amount
              </label>
              <input
                id="proposedAmount"
                type="number"
                step="0.01"
                min="0"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="input-modern"
                placeholder={compensationType === 'hourly' ? 'Rate per hour' : 'Total project amount'}
              />
            </div>

            <div>
              <label htmlFor="actualAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-upwork-500" />
                Actual Amount
              </label>
              <input
                id="actualAmount"
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="input-modern"
                placeholder={compensationType === 'hourly' ? 'Final rate per hour' : 'Final project amount'}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !jobTitle.trim() || !jobSummary.trim()}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Proposal'}
          </button>
        </div>
      </div>

      {/* Outputs Card */}
      {generatedData && (
        <div className="card-modern p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Generated Materials
            </h2>
            <button
              onClick={handleSaveMaterials}
              disabled={loading}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5 mr-2" />
              {loading ? 'Saving...' : 'Save Materials'}
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Cover Letter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Cover Letter</h3>
              </div>
              <textarea
                value={generatedData.cover_letter}
                onChange={(e) => setGeneratedData(prev => prev ? { ...prev, cover_letter: e.target.value } : null)}
                rows={8}
                className="input-modern text-sm resize-none"
              />
            </div>

            {/* Mermaid Diagram */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Diagram Code</h3>
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center px-3 py-2 text-sm text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-all duration-200 font-medium"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show Preview
                    </>
                  )}
                </button>
              </div>
              
              {showPreview ? (
                <div className="p-6 bg-gradient-to-br from-upwork-50 to-upwork-100 dark:from-upwork-900/20 dark:to-upwork-800/20 rounded-xl text-sm text-gray-700 dark:text-gray-300 border border-upwork-200 dark:border-upwork-700">
                  <p className="italic">Mermaid diagram preview would be rendered here</p>
                  <p className="text-xs mt-3 text-upwork-600 dark:text-upwork-400 font-medium">Use the raw code in your proposal documents</p>
                </div>
              ) : (
                <textarea
                  value={generatedData.mermaid_code}
                  readOnly
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono resize-none focus:ring-2 focus:ring-upwork-500 focus:border-upwork-500 transition-all duration-200"
                />
              )}
            </div>

            {/* Proposal Document */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Proposal Document</h3>
              </div>
              <a
                href={generatedData.proposal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-upwork-300 dark:border-upwork-600 rounded-xl hover:border-upwork-500 dark:hover:border-upwork-400 transition-all duration-300 text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50/50 dark:bg-upwork-900/10 hover:bg-upwork-100 dark:hover:bg-upwork-900/20 transform hover:scale-105 font-medium"
              >
                <ExternalLink className="w-6 h-6 mr-3" />
                Open Proposal Document
              </a>
            </div>

            {/* Video Script */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <Video className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Video Script</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedData.video_script)}
                  className="flex items-center px-3 py-2 text-sm text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-all duration-200 font-medium"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </button>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
                <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {generatedData.video_script}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};