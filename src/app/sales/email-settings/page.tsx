'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';

import { useAuth } from '@/lib/auth/context';
import {
  Mail, Save, RefreshCw, CheckCircle2, AlertCircle, ChevronRight,
  Plus, Eye, EyeOff, Sparkles, Clock, User, Building2, Hash, Link2, ShieldOff
} from 'lucide-react';

// ── Friendly variable buttons ──────────────────────────────────────────────────
const VARIABLES = [
  { label: "Visitor's Name",    insert: "[Visitor's Name]",    example: 'John Smith',              icon: User },
  { label: 'Your Name',         insert: "[Your Name]",         example: 'Sarah Jenkins',           icon: User },
  { label: 'Property Interest', insert: '[Property Interest]', example: 'Master Suite',            icon: Building2 },
  { label: 'Follow-up Number',  insert: '[Follow-up Number]',  example: '1',                       icon: Hash },
  { label: '3D Walkthrough',    insert: '[3D Walkthrough Link]',example: 'https://…/walkthrough',  icon: Link2 },
  { label: 'Unsubscribe',       insert: '[Unsubscribe Link]',  example: 'https://…/opt-out',       icon: ShieldOff },
];

// Default subjects per follow-up
const DEFAULT_SUBJECTS: Record<number, string> = {
  1: "Thank you for your 3D walkthrough — OnePlace",
  2: "A quick follow-up on your property interest",
  3: "Still thinking about it? We're here to help",
  4: "Your personalised property tour — a reminder",
  5: "Have any questions? We're just a reply away",
};

// Default plain-text bodies per follow-up
const DEFAULT_BODIES: Record<number, string> = {
  1: `Dear [Visitor's Name],

Thank you for exploring our 3D property with [Your Name]! We noticed your interest in [Property Interest] and we'd love to help.

You can revisit the 3D tour anytime at [3D Walkthrough Link].

Simply reply to this email if you have any questions — we'd love to arrange a personal consultation.

Warm regards,
[Your Name]
OnePlace`,

  2: `Hi [Visitor's Name],

Just checking in after your recent 3D walkthrough. Have you had a chance to revisit it virtually?

If you'd like to see any specific rooms again: [3D Walkthrough Link]

Feel free to reply with any questions about [Property Interest].

Best,
[Your Name]`,

  3: `Dear [Visitor's Name],

We're still here whenever you're ready to take the next step on [Property Interest].

Re-enter the 3D experience: [3D Walkthrough Link]

Whether you have questions about pricing, floor plans, or availability — just reply and we'll get back to you right away.

[Your Name]`,

  4: `Hi [Visitor's Name],

This is follow-up [Follow-up Number] from [Your Name] at OnePlace.

We'd love to make sure you have everything you need to feel confident about [Property Interest].

Your 3D tour: [3D Walkthrough Link]

[Your Name]`,

  5: `Dear [Visitor's Name],

As a final follow-up — if you're still considering [Property Interest], I'd love to schedule a personal call or site visit.

Your 3D tour is always available: [3D Walkthrough Link]

Looking forward to hearing from you.

[Your Name]`,
};

