'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Visitor, CommunicationLog, CommunicationPreference, Profile, FollowUpJob, EmailReply } from '@/types/database';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowLeft, Mail, Phone, MessageSquare, ShieldCheck, ShieldOff,
  Clock, CheckCircle2, XCircle, RefreshCw, Send, User, Calendar,
  AlertCircle, Info, Zap, FileText, Reply, Settings2,
  Hash
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

type VisitorDetail = {
  visitor: Visitor;
  preference: CommunicationPreference | { opted_out: boolean; opt_out_timestamp?: string | null };
  logs: CommunicationLog[];
  jobs: FollowUpJob[];
  salesperson?: Profile;
};

export default function VisitorDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const visitorId = params.id;
  const { user } = useAuth();

  const [detail, setDetail] = useState<VisitorDetail | null>(null);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingConsent, setIsTogglingConsent] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [isSavingFollowUpCount, setIsSavingFollowUpCount] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [localMaxFollowUps, setLocalMaxFollowUps] = useState<number>(3);

  // Suppress unused warning — user is available for future permission checks
  void user;

  const loadDetail = useCallback(async () => {
    if (!visitorId) return;
    setIsLoading(true);
    setDetail(null);
    try {
      const res  = await fetch(`/api/visitors/${visitorId}`);
      const json = await res.json();
      if (!res.ok || !json.visitor) {
        setDetail(null);
        setIsLoading(false);
        return;
      }
      setDetail({
        visitor:     json.visitor,
        preference:  json.preference,
        logs:        json.logs   ?? [],
        jobs:        json.jobs   ?? [],
        salesperson: json.salesperson,
      });
      setReplies(json.replies ?? []);
      setLocalMaxFollowUps(json.visitor.max_follow_ups ?? json.salesperson?.max_follow_ups ?? 3);
    } catch {
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }, [visitorId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleToggleConsent = async () => {
    if (!detail) return;
    setIsTogglingConsent(true);
    const newOptOut = !detail.preference.opted_out;
    await fetch(`/api/visitors/${visitorId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ opted_out: newOptOut }),
    });
    await loadDetail();
    setIsTogglingConsent(false);
    setSuccessMsg(`Consent updated to ${newOptOut ? 'Opted Out' : 'Subscribed'}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveFollowUpCount = async () => {
    if (!detail) return;
    setIsSavingFollowUpCount(true);
    await fetch(`/api/visitors/${visitorId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ max_follow_ups: localMaxFollowUps }),
    });
    await loadDetail();
    setIsSavingFollowUpCount(false);
    setSuccessMsg(`Follow-up limit updated to ${localMaxFollowUps} emails.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetToGlobal = async () => {
    if (!detail) return;
    setIsSavingFollowUpCount(true);
    await fetch(`/api/visitors/${visitorId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ max_follow_ups: null }),
    });
    await loadDetail();
    setIsSavingFollowUpCount(false);
    setSuccessMsg(`Follow-up limit reset to global default.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRunWorker = async () => {
    setIsRunningWorker(true);
    try {
      const res  = await fetch('/api/jobs/process', { method: 'POST' });
      const data = await res.json();
      await loadDetail();
      setSuccessMsg(`Follow-up worker ran — ${data.processed || 0} job(s) processed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      alert('Worker trigger failed.');
    } finally {
      setIsRunningWorker(false);
    }
  };



  const logStatusColor = (status: string) => {
    if (status === 'SENT' || status === 'MOCK_SENT') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'SKIPPED_OPT_OUT') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (status === 'FAILED') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-slate-700/50 text-slate-300 border-slate-700';
  };

  const logStatusIcon = (status: string) => {
    if (status === 'SENT' || status === 'MOCK_SENT') return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === 'SKIPPED_OPT_OUT') return <ShieldOff className="w-3.5 h-3.5" />;
    if (status === 'FAILED') return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
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

  if (!detail) {
    return (
      <DashboardShell>
        <div className="text-center py-20 text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">Visitor not found.</p>
          <button onClick={() => router.push('/sales/visitors')} className="mt-4 text-xs text-sky-400 hover:underline">
            ← Back to visitors
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { visitor, preference, logs, jobs, salesperson } = detail;
  const isOptedOut = preference.opted_out;
  const maxFollowUps = visitor.max_follow_ups ?? salesperson?.max_follow_ups ?? 3;
  const followUpsSent = visitor.follow_ups_sent ?? 0;
  const emailLogs = logs.filter(l => l.channel === 'EMAIL');

  return (
    <DashboardShell>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/sales/visitors')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Visitors & Leads
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-lg">
                {visitor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{visitor.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold border border-sky-500/30 mt-1">
                  {visitor.inquiry_type}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRunWorker}
            disabled={isRunningWorker}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white text-xs font-semibold border border-slate-800 transition disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isRunningWorker ? 'animate-pulse text-amber-400' : ''}`} />
            {isRunningWorker ? 'Running Worker...' : 'Send Follow-up Now'}
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            {successMsg}
          </div>
        )}

        {/* ── VISITOR INFO GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
            <a href={`mailto:${visitor.email}`} className="text-sm font-semibold text-white hover:text-sky-400 transition break-all">{visitor.email}</a>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> WhatsApp / Phone</span>
            <a href={`tel:${visitor.phone}`} className="text-sm font-semibold text-white hover:text-sky-400 transition">{visitor.phone}</a>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assigned Sales Rep</span>
            <p className="text-sm font-semibold text-sky-400">{salesperson?.full_name || '—'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Registered On</span>
            <p className="text-sm font-semibold text-white">{new Date(visitor.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Emails Sent</span>
            <p className="text-sm font-semibold text-white">{followUpsSent} / {maxFollowUps}</p>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all" style={{ width: `${Math.min(100, (followUpsSent / maxFollowUps) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Reply className="w-3.5 h-3.5" /> Replies Received</span>
            <p className="text-sm font-semibold text-white">{replies.length} reply{replies.length !== 1 ? '' : ''}</p>
          </div>
        </div>

        {/* ── TOUR NOTES ── */}
        {visitor.notes && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" /> Tour Notes</h3>
            <p className="text-sm text-slate-200 leading-relaxed">{visitor.notes}</p>
          </div>
        )}

        {/* ── FOLLOW-UP COUNT CONTROL ── */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-sky-400" />
              Follow-up Schedule Control
            </h3>
            <span className="text-[10px] text-slate-500">Max 10 follow-ups allowed</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-2">
                Number of follow-up emails to send this lead:
                {visitor.max_follow_ups === null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400 text-[10px] font-bold">
                    Inherited global default ({salesperson?.max_follow_ups ?? 3})
                  </span>
                )}
              </span>
              <span className="font-bold text-white text-base w-8 text-center">{localMaxFollowUps}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={localMaxFollowUps}
              onChange={e => setLocalMaxFollowUps(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-sky-500"
              style={{ background: `linear-gradient(to right, #0ea5e9 ${(localMaxFollowUps - 1) / 9 * 100}%, #1e293b ${(localMaxFollowUps - 1) / 9 * 100}%)` }}
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <span key={n} className={n === localMaxFollowUps ? 'text-sky-400 font-bold' : ''}>{n}</span>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-500">
                {followUpsSent} sent so far · {Math.max(0, localMaxFollowUps - followUpsSent)} remaining
                {localMaxFollowUps <= followUpsSent && (
                  <span className="ml-2 text-amber-400 font-semibold">⚠ Already at or above limit</span>
                )}
              </p>
              <div className="flex gap-2">
                {visitor.max_follow_ups !== null && (
                  <button
                    onClick={handleResetToGlobal}
                    disabled={isSavingFollowUpCount}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition disabled:opacity-40"
                  >
                    Reset to Global
                  </button>
                )}
                <button
                  onClick={handleSaveFollowUpCount}
                  disabled={isSavingFollowUpCount || localMaxFollowUps === visitor.max_follow_ups}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white text-xs font-bold border border-sky-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingFollowUpCount ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Limit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONSENT MANAGEMENT ── */}
        <div className={`p-5 rounded-2xl border-2 ${isOptedOut ? 'bg-red-950/20 border-red-500/40' : 'bg-emerald-950/20 border-emerald-500/40'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${isOptedOut ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isOptedOut ? <ShieldOff className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Visitor Consent: {isOptedOut ? 'Opted Out' : 'Subscribed'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isOptedOut ? 'No further emails or messages will be sent to this visitor.' : 'This visitor has consented to receive follow-up emails and property updates.'}
                </p>
                {'opt_out_timestamp' in preference && preference.opt_out_timestamp && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Opted out: {new Date(preference.opt_out_timestamp).toLocaleString()}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleToggleConsent}
              disabled={isTogglingConsent}
              className={`flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50 ${isOptedOut ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40' : 'bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40'}`}
            >
              {isTogglingConsent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isOptedOut ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
              {isOptedOut ? 'Re-enable Consent' : 'Set Opt-Out'}
            </button>
          </div>
        </div>

        {/* ── COMMUNICATION LOGS + REPLIES (INTERLEAVED) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-400" />
              Communication Timeline
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">{emailLogs.length} sent · {replies.length} replies</span>
            </h2>
            <button onClick={loadDetail} className="text-xs text-slate-500 hover:text-sky-400 flex items-center gap-1 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {emailLogs.length === 0 && replies.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No communications yet</p>
              <p className="text-xs text-slate-500">Click "Send Follow-up Now" to dispatch the first email to this visitor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Build interleaved timeline of sent emails + replies */}
              {buildTimeline(emailLogs, replies).map((item, idx) => {
                if (item.type === 'sent') {
                  const log = item.data as CommunicationLog;
                  const followUpMatch = log.content_summary?.match(/\[Follow-up #(\d+)\]/);
                  const followUpNum = followUpMatch ? Number(followUpMatch[1]) : null;
                  return (
                    <div key={log.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {followUpNum && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold">
                              <Hash className="w-3 h-3" />Follow-up {followUpNum}
                            </span>
                          )}
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${log.channel === 'EMAIL' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                            {log.channel === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            {log.channel}
                          </span>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${logStatusColor(log.status)}`}>
                            {logStatusIcon(log.status)}
                            {log.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-slate-600 font-medium">To:</span>
                        <span className="text-slate-200 font-medium">{log.recipient}</span>
                      </div>
                      {log.content_summary && (
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Message Preview</p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {log.content_summary.replace(/^\[Follow-up #\d+\]\s*/, '')}
                          </p>
                        </div>
                      )}
                      {log.error_message && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-none mt-0.5" />
                          <p className="text-[11px] text-red-300 font-mono">{log.error_message}</p>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Email reply from visitor
                  const reply = item.data as EmailReply;
                  return (
                    <div key={reply.id} className="ml-6 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 relative">
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-px bg-emerald-500/30" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            <Reply className="w-3 h-3" />
                            Visitor Reply
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(reply.received_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-slate-600 font-medium">From:</span>
                        <span className="text-emerald-300 font-semibold">{reply.from_name || visitor.name} &lt;{reply.from_email}&gt;</span>
                      </div>
                      {reply.subject && (
                        <p className="text-[11px] text-slate-400"><span className="text-slate-600">Subject:</span> {reply.subject}</p>
                      )}
                      {reply.body_text && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                          <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap">{reply.body_text}</p>
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* ── FOLLOW-UP JOB TIMELINE ── */}
        {jobs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Follow-up Job Queue
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">{jobs.length}</span>
            </h2>
            <div className="space-y-2">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-none ${job.status === 'COMPLETED' ? 'bg-emerald-400' : job.status === 'FAILED' ? 'bg-red-400' : job.status === 'PROCESSING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                    <div>
                      <span className="font-semibold text-white capitalize">{job.status.toLowerCase()}</span>
                      <span className="text-slate-500 ml-2">
                        · Follow-up #{job.follow_up_number ?? 1} · {job.attempts} attempt{job.attempts !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-mono">Scheduled: {new Date(job.scheduled_for).toLocaleString()}</p>
                    {job.error && <p className="text-[10px] text-red-400 font-mono mt-0.5 max-w-xs truncate">{job.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

/** Merges email logs and replies into a chronological timeline */
function buildTimeline(
  logs: CommunicationLog[],
  replies: EmailReply[]
): { type: 'sent' | 'reply'; data: CommunicationLog | EmailReply; time: Date }[] {
  const emailLogs = logs.filter(l => l.channel === 'EMAIL');
  const items = [
    ...emailLogs.map(l => ({ type: 'sent' as const, data: l, time: new Date(l.sent_at) })),
    ...replies.map(r => ({ type: 'reply' as const, data: r, time: new Date(r.received_at) })),
  ];
  return items.sort((a, b) => a.time.getTime() - b.time.getTime());
}
