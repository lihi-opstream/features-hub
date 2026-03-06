'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search, Settings, CheckCircle, Loader2,
  FileText, Mail, Layout, BookOpen, Linkedin, Globe, Wrench,
  ExternalLink, ChevronRight, ArrowLeft, Save, Edit3, X, Check,
  AlertCircle, RefreshCw
} from 'lucide-react';
import type { ShortcutEpic, FigmaFile, ActionType, GuideChange } from '@/types';

type Step = 'search' | 'results' | 'action' | 'generating' | 'preview' | 'guide-review' | 'saved';

const ACTIONS: { type: ActionType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'update-userguide', label: 'Update User Guide', description: 'Get AI suggestions to update the product user guide', icon: <BookOpen size={20} /> },
  { type: 'marketing-email', label: 'Marketing Email', description: 'Announce the feature to existing users', icon: <Mail size={20} /> },
  { type: 'onepager', label: 'One-Pager', description: 'Sales & marketing one-pager for the feature', icon: <FileText size={20} /> },
  { type: 'blog-post', label: 'Blog Post', description: 'Engaging blog post for the OpStream blog', icon: <Edit3 size={20} /> },
  { type: 'linkedin-post', label: 'LinkedIn Post', description: 'Social post to announce on LinkedIn', icon: <Linkedin size={20} /> },
  { type: 'landing-page', label: 'Landing Page', description: 'Full HTML landing page for the feature', icon: <Layout size={20} /> },
  { type: 'website-change', label: 'Website Update', description: 'Suggested changes for www.opstream.ai', icon: <Globe size={20} /> },
];

const STEPS = ['Search', 'Review', 'Choose Action', 'Generate'];

const HTML_TYPES: ActionType[] = ['marketing-email', 'onepager', 'blog-post', 'landing-page'];
const isHtmlType = (t: ActionType | null): boolean => HTML_TYPES.includes(t as ActionType);

function OpstreamLogo() {
  return (
    <img src="/opstream-logo.svg" alt="Opstream" height={44} style={{ height: '44px', width: 'auto' }} />
  );
}

function extractRelevant(text: string, query: string, maxLen: number): string {
  const lower = text.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      const start = Math.max(0, idx - 300);
      return text.slice(start, start + maxLen);
    }
  }
  return text.slice(0, maxLen);
}

