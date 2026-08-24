'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  Mail, Save, RefreshCw, Eye, EyeOff, Sparkles, CheckCircle2,
  AlertCircle, Info, ChevronDown, ChevronUp, Code2
} from 'lucide-react';

const VARIABLE_CHIPS = [
  { label: '{{visitor_name}}', desc: "Visitor's full name" },
  { label: '{{salesperson_name}}', desc: 'Your name' },
  { label: '{{inquiry_type}}', desc: 'What they enquired about' },
  { label: '{{follow_up_number}}', desc: 'Which follow-up this is (1, 2…)' },
  { label: '{{walkthrough_url}}', desc: 'Link to 3D walkthrough' },
  { label: '{{opt_out_url}}', desc: 'Unsubscribe link (required)' },
];

const DEFAULT_SUBJECT = 'Thank you for your 3D walkthrough — OnePlace';

const DEFAULT_HTML = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #38bdf8; font-size: 28px; letter-spacing: -0.5px; margin: 0;">OnePlace</h1>
    <p style="color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Exclusive Spatial Property Exploration</p>
  </div>

  <h2 style="color: #ffffff; font-size: 22px;">Dear {{visitor_name}},</h2>
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
    Thank you for taking the 3D walkthrough with <strong>{{salesperson_name}}</strong>! This is follow-up #{{follow_up_number}} from me.
  </p>
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
    We noted your interest in <em>"{{inquiry_type}}"</em>. I would love to help you explore this further.
  </p>

  <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 24px 0;">
    <p style="margin: 0; color: #e2e8f0; font-size: 15px; font-weight: 500;">Re-open your private 3D tour anytime:</p>
    <a href="{{walkthrough_url}}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Re-enter 3D Walkthrough →</a>
  </div>

  <p style="color: #cbd5e1; font-size: 15px;">
    Simply reply to this email and I will get back to you right away. — {{salesperson_name}}
  </p>

  <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0;" />
  <div style="font-size: 12px; color: #64748b; text-align: center;">
    <p><a href="{{opt_out_url}}" style="color: #94a3b8; text-decoration: underline;">Click here to opt out of future property updates</a></p>
  </div>
</div>`;

function renderPreview(html: string, subject: string, name: string) {
  const vars: Record<string, string> = {
    visitor_name: 'John Smith',
    salesperson_name: name || 'Sarah Jenkins',
    inquiry_type: 'Master Suite & Custom Finishes',
    follow_up_number: '1',
    walkthrough_url: '#walkthrough',
    opt_out_url: '#opt-out',
  };
  let rendered = html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  let renderedSubject = subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  return { rendered, renderedSubject };
}

export default function EmailSettingsPage() {
  const { user } = useAuth();

  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_HTML);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showVarHelp, setShowVarHelp] = useState(true);
  const [hasExistingTemplate, setHasExistingTemplate] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      if (!user?.id) return;
      try {
        // Try to resolve real Supabase UUID for this user
        const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();
        let salespersonId = user.id;
        if (supabase && user.email) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle();
          if (profile?.id) salespersonId = profile.id;
        }

        const template = await mockDb.getEmailTemplate(salespersonId);
        if (template) {
          setSubject(template.subject);
          setBodyHtml(template.body_html);
          setHasExistingTemplate(true);
        }
      } catch (err) {
        console.warn('Could not load template', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [user]);

  const handleInsertVariable = (variable: string) => {
    setBodyHtml(prev => prev + variable);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();
      let salespersonId = user.id;
      if (supabase && user.email) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle();
        if (profile?.id) salespersonId = profile.id;
      }

      const result = await mockDb.saveEmailTemplate(salespersonId, subject, bodyHtml);
      if (result) {
        setHasExistingTemplate(true);
        setSuccessMsg('✓ Email template saved! Your custom template will be used for all future follow-ups sent to your leads.');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg('Failed to save template. The database table may not exist yet — run the migration first via Admin → Run Migration.');
      }
    } catch (err: unknown) {
      setErrorMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default template? Your custom content will be lost.')) {
      setSubject(DEFAULT_SUBJECT);
      setBodyHtml(DEFAULT_HTML);
    }
  };

  const { rendered: previewHtml, renderedSubject: previewSubject } = renderPreview(
    bodyHtml, subject, user?.full_name || ''
  );

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-60">
          <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-sky-400" />
              Email Template Settings
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Customise the follow-up email your leads receive. Uses HTML — template variables auto-fill at send time.
              {hasExistingTemplate && <span className="ml-2 text-emerald-400 font-semibold">● Custom template active</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-800 transition"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !subject.trim() || !bodyHtml.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Success / Error banners */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none mt-0.5" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ── LEFT: Editor ── */}
          <div className="xl:col-span-3 space-y-5">
            {/* Variables Help */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
              <button
                onClick={() => setShowVarHelp(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-sky-400" />
                  Template Variables — click to insert
                </span>
                {showVarHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showVarHelp && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {VARIABLE_CHIPS.map(v => (
                    <button
                      key={v.label}
                      onClick={() => handleInsertVariable(v.label)}
                      className="text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 transition group"
                    >
                      <code className="text-[11px] text-sky-400 font-mono group-hover:text-sky-300 block">{v.label}</code>
                      <span className="text-[10px] text-slate-500">{v.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Line */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-400" /> Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Your 3D Tour Follow-up from {{salesperson_name}}"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none transition"
              />
            </div>

            {/* HTML Body Editor */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-sky-400" /> Email Body (HTML)
              </label>
              <textarea
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={22}
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-none resize-y transition leading-relaxed"
                placeholder="Enter your HTML email body here..."
              />
              <p className="text-[10px] text-slate-500">
                Tip: Use inline styles for best email client compatibility. Always include <code className="text-sky-500">{'{{opt_out_url}}'}</code> for compliance.
              </p>
            </div>
          </div>

          {/* ── RIGHT: Preview ── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Live Preview
                </h3>
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>

              {/* Subject preview */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Subject</p>
                <p className="text-xs font-semibold text-white">{previewSubject || '(empty subject)'}</p>
              </div>

              {/* Info box */}
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1.5">
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3" /> How it works
                </p>
                <ul className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
                  <li>• Your template is saved per-salesperson in the database</li>
                  <li>• When a follow-up email is triggered for your lead, this template is rendered with their details</li>
                  <li>• The reply-to is set to your email so visitor replies land in your inbox</li>
                  <li>• Default template is used if you have not saved a custom one</li>
                </ul>
              </div>

              {/* HTML Preview iframe */}
              {showPreview && (
                <div className="rounded-2xl border border-slate-700 overflow-hidden bg-white">
                  <div className="bg-slate-800 px-3 py-2 flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-400 ml-2">Email Preview</span>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full"
                    style={{ height: '500px', border: 'none' }}
                    title="Email preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
