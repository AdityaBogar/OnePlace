'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Visitor } from '@/types/database';
import { useAuth } from '@/lib/auth/context';
import {
  Users, Search, Mail, Phone, RefreshCw, ExternalLink, ChevronRight, UserPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VisitorManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingWorker, setIsProcessingWorker] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadVisitors = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let salespersonId: string | null = null;

      if (user.role === 'SALES') {
        // Resolve real Supabase UUID by email (user.id may be a mock ID)
        const profileRes = await fetch('/api/admin/users');
        const profileJson = await profileRes.json();
        const profiles: { id: string; email: string }[] = profileJson.data ?? [];
        const match = profiles.find(p => p.email.toLowerCase() === user.email.toLowerCase());
        salespersonId = match?.id ?? user.id;
      }

      const url = salespersonId
        ? `/api/visitors?salespersonId=${encodeURIComponent(salespersonId)}`
        : '/api/visitors';

      const res  = await fetch(url);
      const json = await res.json();
      setVisitors(json.data ?? []);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Failed to load visitors:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const triggerFollowUpWorker = async () => {
    setIsProcessingWorker(true);
    try {
      const res = await fetch('/api/jobs/process', { method: 'POST' });
      const data = await res.json();
      await loadVisitors();
      alert(`Worker completed. Processed ${data.processed || 0} job(s).`);
    } catch {
      alert('Failed to trigger worker.');
    } finally {
      setIsProcessingWorker(false);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.inquiry_type.toLowerCase().includes(q)
    );
  });

  const inquiryColors: Record<string, string> = {
    'Master Suite': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'Penthouse': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Kitchen': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Financing': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Bulk': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  const getInquiryColor = (type: string) => {
    const key = Object.keys(inquiryColors).find(k => type.includes(k));
    return key ? inquiryColors[key] : 'bg-slate-700/50 text-slate-300 border-slate-700';
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Visitor & Lead Management</h1>
            <p className="text-xs text-slate-400 mt-1">
              {user?.role === 'ADMIN'
                ? 'All registered visitors and leads across all sales representatives.'
                : 'Your assigned leads — click any visitor to view communication logs and consent settings.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sales/inquiry/new"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
            >
              <UserPlus className="w-4 h-4" /> New Lead
            </Link>
            <button
              onClick={triggerFollowUpWorker}
              disabled={isProcessingWorker}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white text-xs font-semibold border border-slate-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessingWorker ? 'animate-spin' : ''}`} />
              {isProcessingWorker ? 'Running...' : 'Run Follow-up Worker'}
            </button>
          </div>
        </div>

        {/* ── SEARCH & STATS ── */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or inquiry type..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              Showing <strong className="text-white">{filteredVisitors.length}</strong> of <strong className="text-white">{visitors.length}</strong> leads
            </span>
            <button
              onClick={loadVisitors}
              className="flex items-center gap-1 text-slate-500 hover:text-sky-400 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : `Refreshed ${lastRefreshed.toLocaleTimeString()}`}
            </button>
          </div>
        </div>

        {/* ── VISITORS LIST ── */}
        {isLoading && visitors.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading visitors from database...</p>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">
              {search ? 'No visitors match your search.' : 'No leads yet.'}
            </p>
            {!search && (
              <p className="text-xs text-slate-500">
                Register a new inquiry using the <strong className="text-slate-300">New Lead</strong> button or the Front Desk kiosk.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVisitors.map((v) => (
              <Link
                key={v.id}
                href={`/sales/visitors/${v.id}`}
                className="group block p-5 rounded-3xl border backdrop-blur-xl transition-all bg-slate-900/80 border-slate-800/80 hover:border-sky-500/50 hover:bg-sky-950/10 hover:shadow-lg hover:shadow-sky-500/5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/30 to-blue-600/30 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm flex-none">
                      {v.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                          {v.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getInquiryColor(v.inquiry_type)}`}>
                          {v.inquiry_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-600" />
                          {v.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          {v.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center flex-none">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(v.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 group-hover:bg-sky-500 text-sky-400 group-hover:text-white text-xs font-semibold border border-slate-800 group-hover:border-sky-400 transition">
                      View Logs & Consent <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
