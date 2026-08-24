'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@luxestate.com');
  const [password, setPassword] = useState('Pikashoot123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Authentication failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
              <Building2 className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">LuxeEstate 3D Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to access builder dashboards & 3D tour management</p>
        </div>

        {/* Card Form */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@luxestate.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white text-xs font-medium focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white text-xs font-medium focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Evaluator Helper Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold mb-2 block">Quick Evaluator Fill:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@luxestate.com');
                  setPassword('Pikashoot123!');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-left transition"
              >
                <div className="text-sky-400 font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Fill Admin
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">admin@luxestate.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('sales@luxestate.com');
                  setPassword('Pikashoot123!');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-left transition"
              >
                <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Fill Sales
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">sales@luxestate.com</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Initial Temporary Password: <code className="text-slate-400">Pikashoot123!</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
