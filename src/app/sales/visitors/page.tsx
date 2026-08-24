'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Visitor, CommunicationLog, CommunicationPreference, Profile } from '@/types/database';
import { useAuth } from '@/lib/auth/context';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Send, 
  Ban, 
  CheckCircle2, 
  Clock, 
  X, 
  ShieldCheck,
  RefreshCw,
  MessageSquare
} from 'lucide-react';

export default function VisitorManagementPage() {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selected detail drawer state
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{
    visitor: Visitor;
    preference: CommunicationPreference | { opted_out: boolean };
    logs: CommunicationLog[];
    salesperson?: Profile;
  } | null>(null);

  const [isProcessingWorker, setIsProcessingWorker] = useState(false);

  const loadVisitors = async () => {
    if (!user) return;
    // Sales users see their own assigned leads, Admins see all
    const list = await mockDb.getVisitors(user.role === 'SALES' ? user.id : undefined);
    setVisitors(list);
  };

  useEffect(() => {
    loadVisitors();
  }, [user]);

  const handleSelectVisitor = async (id: string) => {
    setSelectedVisitorId(id);
    const detail = await mockDb.getVisitorDetail(id);
    if (detail && detail.visitor) {
      setSelectedDetail(detail);
    }
  };

  const handleToggleOptOut = async (visitorId: string, currentOptOut: boolean) => {
    await mockDb.toggleOptOut(visitorId, !currentOptOut);
    handleSelectVisitor(visitorId);
  };

  const triggerFollowUpWorker = async () => {
    setIsProcessingWorker(true);
    try {
      await fetch('/api/jobs/process', { method: 'POST' });
      await loadVisitors();
      if (selectedVisitorId) {
        await handleSelectVisitor(selectedVisitorId);
      }
    } catch {
      alert('Failed to process worker.');
    } finally {
      setIsProcessingWorker(false);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.phone.includes(q);
    return matchesSearch;
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Visitor & Lead Management</h1>
            <p className="text-xs text-slate-400 mt-1">Review visitor ownership, inquiry history, opt-out preferences, and communication logs.</p>
          </div>

          <button
            onClick={triggerFollowUpWorker}
            disabled={isProcessingWorker}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white text-xs font-semibold border border-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessingWorker ? 'animate-spin' : ''}`} />
            Run Scheduled Follow-up Worker
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor name, email, or mobile number..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Showing {filteredVisitors.length} of {visitors.length} leads</span>
          </div>
        </div>

        {/* RESPONSIVE VISITOR LIST (CARDS ON MOBILE, TABLE ON DESKTOP) */}
        <div className="space-y-3">
          {filteredVisitors.map((v) => (
            <div
              key={v.id}
              onClick={() => handleSelectVisitor(v.id)}
              className={`p-5 rounded-3xl border backdrop-blur-xl transition-all cursor-pointer ${
                selectedVisitorId === v.id
                  ? 'bg-sky-950/20 border-sky-500/50 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{v.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-semibold border border-sky-500/30">
                      {v.inquiry_type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" />{v.email}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" />{v.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                  <button className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-sky-400 text-xs font-semibold border border-slate-800 transition">
                    View Logs & Consent
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* VISITOR DETAIL MODAL DRAWER */}
        {selectedDetail && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end p-2 sm:p-4">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-y-auto space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedDetail.visitor.name}</h2>
                  <p className="text-xs text-sky-400 font-medium">{selectedDetail.visitor.inquiry_type}</p>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visitor Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Email Address</span>
                  <span className="font-semibold text-white">{selectedDetail.visitor.email}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">WhatsApp Phone</span>
                  <span className="font-semibold text-white">{selectedDetail.visitor.phone}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Assigned Sales Rep</span>
                  <span className="font-semibold text-sky-400">{selectedDetail.salesperson?.full_name || 'Assigned Rep'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Opt-out / Consent</span>
                  <span className={`font-semibold ${selectedDetail.preference.opted_out ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedDetail.preference.opted_out ? 'OPTED OUT' : 'SUBSCRIBED'}
                  </span>
                </div>
              </div>

              {/* Opt-out Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-white block">Visitor Consent State</span>
                  <span className="text-[11px] text-slate-400">Respect marketing consent requirement</span>
                </div>
                <button
                  onClick={() => handleToggleOptOut(selectedDetail.visitor.id, selectedDetail.preference.opted_out)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    selectedDetail.preference.opted_out
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {selectedDetail.preference.opted_out ? 'Re-enable Consent' : 'Set Opt-Out'}
                </button>
              </div>

              {/* Notes */}
              {selectedDetail.visitor.notes && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Tour Notes
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">{selectedDetail.visitor.notes}</p>
                </div>
              )}

              {/* Communication Logs */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Communication Logs ({selectedDetail.logs.length})</h3>
                <div className="space-y-2">
                  {selectedDetail.logs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950">No delivery logs recorded yet. Run scheduled follow-up worker to send.</p>
                  ) : (
                    selectedDetail.logs.map((log) => (
                      <div key={log.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-400">{log.channel}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SENT' || log.status === 'MOCK_SENT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.status === 'SKIPPED_OPT_OUT'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{log.content_summary}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">{new Date(log.sent_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
