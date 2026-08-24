'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Visitor, CommunicationLog, CommunicationPreference, Profile, FollowUpJob } from '@/types/database';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowLeft, Mail, Phone, MessageSquare, ShieldCheck, ShieldOff,
  Clock, CheckCircle2, XCircle, RefreshCw, Send, User, Calendar,
  AlertCircle, Info, Zap, FileText
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
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingConsent, setIsTogglingConsent] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadDetail = async () => {
    if (!visitorId) return;
    const data = await mockDb.getVisitorDetail(visitorId);
    if (data) {
      setDetail(data as VisitorDetail);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDetail();
  }, [visitorId]);

  const handleToggleConsent = async () => {
    if (!detail) return;
    setIsTogglingConsent(true);
    await mockDb.toggleOptOut(detail.visitor.id, !detail.preference.opted_out);
    await loadDetail();
    setIsTogglingConsent(false);
    setSuccessMsg(`Consent updated to ${detail.preference.opted_out ? 'Subscribed' : 'Opted Out'}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRunWorker = async () => {
    setIsRunningWorker(true);
    try {
      await fetch('/api/jobs/process', { method: 'POST' });
      await loadDetail();
      setSuccessMsg('Follow-up worker ran — communication logs updated.');
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

  return (
    <DashboardShell>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* ── BREADCRUMB & HEADER ── */}
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
            {isRunningWorker ? 'Running Worker...' : 'Trigger Follow-up Worker'}
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
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </span>
            <a href={`mailto:${visitor.email}`} className="text-sm font-semibold text-white hover:text-sky-400 transition break-all">
              {visitor.email}
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> WhatsApp / Phone
            </span>
            <a href={`tel:${visitor.phone}`} className="text-sm font-semibold text-white hover:text-sky-400 transition">
              {visitor.phone}
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Assigned Sales Rep
            </span>
            <p className="text-sm font-semibold text-sky-400">
              {salesperson?.full_name || '—'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Registered On
            </span>
            <p className="text-sm font-semibold text-white">
              {new Date(visitor.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {new Date(visitor.created_at).toLocaleTimeString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Communications Sent
            </span>
            <p className="text-sm font-semibold text-white">{logs.length} message{logs.length !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-slate-500">
              {logs.filter(l => l.status === 'SENT' || l.status === 'MOCK_SENT').length} delivered
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Follow-up Jobs
            </span>
            <p className="text-sm font-semibold text-white">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-slate-500">
              {jobs.filter(j => j.status === 'COMPLETED').length} completed
            </p>
          </div>
        </div>

        {/* ── TOUR NOTES ── */}
        {visitor.notes && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" /> Tour Notes
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">{visitor.notes}</p>
          </div>
        )}

        {/* ── CONSENT MANAGEMENT ── */}
        <div className={`p-5 rounded-2xl border-2 ${isOptedOut ? 'bg-red-950/20 border-red-500/40' : 'bg-emerald-950/20 border-emerald-500/40'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${isOptedOut ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isOptedOut ? <ShieldOff className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Visitor Consent: {isOptedOut ? 'Opted Out' : 'Subscribed'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isOptedOut
                    ? 'This visitor has opted out of marketing communications. No further emails or WhatsApp messages will be sent.'
                    : 'This visitor has consented to receiving follow-up emails and property updates from your team.'}
                </p>
                {'opt_out_timestamp' in preference && preference.opt_out_timestamp && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Opted out at: {new Date(preference.opt_out_timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleToggleConsent}
              disabled={isTogglingConsent}
              className={`flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50 ${
                isOptedOut
                  ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40'
                  : 'bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40'
              }`}
            >
              {isTogglingConsent ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isOptedOut ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <ShieldOff className="w-3.5 h-3.5" />
              )}
              {isOptedOut ? 'Re-enable Consent' : 'Set Opt-Out'}
            </button>
          </div>
        </div>

        {/* ── COMMUNICATION LOGS ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-400" />
              Communication Logs
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                {logs.length}
              </span>
            </h2>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No communications recorded yet</p>
              <p className="text-xs text-slate-500">Click "Trigger Follow-up Worker" above to send the follow-up email to this visitor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div
                  key={log.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
                >
                  {/* Log Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        log.channel === 'EMAIL'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-green-500/20 text-green-400 border-green-500/30'
                      }`}>
                        {log.channel === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {log.channel}
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${logStatusColor(log.status)}`}>
                        {logStatusIcon(log.status)}
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      #{idx + 1} · {new Date(log.sent_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Recipient */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-slate-600 font-medium">To:</span>
                    <span className="text-slate-200 font-medium">{log.recipient}</span>
                  </div>

                  {/* Message Content */}
                  {log.content_summary && (
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <p className="text-xs text-slate-200 font-medium mb-1 text-[10px] text-slate-500 uppercase tracking-wider">Message Preview</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{log.content_summary}</p>
                    </div>
                  )}

                  {/* Error message if failed */}
                  {log.error_message && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-none mt-0.5" />
                      <p className="text-[11px] text-red-300 leading-relaxed font-mono">{log.error_message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOLLOW-UP JOBS TIMELINE ── */}
        {jobs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Follow-up Job History
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                {jobs.length}
              </span>
            </h2>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-none ${
                      job.status === 'COMPLETED' ? 'bg-emerald-400' :
                      job.status === 'FAILED' ? 'bg-red-400' :
                      job.status === 'PROCESSING' ? 'bg-amber-400 animate-pulse' :
                      'bg-slate-500'
                    }`} />
                    <div>
                      <span className="font-semibold text-white capitalize">{job.status.toLowerCase()}</span>
                      <span className="text-slate-500 ml-2">· {job.attempts} attempt{job.attempts !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-mono">
                      Scheduled: {new Date(job.scheduled_for).toLocaleString()}
                    </p>
                    {job.error && (
                      <p className="text-[10px] text-red-400 font-mono mt-0.5 max-w-xs truncate">{job.error}</p>
                    )}
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
