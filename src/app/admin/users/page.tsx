'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Profile, UserRole } from '@/types/database';
import {
  Users, UserPlus, Search, CheckCircle2, Lock,
  Trash2, AlertCircle, ShieldCheck, BadgeCheck, Monitor
} from 'lucide-react';

const ROLE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ADMIN:      { label: 'Admin',      color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',         icon: <ShieldCheck className="w-3 h-3" /> },
  SALES:      { label: 'Sales',      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <BadgeCheck className="w-3 h-3" /> },
  FRONT_DESK: { label: 'Front Desk', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',  icon: <Monitor className="w-3 h-3" /> },
};

export default function AdminUsersPage() {
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState<string>('ALL');

  // Create form
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [role, setRole]         = useState<UserRole>('SALES');
  const [isCreating, setIsCreating] = useState(false);

  // Feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccessMsg(msg); setErrorMsg(''); }
    else                    { setErrorMsg(msg);   setSuccessMsg(''); }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
  };

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch('/api/admin/users');
      const json = await res.json();
      setProfiles(json.data ?? []);
    } catch {
      flash('error', 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setIsCreating(true);
    try {
      const res  = await fetch('/api/admin/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: fullName.trim(), email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) { flash('error', json.error ?? 'Failed to create user.'); return; }
      setFullName('');
      setEmail('');
      flash('success', `✓ ${json.data.full_name} (${json.data.role}) created. Initial password: "Pikashoot123!" — must change on first login.`);
      await loadProfiles();
    } catch {
      flash('error', 'Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res  = await fetch('/api/admin/users', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, is_active: !currentActive }),
      });
      if (!res.ok) { flash('error', 'Failed to update user status.'); return; }
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    } catch {
      flash('error', 'Network error.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) { flash('error', 'Failed to delete user.'); return; }
      setProfiles(prev => prev.filter(p => p.id !== id));
      flash('success', 'User deleted successfully.');
    } catch {
      flash('error', 'Network error.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole   = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">System User Management</h1>
          <p className="text-xs text-slate-400 mt-1">Provision and manage Admin, Sales, and Front Desk accounts. Roles are fixed at creation.</p>
        </div>

        {/* Feedback banners */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-none" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── CREATE USER FORM ── */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <UserPlus className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Provision New User</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Jessica Williams"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jessica@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none"
                >
                  <option value="SALES">Sales Exec — Visitor Registration &amp; Leads</option>
                  <option value="FRONT_DESK">Front Desk — Kiosk &amp; Check-in</option>
                  <option value="ADMIN">System Admin — Full Control</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5">Role is permanent and cannot be changed after creation.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-sky-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Initial Password Policy
                </div>
                <p>Default: <code className="text-white">Pikashoot123!</code></p>
                <p className="text-[10px] text-slate-500">User must change password on first login.</p>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition"
              >
                {isCreating ? 'Creating…' : 'Provision User Account'}
              </button>
            </form>
          </div>

          {/* ── USER LIST ── */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">System Users ({profiles.length})</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name/email…"
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SALES">Sales</option>
                  <option value="FRONT_DESK">Front Desk</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-slate-500 text-xs">Loading users…</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-500 text-xs">No users found.</div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((p) => {
                  const meta = ROLE_META[p.role] ?? ROLE_META.SALES;
                  const isConfirmingDelete = deleteConfirmId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* User info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center border border-sky-500/30 text-sm flex-none">
                          {p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white">{p.full_name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
                              {meta.icon}{meta.label}
                            </span>
                            {!p.is_active && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Disabled
                              </span>
                            )}
                            {p.must_change_password && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Pw Reset Required
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] font-mono mt-0.5">{p.email}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-none">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleActive(p.id, p.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                            p.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Disabled'}
                        </button>

                        {/* Delete */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
