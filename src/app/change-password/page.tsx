'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword === 'Pikashoot123!') {
      setError('Please choose a password different from the temporary default password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await changePassword(newPassword);
    if (!success) {
      setError('Failed to update password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-4 backdrop-blur-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Security Action Required</h1>
          <p className="text-xs text-slate-400 mt-1">First-time login detected for <span className="text-white font-medium">{user?.email}</span>. Please set a permanent password.</p>
        </div>

        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white text-xs font-medium focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white text-xs font-medium focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password & Access Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-sky-400 flex-none" />
            <span>Passwords are hashed securely and never saved in plaintext.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
