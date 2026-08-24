'use client';

import React, { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Profile, Model3D, Hotspot, Visitor, Inquiry } from '@/types/database';
import { 
  Users, 
  Box, 
  MapPin, 
  UserCheck, 
  Compass, 
  ArrowUpRight, 
  ShieldCheck, 
  Activity,
  Send,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [models, setModels] = useState<Model3D[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [activeModel, setActiveModel] = useState<Model3D | null>(null);

  useEffect(() => {
    mockDb.getProfiles().then(setProfiles);
    mockDb.getModels().then(setModels);
    mockDb.getActiveModel().then((res) => {
      if (res) {
        setActiveModel(res.model);
        setHotspots(res.hotspots);
      }
    });
    mockDb.getVisitors().then(setVisitors);
  }, []);

  const adminCount = profiles.filter((p) => p.role === 'ADMIN').length;
  const salesCount = profiles.filter((p) => p.role === 'SALES').length;

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Executive Admin Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">System-wide operational KPIs, 3D model status, and sales metrics.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/models"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-800 transition"
            >
              <Box className="w-4 h-4 text-sky-400" />
              Manage 3D Models
            </Link>
            <Link
              href="/walkthrough"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
            >
              <Compass className="w-4 h-4" />
              Open 3D Viewport
            </Link>
          </div>
        </div>

        {/* KPI CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total System Users</span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{profiles.length}</div>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-medium">{adminCount} Admins</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">{salesCount} Sales</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Active 3D Model</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-base font-bold text-white truncate">{activeModel?.title || 'No Model Active'}</div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {models.length} Models Uploaded
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Active Spatial Hotspots</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{hotspots.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Configured Tour Points</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Registered Visitors</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white">{visitors.length}</div>
              <div className="text-[11px] text-purple-400 font-medium mt-1">Sales Leads Captured</div>
            </div>
          </div>
        </div>

        {/* RECENT MODELS & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Models Overview Table */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">3D Project Models</h2>
              </div>
              <Link href="/admin/models" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60">
              {models.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-semibold text-white">{m.title}</h3>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">{m.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      m.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.is_active ? 'ACTIVE PUBLIC' : 'DRAFT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Admin Actions Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Activity className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Quick Administration</h2>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/admin/hotspots"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>3D Hotspot Spatial Editor</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>

              <Link
                href="/admin/users"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Create / Edit Team Accounts</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>

              <Link
                href="/sales/visitors"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Review Communication Logs</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