function previewText(text: string): string {
  return text
    .replace(/\[Visitor's Name\]/g, 'John Smith')
    .replace(/\[Your Name\]/g, 'Sarah Jenkins')
    .replace(/\[Property Interest\]/g, 'Master Suite')
    .replace(/\[Follow-up Number\]/g, '1')
    .replace(/\[3D Walkthrough Link\]/g, 'https://oneplace.com/walkthrough')
    .replace(/\[Unsubscribe Link\]/g, 'https://oneplace.com/opt-out');
}

export default function EmailSettingsPage() {
  const { user } = useAuth();

  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [savedMaxFollowUps, setSavedMaxFollowUps] = useState(3);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [templates, setTemplates] = useState<Record<number, { subject: string; body: string; saved: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const getSalespersonId = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    // Try to get real UUID from Supabase profiles by email
    const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();
    if (supabase && user.email) {
      const { data } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle();
      if (data?.id && UUID_REGEX.test(data.id)) return data.id;
    }
    // Fallback: use user.id only if it's a real UUID
    if (UUID_REGEX.test(user.id)) return user.id;
    throw new Error('Your user profile was not found in the database. Please contact your administrator.');
  }, [user]);


  useEffect(() => {
    const load = async () => {
      try {
        const salespersonId = await getSalespersonId();
        const res = await fetch(`/api/email-templates?salespersonId=${encodeURIComponent(salespersonId)}`);
        const json = await res.json();
        const existing: { follow_up_number: number; subject: string; body_text: string }[] = json.data ?? [];
        const loaded: Record<number, { subject: string; body: string; saved: boolean }> = {};
        for (const t of existing) {
          loaded[t.follow_up_number] = { subject: t.subject, body: t.body_text, saved: true };
        }
        // Fill in defaults for any un-saved follow-up slots
        for (let i = 1; i <= 10; i++) {
          if (!loaded[i]) {
            loaded[i] = { subject: DEFAULT_SUBJECTS[i] ?? `Follow-up #${i} from OnePlace`, body: DEFAULT_BODIES[i] ?? DEFAULT_BODIES[5], saved: false };
          }
        }
        setTemplates(loaded);
        if (json.maxFollowUps !== undefined) {
          setMaxFollowUps(json.maxFollowUps);
          setSavedMaxFollowUps(json.maxFollowUps);
        }
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load templates.');
        console.error('Failed to load templates:', e);
      }
      setIsLoading(false);
    };
    load();
  }, [getSalespersonId]);


  const currentTemplate = templates[activeTab] || { subject: DEFAULT_SUBJECTS[activeTab] ?? '', body: DEFAULT_BODIES[activeTab] ?? '', saved: false };

  const updateCurrent = (field: 'subject' | 'body', value: string) => {
    setTemplates(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], subject: field === 'subject' ? value : prev[activeTab]?.subject ?? '', body: field === 'body' ? value : prev[activeTab]?.body ?? '', saved: false } }));
  };

  const insertVariable = (insert: string) => {
    const ta = bodyRef.current;
    if (!ta) {
      updateCurrent('body', currentTemplate.body + insert);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = currentTemplate.body.slice(0, start) + insert + currentTemplate.body.slice(end);
    updateCurrent('body', newBody);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    }, 0);
  };

  const saveTemplate = async (salespersonId: string, followUpNumber: number, subject: string, bodyText: string): Promise<boolean> => {
    const res = await fetch('/api/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salespersonId, followUpNumber, subject, bodyText }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return true;
  };

  const handleSaveLimit = async () => {
    setIsSavingLimit(true);
    setErrorMsg('');
    try {
      const salespersonId = await getSalespersonId();
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salespersonId, maxFollowUps }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setSavedMaxFollowUps(maxFollowUps);
      setSavedAt(new Date());
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleSave = async () => {
    const t = currentTemplate;
    if (!t.subject.trim() || !t.body.trim()) { setErrorMsg('Subject and message body cannot be empty.'); return; }
    setIsSaving(true);
    setErrorMsg('');
    try {
      const salespersonId = await getSalespersonId();
      await saveTemplate(salespersonId, activeTab, t.subject, t.body);
      setTemplates(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], saved: true } }));
      setSavedAt(new Date());
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      const salespersonId = await getSalespersonId();
      let anyError = false;
      for (let i = 1; i <= maxFollowUps; i++) {
        const t = templates[i];
        if (!t) continue;
        try {
          await saveTemplate(salespersonId, i, t.subject, t.body);
          setTemplates(prev => ({ ...prev, [i]: { ...prev[i], saved: true } }));
        } catch {
          anyError = true;
        }
      }
      if (anyError) setErrorMsg('Some templates could not be saved.');
      else setSavedAt(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-60">
          <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const savedTabs = Object.entries(templates).filter(([, t]) => t.saved).map(([n]) => Number(n));
  const previewSubject = previewText(currentTemplate.subject);
  const previewBody = previewText(currentTemplate.body);

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* ── HEADER ── */}
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-sky-400" />
            </div>
            Email Follow-up Templates
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Write your follow-up emails in plain English. The system automatically formats them into a beautiful email for your leads.
            Each follow-up is sent <strong className="text-white">1 minute apart</strong>.
          </p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-none mt-0.5 text-red-400" /> {errorMsg}
          </div>
        )}

        {savedAt && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            Templates saved at {savedAt.toLocaleTimeString()}. These will be used for all your future follow-up emails.
          </div>
        )}

        {/* ── HOW MANY FOLLOW-UPS ── */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                How many follow-up emails?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Each is sent 1 minute after the last. Maximum 10.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-white">{maxFollowUps}</span>
              <button
                onClick={handleSaveLimit}
                disabled={isSavingLimit || maxFollowUps === savedMaxFollowUps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 disabled:opacity-40 disabled:bg-slate-800 text-sky-400 hover:text-white disabled:text-slate-500 text-xs font-bold border border-sky-500/30 disabled:border-slate-800 transition shadow-lg shadow-sky-500/5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSavingLimit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Limit
              </button>
            </div>
          </div>
          <input
            type="range" min={1} max={10} value={maxFollowUps}
            onChange={e => setMaxFollowUps(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #0ea5e9 ${(maxFollowUps - 1) / 9 * 100}%, #1e293b ${(maxFollowUps - 1) / 9 * 100}%)` }}
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1.5 px-0.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <span key={n} className={n <= maxFollowUps ? 'text-sky-400 font-bold' : ''}>{n}</span>
            ))}
          </div>
        </div>

        {/* ── PER-FOLLOW-UP TABS ── */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
            {Array.from({ length: maxFollowUps }, (_, i) => i + 1).map(n => {
              const t = templates[n];
              const isSaved = t?.saved;
              const isActive = activeTab === n;
              return (
                <button
                  key={n}
                  onClick={() => setActiveTab(n)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex-none ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Follow-up {n}
                  {isSaved && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 space-y-6">
            {/* Info strip */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <Clock className="w-4 h-4 text-sky-400 flex-none" />
              <p className="text-xs text-slate-300">
                <strong className="text-white">Follow-up {activeTab}</strong> — sent
                {activeTab === 1 ? ' immediately after registration' : ` ${activeTab - 1} minute${activeTab - 1 > 1 ? 's' : ''} after registration`}.
                {templates[activeTab]?.saved
                  ? <span className="ml-2 text-emerald-400">✓ Custom template saved</span>
                  : <span className="ml-2 text-slate-500">Using default template</span>}
              </p>
            </div>

            {/* Variable buttons */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Click to insert into your message ↓
              </p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <button
                    key={v.insert}
                    onClick={() => insertVariable(v.insert)}
                    title={`Example: "${v.example}"`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-500/20 hover:border-sky-500/50 border border-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold transition group"
                  >
                    <v.icon className="w-3.5 h-3.5 flex-none" />
                    {v.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5">Hover any button to see an example of what it inserts</p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                Email Subject
              </label>
              <input
                type="text"
                value={currentTemplate.subject}
                onChange={e => updateCurrent('subject', e.target.value)}
                placeholder="e.g. Thank you for your 3D walkthrough"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white text-sm placeholder:text-slate-600 focus:outline-none transition"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Email Message
                <span className="ml-2 text-slate-500 font-normal">Write in plain English — we handle the formatting</span>
              </label>
              <textarea
                ref={bodyRef}
                value={currentTemplate.body}
                onChange={e => updateCurrent('body', e.target.value)}
                rows={12}
                placeholder="Write your message here..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none resize-y transition leading-relaxed font-sans"
              />
              <p className="text-[10px] text-slate-500">
                Tip: Use blank lines to separate paragraphs. Use the buttons above to insert visitor details.
              </p>
            </div>

            {/* Preview toggle */}
            <div>
              <button
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-sky-400 transition mb-3"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Hide' : 'Show'} how this email will look
              </button>

              {showPreview && (
                <div className="rounded-2xl border border-slate-700 overflow-hidden">
                  {/* Email chrome mockup */}
                  <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <div className="flex-1 bg-slate-950 rounded-lg px-3 py-1.5 text-xs text-slate-400 ml-2 truncate">
                      Subject: {previewSubject}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-6 max-h-80 overflow-y-auto">
                    <div className="text-center mb-5">
                      <span className="inline-block bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-bold px-5 py-2 rounded-xl">OnePlace</span>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-5">
                      {previewBody.split(/\n\n+/).map((para, i) => (
                        <p key={i} className="text-slate-200 text-sm leading-relaxed mb-3 last:mb-0 whitespace-pre-wrap">{para}</p>
                      ))}
                    </div>
                    <p className="text-center text-slate-600 text-xs mt-4">
                      Sent by Sarah Jenkins via OnePlace · <span className="underline">Unsubscribe</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Save buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-500">
                <Sparkles className="w-3 h-3 inline mr-1 text-sky-400" />
                Your email is automatically styled — you only write the words
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save All {maxFollowUps}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaving ? 'Saving…' : `Save Follow-up ${activeTab}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SAVED STATUS SUMMARY ── */}
        {maxFollowUps > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 mb-3">Template Status</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: maxFollowUps }, (_, i) => i + 1).map(n => {
                const isSaved = templates[n]?.saved;
                return (
                  <button
                    key={n}
                    onClick={() => setActiveTab(n)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isSaved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {isSaved ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    Follow-up {n}
                    {isSaved ? '' : ' (default)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
