'use client';

import React, { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Visitor, CommunicationLog, FollowUpJob } from '@/types/database';
import { useAuth } from '@/lib/auth/context';
import { 
  Users, 
  UserPlus, 
  Send, 
  Clock, 
  Compass, 
  ArrowUpRight, 
  CheckCircle2,
  Ban
} from 'lucide-react';
import Link from 'next/link';

export default function SalesDashboardPage() {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [jobs, setJobs] = useState<FollowUpJob[]>([]);

  useEffect(() => {
    if (user) {
      mockDb.getVisitors(user.role === 'SALES' ? user.id : undefined).then(setVisitors);
      mockDb.getCommLogs().then(setCommLogs);
    }
  }, [user]);

  const sentCount = commLogs.filter((l) => l.status === 'SENT' || l.status === 'MOCK_SENT').length;
  const skippedCount = commLogs.filter((l) => l.status === 'SKIPPED_OPT_OUT').length;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Executive Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">Track assigned property inquiries, registered visitors, and automated follow-up delivery.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sales/inquiry/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Register New Visitor
            </Link>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">My Registered Leads</span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{visitors.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Assigned Property Visitors</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Automated Follow-ups Sent</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Send className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{sentCount}</div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Email & WhatsApp Sent
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Scheduled 1-Min Queue</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">0</div>
              <div className="text-[11px] text-slate-400 mt-1">Active Follow-up Queue</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Visitor Opt-outs</span>
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <Ban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{skippedCount}</div>
              <div className="text-[11px] text-red-400 font-medium mt-1">Consent Preferences Respected</div>
            </div>
          </div>
        </div>

        {/* RECENT VISITORS TABLE & QUICK LINKS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white">My Recent Property Visitors</h2>
              <Link href="/sales/visitors" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                View All Leads <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60">
              {visitors.map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-semibold text-white">{v.name}</h3>
                    <p className="text-[11px] text-sky-400 font-medium mt-0.5">{v.inquiry_type}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{v.email} • {v.phone}</p>
                  </div>
                  <Link
                    href={`/sales/visitors?visitor=${v.id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium transition"
                  >
                    View Log
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-4">Sales Tools & Shortcuts</h2>
            <div className="space-y-3">
              <Link
                href="/sales/inquiry/new"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-xs font-semibold text-sky-300 hover:bg-sky-500 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Register Visitor In-Person</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <Link
                href="/walkthrough"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-700 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-sky-400" />
                  <span>Open 3D Property Walkthrough</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
