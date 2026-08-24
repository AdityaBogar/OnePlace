'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  LayoutDashboard, 
  Box, 
  MapPin, 
  Users, 
  UserPlus, 
  LogOut, 
  Compass, 
  Menu, 
  X, 
  ShieldCheck, 
  BadgeCheck,
  UserCheck,
  Mail
} from 'lucide-react';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout, setUserRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  const adminNav = [
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: '3D Walkthrough', href: '/walkthrough', icon: Compass },
    { name: '3D Models Manager', href: '/admin/models', icon: Box },
    { name: 'Hotspots Editor', href: '/admin/hotspots', icon: MapPin },
    { name: 'User Management', href: '/admin/users', icon: Users },
  ];

  const salesNav = [
    { name: 'Sales Dashboard', href: '/sales/dashboard', icon: LayoutDashboard },
    { name: '3D Walkthrough', href: '/walkthrough', icon: Compass },
    { name: 'New Inquiry Registration', href: '/sales/inquiry/new', icon: UserPlus },
    { name: 'My Visitors & Leads', href: '/sales/visitors', icon: UserCheck },
    { name: 'Email Template Settings', href: '/sales/email-settings', icon: Mail },
  ];

  const navItems = isAdmin ? adminNav : salesNav;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">OnePlace</h1>
            <span className="text-[10px] text-sky-400 font-medium capitalize">{user.role} Portal</span>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">OnePlace</h1>
              <p className="text-[11px] text-slate-400 font-medium">Real Estate Showcase</p>
            </div>
          </div>

          {/* User Profile Badge */}
          <div className="p-4 mx-3 my-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/30">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
              <div className="flex items-center gap-1 text-[10px] text-sky-400 font-medium">
                {isAdmin ? <ShieldCheck className="w-3 h-3 text-sky-400" /> : <BadgeCheck className="w-3 h-3 text-emerald-400" />}
                <span>{user.role} Account</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & Role Switcher */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {/* Quick Role Switcher for Dev Demo Testing */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5">
            <span className="text-slate-400 font-medium block">Role View Demo:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setUserRole('ADMIN');
                  router.push('/admin/dashboard');
                }}
                className={`py-1 rounded-lg font-bold text-[10px] transition ${
                  isAdmin ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ADMIN
              </button>
              <button
                onClick={() => {
                  setUserRole('SALES');
                  router.push('/sales/dashboard');
                }}
                className={`py-1 rounded-lg font-bold text-[10px] transition ${
                  !isAdmin ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                SALES
              </button>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-semibold border border-slate-700/60 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
