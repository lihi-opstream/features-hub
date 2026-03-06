'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search, Settings, Upload, CheckCircle, XCircle, Loader2,
  FileText, Mail, Layout, BookOpen, Linkedin, Globe, Wrench,
  ExternalLink, ChevronRight, ArrowLeft, Save, Edit3, X, Check,
  AlertCircle, RefreshCw
} from 'lucide-react';
import type { ShortcutEpic, ShortcutStory, FigmaFile, ActionType, GuideChange } from '@/types';

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

export default function Home() {
  const [step, setStep] = useState<Step>('search');
  const [featureName, setFeatureName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [epics, setEpics] = useState<ShortcutEpic[]>([]);
  const [stories, setStories] = useState<ShortcutStory[]>([]);
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
  const [isUploadingGuide, setIsUploadingGuide] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user guide exists on mount
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
    try {
      const [scRes, figmaRes] = await Promise.all([
        fetch(`/api/shortcut?q=${encodeURIComponent(featureName)}`),
        fetch(`/api/figma?q=${encodeURIComponent(featureName)}`),
      ]);
      const scData = await scRes.json();
      const figmaData = await figmaRes.json();

      setEpics(scData.epics ?? []);
      setStories(scData.stories ?? []);
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

    if (selectedAction === 'update-userguide') {
      setStep('generating');
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: selectedAction, featureName, epics, stories, figmaFiles }),
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
        body: JSON.stringify({ type: selectedAction, featureName, epics, stories, figmaFiles }),
      });
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
      const guideRes = await fetch('/api/userguide');
      const guideData = await guideRes.json();
      let content: string = guideData.content ?? '';

      const approved = guideChanges.filter((_, i) => approvedChanges.has(i));
      for (const change of approved) {
        if (change.type === 'add') {
          content += '\n\n' + change.suggested;
        } else if (change.type === 'modify' && change.original) {
          if (content.includes(change.original)) {
            content = content.replace(change.original, change.suggested);
          } else {
            content += '\n\n' + change.suggested;
          }
        }
      }

      const saveRes = await fetch('/api/userguide', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (saveRes.ok) {
        setGuideExists(true);
        setSavedPath('data/userguide.md');
        setStep('saved');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleGuideUpload = useCallback(async (file: File) => {
    setIsUploadingGuide(true);
    setUploadError('');
    setUploadSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/userguide', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setGuideExists(true);
        setUploadSuccess(`User guide uploaded (${Math.round(data.size / 1024 * 10) / 10} KB)`);
      } else {
        setUploadError(data.error ?? 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed');
    } finally {
      setIsUploadingGuide(false);
    }
  }, []);

  const resetFlow = () => {
    setStep('search');
    setFeatureName('');
    setEpics([]);
    setStories([]);
    setFigmaFiles([]);
    setSelectedAction(null);
    setGeneratedContent('');
    setEditContent('');
    setGuideChanges([]);
    setApprovedChanges(new Set());
    setSavedPath('');
    setSearchError('');
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">O</div>
          <div>
            <h1 className="text-base font-semibold leading-none">OpStream Content Hub</h1>
            <p className="text-slate-400 text-xs mt-0.5">www.opstream.ai</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Progress bar */}
      {step !== 'saved' && (
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {STEPS.map((s, i) => {
              const cur = currentStepIndex();
              const done = i < cur;
              const active = i === cur;
              return (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-indigo-600' : done ? 'text-slate-500' : 'text-slate-300'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${active ? 'border-indigo-600 bg-indigo-600 text-white' : done ? 'border-slate-400 bg-slate-400 text-white' : 'border-slate-200 text-slate-300'}`}>
                      {done ? <Check size={12} /> : i + 1}
                    </div>
                    {s}
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} className="mx-2 text-slate-300" />
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">What feature are you documenting?</h2>
              <p className="text-slate-500 mb-6">Enter the feature name to search Shortcut and Figma for relevant context.</p>

              {!guideExists && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3 items-start">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">No user guide uploaded yet.</p>
                    <p className="mt-0.5">Open <button onClick={() => setShowSettings(true)} className="underline font-medium">Settings</button> to upload your user guide before generating content updates.</p>
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
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={!featureName.trim() || isSearching}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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
                <button onClick={() => setStep('search')} className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></button>
                <h2 className="text-xl font-bold text-slate-900">Results for <span className="text-indigo-600">"{featureName}"</span></h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shortcut */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <Wrench size={16} className="text-indigo-500" />
                    <span className="font-semibold text-sm text-slate-700">Shortcut</span>
                    <span className="ml-auto text-xs text-slate-400">{epics.length} epic{epics.length !== 1 ? 's' : ''}, {stories.length} stor{stories.length !== 1 ? 'ies' : 'y'}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {shortcutError && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{shortcutError}</div>
                    )}
                    {epics.length === 0 && stories.length === 0 && !shortcutError && (
                      <p className="text-sm text-slate-400 text-center py-4">No results found</p>
                    )}
                    {epics.map((epic) => (
                      <div key={epic.id} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0">EPIC</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{epic.name}</p>
                            {epic.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{epic.description}</p>}
                          </div>
                          {epic.app_url && (
                            <a href={epic.app_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-500 flex-shrink-0"><ExternalLink size={12} /></a>
                          )}
                        </div>
                      </div>
                    ))}
                    {stories.map((story) => (
                      <div key={story.id} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0 ${story.story_type === 'bug' ? 'bg-red-100 text-red-700' : story.story_type === 'chore' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                            {story.story_type.toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{story.name}</p>
                            {story.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{story.description}</p>}
                          </div>
                          {story.app_url && (
                            <a href={story.app_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-500 flex-shrink-0"><ExternalLink size={12} /></a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Figma */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <Layout size={16} className="text-pink-500" />
                    <span className="font-semibold text-sm text-slate-700">Figma</span>
                    <span className="ml-auto text-xs text-slate-400">{figmaFiles.length} file{figmaFiles.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {figmaError && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{figmaError}</div>
                    )}
                    {figmaFiles.length === 0 && !figmaError && (
                      <p className="text-sm text-slate-400 text-center py-4">No matching files found</p>
                    )}
                    {figmaFiles.map((file) => (
                      <div key={file.key} className="border border-slate-100 rounded-lg p-3 flex items-start gap-3">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.name} className="w-12 h-9 object-cover rounded flex-shrink-0 bg-slate-100" />
                        ) : (
                          <div className="w-12 h-9 bg-pink-50 rounded flex-shrink-0 flex items-center justify-center">
                            <Layout size={16} className="text-pink-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                          {file.project_name && <p className="text-xs text-slate-400 mt-0.5">{file.project_name}</p>}
                          <p className="text-xs text-slate-400">{new Date(file.last_modified).toLocaleDateString()}</p>
                        </div>
                        <a
                          href={`https://www.figma.com/file/${file.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-pink-500 flex-shrink-0"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep('action')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 flex items-center gap-2 transition-colors"
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
                <button onClick={() => setStep('results')} className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">What would you like to create?</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Feature: <span className="font-medium text-indigo-600">{featureName}</span></p>
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
                    className={`text-left p-4 rounded-xl border-2 transition-all ${selectedAction === action.type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                  >
                    <div className={`mb-2 ${selectedAction === action.type ? 'text-indigo-600' : 'text-slate-500'}`}>{action.icon}</div>
                    <p className="font-semibold text-slate-800 text-sm">{action.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedAction || isGenerating}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* STEP: GENERATING */}
          {step === 'generating' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex flex-col items-center gap-4 mb-8 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Generating content…</h2>
                  <p className="text-slate-500 text-sm mt-1">Claude is working on your {ACTIONS.find(a => a.type === selectedAction)?.label}</p>
                </div>
              </div>
              {generatedContent && (
                <div className="bg-slate-50 rounded-xl p-4 max-h-72 overflow-y-auto prose-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <button onClick={() => setStep('action')} className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></button>
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900">{ACTIONS.find(a => a.type === selectedAction)?.label}</h2>
                  <p className="text-xs text-slate-400">Feature: {featureName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditContent(generatedContent); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-slate-200 text-slate-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Edit3 size={14} /> {isEditing ? 'Preview' : 'Edit'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
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
                    className="w-full min-h-[500px] font-mono text-sm border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                ) : (
                  <div className="prose-content max-h-[600px] overflow-y-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{isEditing ? editContent : generatedContent}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP: GUIDE REVIEW */}
          {step === 'guide-review' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('action')} className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Suggested User Guide Changes</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{approvedChanges.size} of {guideChanges.length} changes approved — review and apply</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {guideChanges.map((change, i) => {
                  const approved = approvedChanges.has(i);
                  return (
                    <div key={i} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${approved ? 'border-green-300' : 'border-slate-200'}`}>
                      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${change.type === 'add' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {change.type === 'add' ? '+ ADD' : '✎ MODIFY'}
                        </span>
                        <span className="font-medium text-slate-800 text-sm flex-1">{change.section}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const next = new Set(approvedChanges);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              setApprovedChanges(next);
                            }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${approved ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'}`}
                          >
                            {approved ? <><Check size={14} /> Approved</> : <><X size={14} /> Skipped</>}
                          </button>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        {change.original && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">Original</p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-slate-700 font-mono whitespace-pre-wrap line-through opacity-70">{change.original}</div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">Suggested</p>
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-slate-700 prose-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{change.suggested}</ReactMarkdown>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">{change.reason}</p>
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
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  {approvedChanges.size === guideChanges.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={handleApplyGuideChanges}
                  disabled={approvedChanges.size === 0 || isApplying}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isApplying ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Apply {approvedChanges.size} Change{approvedChanges.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* STEP: SAVED */}
          {step === 'saved' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {selectedAction === 'update-userguide' ? 'User Guide Updated!' : 'Content Saved!'}
              </h2>
              <p className="text-slate-500 mb-2">
                {selectedAction === 'update-userguide'
                  ? 'The approved changes have been applied to your user guide.'
                  : `Your ${ACTIONS.find(a => a.type === selectedAction)?.label} has been saved.`}
              </p>
              {savedPath && (
                <p className="text-sm font-mono bg-slate-100 text-slate-600 inline-block px-3 py-1.5 rounded-lg mb-6">{savedPath}</p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetFlow}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw size={16} /> Start New Feature
                </button>
                <button
                  onClick={() => setStep('action')}
                  className="flex items-center gap-2 border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Settings</h3>
              <button onClick={() => { setShowSettings(false); setUploadSuccess(''); setUploadError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Site */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Site URL</label>
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono">www.opstream.ai</div>
              </div>

              {/* API Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">API Credentials</label>
                <p className="text-xs text-slate-500 mb-3">Set these in your <span className="font-mono">.env.local</span> file. See <span className="font-mono">.env.example</span> for reference.</p>
                <div className="space-y-2">
                  {[
                    { label: 'Anthropic API Key', env: 'ANTHROPIC_API_KEY' },
                    { label: 'Shortcut API Token', env: 'SHORTCUT_API_TOKEN' },
                    { label: 'Figma API Token', env: 'FIGMA_API_TOKEN' },
                    { label: 'Figma Team / Project ID', env: 'FIGMA_TEAM_ID / FIGMA_PROJECT_ID' },
                  ].map((item) => (
                    <div key={item.env} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-mono text-xs text-slate-400">{item.env}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Guide */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  User Guide
                  {guideExists && <span className="ml-2 text-xs text-green-600 font-normal">✓ Uploaded</span>}
                </label>
                <p className="text-xs text-slate-500 mb-3">Upload a Markdown or plain text (.md, .txt) file. It will be stored as <span className="font-mono">data/userguide.md</span>.</p>

                {uploadSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle size={14} /> {uploadSuccess}
                  </div>
                )}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-sm text-red-700 flex items-center gap-2">
                    <XCircle size={14} /> {uploadError}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleGuideUpload(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingGuide}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 flex flex-col items-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  {isUploadingGuide ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                  <span className="text-sm font-medium">{guideExists ? 'Replace User Guide' : 'Upload User Guide'}</span>
                  <span className="text-xs">.md or .txt files</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