export default function Home() {
  const [step, setStep] = useState<Step>('search');
  const [featureName, setFeatureName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [epics, setEpics] = useState<ShortcutEpic[]>([]);
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>([]);
  const [shortcutError, setShortcutError] = useState('');
  const [figmaError, setFigmaError] = useState('');

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [guideChanges, setGuideChanges] = useState<GuideChange[]>([]);
  const [approvedChanges, setApprovedChanges] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const [savedPath, setSavedPath] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [guideExists, setGuideExists] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const [guideExcerpt, setGuideExcerpt] = useState('');
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [includeEpics, setIncludeEpics] = useState(true);
  const [includeFigma, setIncludeFigma] = useState(true);
  const [includeGuide, setIncludeGuide] = useState(true);
  const [resultsInstructions, setResultsInstructions] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetch('/api/userguide')
      .then((r) => r.json())
      .then((d) => setGuideExists(d.exists))
      .catch(() => {});
  }, []);

  const currentStepIndex = () => {
    if (step === 'search') return 0;
    if (step === 'results') return 1;
    if (step === 'action') return 2;
    return 3;
  };

  const handleSearch = async () => {
    if (!featureName.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setShortcutError('');
    setFigmaError('');
    setGuideExcerpt('');
    setIsLoadingGuide(true);

    // Start guide fetch non-blocking
    fetch('/api/userguide')
      .then((r) => r.json())
      .then((d) => { if (d.content) setGuideExcerpt(extractRelevant(d.content, featureName, 1800)); })
      .catch(() => {})
      .finally(() => setIsLoadingGuide(false));

    try {
      const [scRes, figmaRes] = await Promise.all([
        fetch(`/api/shortcut?q=${encodeURIComponent(featureName)}`),
        fetch(`/api/figma?q=${encodeURIComponent(featureName)}`),
      ]);
      const scData = await scRes.json();
      const figmaData = await figmaRes.json();

      setEpics(scData.epics ?? []);
      setFigmaFiles(figmaData.files ?? []);
      if (scData.error) setShortcutError(scData.error);
      if (figmaData.error) setFigmaError(figmaData.error);
      setStep('results');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAction) return;
    setIsGenerating(true);
    setGeneratedContent('');

    const epicsToSend = includeEpics ? epics : [];
    const figmaToSend = includeFigma ? figmaFiles : [];
    const guideToSend = includeGuide ? guideExcerpt : '';
    const combinedPrompt = [resultsInstructions, customPrompt].filter(Boolean).join('\n\n');

    if (selectedAction === 'update-userguide') {
      setStep('generating');
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: selectedAction, featureName, epics: epicsToSend, figmaFiles: figmaToSend, guideExcerpt: guideToSend, customPrompt: combinedPrompt }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setGuideChanges(data.changes ?? []);
        setApprovedChanges(new Set(data.changes.map((_: GuideChange, i: number) => i)));
        setStep('guide-review');
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Generation failed');
        setStep('action');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setStep('generating');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedAction, featureName, epics: epicsToSend, figmaFiles: figmaToSend, guideExcerpt: guideToSend, customPrompt: combinedPrompt }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `API error ${res.status}`);
      }
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setGeneratedContent(content);
      }
      if (!content.trim()) throw new Error('Generation returned empty content — check your API key and try again');
      setEditContent(content);
      setStep('preview');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Generation failed');
      setStep('action');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const content = isEditing ? editContent : generatedContent;
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, featureName, type: selectedAction }),
    });
    const data = await res.json();
    if (data.success) {
      setSavedPath(data.path);
      setStep('saved');
    }
  };

  const handleApplyGuideChanges = async () => {
    setIsApplying(true);
    try {
      const approved = guideChanges.filter((_, i) => approvedChanges.has(i));
      const text = approved.map((c) => {
        const header = c.type === 'add' ? `## [ADD] ${c.section}` : `## [MODIFY] ${c.section}`;
        return `${header}\n\n${c.suggested}`;
      }).join('\n\n---\n\n');
      await navigator.clipboard.writeText(text);
      setSavedPath('Copied to clipboard — paste into your Google Drive document');
      setStep('saved');
    } finally {
      setIsApplying(false);
    }
  };

  const resetFlow = () => {
    setStep('search');
    setFeatureName('');
    setEpics([]);
    setFigmaFiles([]);
    setSelectedAction(null);
    setGeneratedContent('');
    setEditContent('');
    setGuideChanges([]);
    setApprovedChanges(new Set());
    setSavedPath('');
    setSearchError('');
    setIsEditing(false);
    setCustomPrompt('');
    setShowPrompt(false);
    setGuideExcerpt('');
    setIsLoadingGuide(false);
    setIncludeEpics(true);
    setIncludeFigma(true);
    setIncludeGuide(true);
    setResultsInstructions('');
    setShowGuide(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-subtle">
      {/* Header */}
      <header className="bg-white border-b border-brand-border px-6 py-3.5 flex items-center justify-between">
        <OpstreamLogo />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-brand-subtle transition-colors text-brand-gray hover:text-brand-body"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Progress bar */}
      {step !== 'saved' && (
        <div className="bg-white border-b border-brand-border px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {STEPS.map((s, i) => {
              const cur = currentStepIndex();
              const done = i < cur;
              const active = i === cur;
              const stepKeys: Step[] = ['search', 'results', 'action', 'action'];
              const clickable = done;
              return (
                <div key={s} className="flex items-center">
                  <button
                    onClick={() => clickable && setStep(stepKeys[i])}
                    disabled={!clickable}
                    className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-brand-green' : done ? 'text-brand-gray hover:text-brand-body' : 'text-brand-border'} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${active ? 'border-brand-green bg-brand-green text-white' : done ? 'border-brand-gray bg-brand-gray text-white' : 'border-brand-border text-brand-border'}`}>
                      {done ? <Check size={12} /> : i + 1}
                    </div>
                    {s}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} className="mx-2 text-brand-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          {/* STEP: SEARCH */}
          {step === 'search' && (
            <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8">
              <h2 className="text-2xl font-bold text-brand-navy mb-2">What feature are you documenting?</h2>
              <p className="text-brand-gray mb-6">Enter the feature name to search Shortcut and Figma for relevant context.</p>

              {!guideExists && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3 items-start">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Could not load the user guide from Google Drive.</p>
                    <p className="mt-0.5">Make sure the document is shared with "Anyone with the link" and try again.</p>
                  </div>
                </div>
              )}

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{searchError}</div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Smart Notifications, Dashboard Analytics..."
                  className="flex-1 border border-brand-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-brand-body placeholder:text-brand-gray"
                />
                <button
                  onClick={handleSearch}
                  disabled={!featureName.trim() || isSearching}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {/* STEP: RESULTS */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('search')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <h2 className="text-xl font-bold text-brand-navy">Results for <span className="text-brand-green">"{featureName}"</span></h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shortcut */}
                <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${includeEpics ? 'border-brand-border' : 'border-brand-border opacity-60'}`}>
                  <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                    <Wrench size={16} className="text-brand-green" />
                    <span className="font-semibold text-sm text-brand-body">Shortcut</span>
                    <span className="text-xs text-brand-gray">{epics.length} epic{epics.length !== 1 ? 's' : ''}</span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-brand-gray cursor-pointer select-none">
                      <input type="checkbox" checked={includeEpics} onChange={(e) => setIncludeEpics(e.target.checked)} className="rounded accent-[#59a985]" />
                      Include
                    </label>
                  </div>
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {shortcutError && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{shortcutError}</div>}
                    {epics.length === 0 && !shortcutError && <p className="text-sm text-brand-gray text-center py-4">No epics found</p>}
                    {epics.map((epic) => (
                      <div key={epic.id} className="border border-brand-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0">EPIC</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-body truncate">{epic.name}</p>
                            {epic.description && <p className="text-xs text-brand-gray mt-0.5 line-clamp-2">{epic.description}</p>}
                          </div>
                          {epic.app_url && <a href={epic.app_url} target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-green flex-shrink-0"><ExternalLink size={12} /></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Figma */}
                <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${includeFigma ? 'border-brand-border' : 'border-brand-border opacity-60'}`}>
                  <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                    <Layout size={16} className="text-pink-500" />
                    <span className="font-semibold text-sm text-brand-body">Figma</span>
                    <span className="text-xs text-brand-gray">{figmaFiles.length} file{figmaFiles.length !== 1 ? 's' : ''}</span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-brand-gray cursor-pointer select-none">
                      <input type="checkbox" checked={includeFigma} onChange={(e) => setIncludeFigma(e.target.checked)} className="rounded accent-[#59a985]" />
                      Include
                    </label>
                  </div>
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {figmaError && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{figmaError}</div>}
                    {figmaFiles.length === 0 && !figmaError && <p className="text-sm text-brand-gray text-center py-4">No matching files found</p>}
                    {figmaFiles.map((file) => (
                      <div key={file.key} className="border border-brand-border rounded-lg p-3 flex items-start gap-3">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.name} className="w-12 h-9 object-cover rounded flex-shrink-0 bg-brand-subtle" />
                        ) : (
                          <div className="w-12 h-9 bg-pink-50 rounded flex-shrink-0 flex items-center justify-center"><Layout size={16} className="text-pink-300" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-body truncate">{file.name}</p>
                          {file.project_name && <p className="text-xs text-brand-gray mt-0.5">{file.project_name}</p>}
                          <p className="text-xs text-brand-gray">{new Date(file.last_modified).toLocaleDateString()}</p>
                        </div>
                        <a href={`https://www.figma.com/file/${file.key}`} target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-pink-500 flex-shrink-0"><ExternalLink size={12} /></a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Guide */}
              <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${includeGuide ? 'border-brand-border' : 'border-brand-border opacity-60'}`}>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2 text-left"
                >
                  <BookOpen size={16} className="text-brand-green flex-shrink-0" />
                  <span className="font-semibold text-sm text-brand-body">User Guide</span>
                  {isLoadingGuide && <Loader2 size={13} className="animate-spin text-brand-gray" />}
                  {!isLoadingGuide && guideExcerpt && <span className="text-xs text-brand-gray">relevant excerpt</span>}
                  {!isLoadingGuide && !guideExcerpt && <span className="text-xs text-brand-gray">not available</span>}
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-brand-gray cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={includeGuide} onChange={(e) => setIncludeGuide(e.target.checked)} className="rounded accent-[#59a985]" />
                    Include
                  </label>
                  <ChevronRight size={14} className={`text-brand-gray ml-1 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
                </button>
                {showGuide && (
                  <div className="p-4">
                    {isLoadingGuide && <p className="text-sm text-brand-gray text-center py-4"><Loader2 size={16} className="animate-spin inline mr-2" />Loading user guide…</p>}
                    {!isLoadingGuide && guideExcerpt && (
                      <pre className="text-xs text-brand-body whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-brand-subtle rounded-lg p-4">{guideExcerpt}</pre>
                    )}
                    {!isLoadingGuide && !guideExcerpt && <p className="text-sm text-brand-gray text-center py-4">User guide could not be loaded</p>}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                  <Edit3 size={15} className="text-brand-green" />
                  <span className="font-semibold text-sm text-brand-body">Specific Instructions</span>
                  <span className="text-xs text-brand-gray">(optional)</span>
                </div>
                <div className="p-4">
                  <textarea
                    value={resultsInstructions}
                    onChange={(e) => setResultsInstructions(e.target.value)}
                    placeholder="e.g. Focus on enterprise buyers, highlight ROI, keep it under 300 words, target CTO persona…"
                    className="w-full h-20 border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-body placeholder:text-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep('action')}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 flex items-center gap-2 transition-opacity"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: ACTION */}
          {step === 'action' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('results')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">What would you like to create?</h2>
                  <p className="text-brand-gray text-sm mt-0.5">Feature: <span className="font-medium text-brand-green">{featureName}</span></p>
                </div>
              </div>

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{searchError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {ACTIONS.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => setSelectedAction(action.type)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${selectedAction === action.type ? 'border-brand-green bg-brand-green-light' : 'border-brand-border bg-white hover:border-brand-green hover:bg-brand-subtle'}`}
                  >
                    <div className={`mb-2 ${selectedAction === action.type ? 'text-brand-green' : 'text-brand-gray'}`}>{action.icon}</div>
                    <p className="font-semibold text-brand-body text-sm">{action.label}</p>
                    <p className="text-xs text-brand-gray mt-1">{action.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedAction || isGenerating}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* STEP: GENERATING */}
          {step === 'generating' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-8">
              <div className="flex flex-col items-center gap-4 mb-8 text-center">
                <div className="w-14 h-14 bg-brand-green-light rounded-2xl flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-brand-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">Generating content…</h2>
                  <p className="text-brand-gray text-sm mt-1">Claude is working on your {ACTIONS.find(a => a.type === selectedAction)?.label}</p>
                </div>
              </div>
              {generatedContent && !isHtmlType(selectedAction) && (
                <div className="bg-brand-subtle rounded-xl p-4 max-h-72 overflow-y-auto prose-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                </div>
              )}
              {isHtmlType(selectedAction) && (
                <p className="text-sm text-brand-gray text-center py-2">Building your branded HTML…</p>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
              <div className="border-b border-brand-border px-5 py-3 flex items-center gap-3">
                <button onClick={() => setStep('action')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div className="flex-1">
                  <h2 className="font-bold text-brand-navy">{ACTIONS.find(a => a.type === selectedAction)?.label}</h2>
                  <p className="text-xs text-brand-gray">Feature: {featureName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditContent(generatedContent); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-brand-subtle text-brand-body' : 'border border-brand-border text-brand-body hover:bg-brand-subtle'}`}
                  >
                    <Edit3 size={14} /> {isEditing ? 'Preview' : 'Edit'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-brand-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>

              <div className="p-5">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[500px] font-mono text-sm border border-brand-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-green resize-y"
                  />
                ) : isHtmlType(selectedAction) ? (
                  <iframe
                    srcDoc={generatedContent}
                    className="w-full border-0 rounded-xl"
                    style={{ height: '700px' }}
                    title="preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                ) : (
                  <div className="prose-content max-h-[600px] overflow-y-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Additional instructions / regenerate */}
              <div className="border-t border-brand-border p-5">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center gap-2 text-sm text-brand-gray hover:text-brand-body font-medium mb-3"
                >
                  <Edit3 size={14} />
                  {showPrompt ? 'Hide instructions' : 'Add instructions & regenerate'}
                  <ChevronRight size={14} className={`transition-transform ${showPrompt ? 'rotate-90' : ''}`} />
                </button>
                {showPrompt && (
                  <div className="space-y-3">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Make it shorter, focus on enterprise buyers, use a more formal tone, highlight the ROI..."
                      className="w-full h-24 border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-body placeholder:text-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      Regenerate with instructions
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP: GUIDE REVIEW */}
          {step === 'guide-review' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('action')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">Suggested User Guide Changes</h2>
                  <p className="text-brand-gray text-sm mt-0.5">{approvedChanges.size} of {guideChanges.length} changes approved — review and copy to Google Drive</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {guideChanges.map((change, i) => {
                  const approved = approvedChanges.has(i);
                  return (
                    <div key={i} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${approved ? 'border-brand-green' : 'border-brand-border'}`}>
                      <div className="px-5 py-3 border-b border-brand-border flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${change.type === 'add' ? 'bg-brand-green-light text-brand-green' : 'bg-blue-100 text-blue-700'}`}>
                          {change.type === 'add' ? '+ ADD' : '✎ MODIFY'}
                        </span>
                        <span className="font-medium text-brand-body text-sm flex-1">{change.section}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const next = new Set(approvedChanges);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              setApprovedChanges(next);
                            }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${approved ? 'bg-brand-green-light text-brand-green hover:bg-red-100 hover:text-red-700' : 'bg-brand-subtle text-brand-gray hover:bg-brand-green-light hover:text-brand-green'}`}
                          >
                            {approved ? <><Check size={14} /> Approved</> : <><X size={14} /> Skipped</>}
                          </button>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        {change.original && (
                          <div>
                            <p className="text-xs font-medium text-brand-gray mb-1 uppercase tracking-wide">Original</p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-brand-body font-mono whitespace-pre-wrap line-through opacity-70">{change.original}</div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-brand-gray mb-1 uppercase tracking-wide">Suggested</p>
                          <div className="bg-brand-green-light border border-brand-green/20 rounded-lg p-3 text-sm text-brand-body prose-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{change.suggested}</ReactMarkdown>
                          </div>
                        </div>
                        <p className="text-xs text-brand-gray italic">{change.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    if (approvedChanges.size === guideChanges.length) {
                      setApprovedChanges(new Set());
                    } else {
                      setApprovedChanges(new Set(guideChanges.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-brand-gray hover:text-brand-body underline"
                >
                  {approvedChanges.size === guideChanges.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={handleApplyGuideChanges}
                  disabled={approvedChanges.size === 0 || isApplying}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isApplying ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Copy {approvedChanges.size} Change{approvedChanges.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* STEP: SAVED */}
          {step === 'saved' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-10 text-center">
              <div className="w-16 h-16 bg-brand-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-navy mb-2">
                {selectedAction === 'update-userguide' ? 'Changes Ready!' : 'Content Saved!'}
              </h2>
              <p className="text-brand-gray mb-2">
                {selectedAction === 'update-userguide'
                  ? 'Approved changes have been copied to your clipboard. Paste them into your Google Drive document.'
                  : `Your ${ACTIONS.find(a => a.type === selectedAction)?.label} has been saved.`}
              </p>
              {savedPath && (
                <p className="text-sm bg-brand-subtle text-brand-gray inline-block px-3 py-1.5 rounded-lg mb-6 border border-brand-border">{savedPath}</p>
              )}
              {selectedAction === 'update-userguide' && (
                <div className="mb-6">
                  <a
                    href="https://docs.google.com/document/d/1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-green hover:opacity-80 underline"
                  >
                    <ExternalLink size={14} /> Open User Guide in Google Drive
                  </a>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetFlow}
                  className="flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw size={16} /> Start New Feature
                </button>
                <button
                  onClick={() => setStep(selectedAction === 'update-userguide' ? 'guide-review' : 'preview')}
                  className="flex items-center gap-2 border border-brand-border text-brand-body px-6 py-3 rounded-xl font-medium hover:bg-brand-subtle transition-colors"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep('action')}
                  className="flex items-center gap-2 border border-brand-border text-brand-body px-6 py-3 rounded-xl font-medium hover:bg-brand-subtle transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-brand-gray">
          <span>© {new Date().getFullYear()} Opstream. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="https://www.opstream.ai" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">www.opstream.ai</a>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
              <h3 className="text-lg font-bold text-brand-navy">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-brand-gray hover:text-brand-body">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Site */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-1">Site URL</label>
                <div className="bg-brand-subtle rounded-lg px-3 py-2 text-sm text-brand-gray font-mono border border-brand-border">www.opstream.ai</div>
              </div>

              {/* API Status */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-2">API Credentials</label>
                <p className="text-xs text-brand-gray mb-3">Configured via environment variables in AWS Amplify.</p>
                <div className="space-y-2">
                  {[
                    { label: 'Anthropic API Key', env: 'ANTHROPIC_API_KEY' },
                    { label: 'Shortcut API Token', env: 'SHORTCUT_API_TOKEN' },
                    { label: 'Figma API Token', env: 'FIGMA_API_TOKEN' },
                    { label: 'Figma Team / Project ID', env: 'FIGMA_TEAM_ID / FIGMA_PROJECT_ID' },
                  ].map((item) => (
                    <div key={item.env} className="flex items-center justify-between text-sm bg-brand-subtle rounded-lg px-3 py-2 border border-brand-border">
                      <span className="text-brand-body">{item.label}</span>
                      <span className="font-mono text-xs text-brand-gray">{item.env}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Guide */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-1">
                  User Guide
                  {guideExists && <span className="ml-2 text-xs text-brand-green font-normal">✓ Connected</span>}
                </label>
                <p className="text-xs text-brand-gray mb-3">The user guide is loaded from Google Drive and used by AI to suggest updates.</p>
                <a
                  href="https://docs.google.com/document/d/1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3 text-sm font-medium text-brand-body hover:bg-brand-subtle hover:border-brand-green transition-colors"
                >
                  <FileText size={18} className="text-brand-gray flex-shrink-0" />
                  <span className="flex-1">Open User Guide in Google Drive</span>
                  <ExternalLink size={14} className="text-brand-gray flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
