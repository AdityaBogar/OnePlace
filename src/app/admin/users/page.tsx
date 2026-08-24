'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { Users, UserPlus, Search, ShieldCheck, BadgeCheck, CheckCircle2, Lock } from 'lucide-react';

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // New user form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('SALES');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    mockDb.getProfiles().then(setProfiles);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const newProfile = await mockDb.createProfile({
      full_name: fullName,
      email,
      role,
    });

    const updated = await mockDb.getProfiles();
    setProfiles(updated);
    setFullName('');
    setEmail('');
    setSuccessMsg(`User ${newProfile.full_name} (${newProfile.role}) created with initial password "Pikashoot123!". Password change required on first login.`);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await mockDb.updateProfile(id, { is_active: !currentActive });
    const updated = await mockDb.getProfiles();
    setProfiles(updated);
  };

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    await mockDb.updateProfile(id, { role: newRole });
    const updated = await mockDb.getProfiles();
    setProfiles(updated);
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">System User & Role Management</h1>
          <p className="text-xs text-slate-400 mt-1">Manage Admin and Sales team accounts, role permissions, and first-login password enforcement.</p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CREATE USER FORM */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <UserPlus className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Create New Team User</h2>
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
                  placeholder="jessica@luxestate.com"
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
                  <option value="SALES">Sales Exec (Visitor Registration & Leads)</option>
                  <option value="ADMIN">System Admin (Full 3D & User Control)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-sky-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Initial Password Policy:
                </div>
                <p>Default Password: <code className="text-white">Pikashoot123!</code></p>
                <p className="text-[10px] text-slate-500">Account is flagged with mandatory password change on first login.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition"
              >
                Provision User Account
              </button>
            </form>
          </div>

          {/* USER REPOSITORY TABLE */}
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
                    placeholder="Search name/email..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin Only</option>
                  <option value="SALES">Sales Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center border border-sky-500/30">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{p.full_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.role === 'ADMIN' ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {p.role}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">{p.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                    >
                      <option value="SALES">Sales Role</option>
                      <option value="ADMIN">Admin Role</option>
                    </select>

                    <button
                      onClick={() => handleToggleActive(p.id, p.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                        p.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-emerald-500/20 hover:text-emerald-400'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
