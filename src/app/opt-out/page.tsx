'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockDb } from '@/lib/supabase/client';
import { ShieldCheck, CheckCircle, Building2, Ban } from 'lucide-react';
import Link from 'next/link';

function OptOutForm() {
  const searchParams = useSearchParams();
  const visitorId = searchParams.get('visitor');
  const [optedOut, setOptedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visitorName, setVisitorName] = useState('');

  useEffect(() => {
    if (visitorId) {
      mockDb.getVisitorDetail(visitorId).then((res) => {
        if (res && res.visitor) {
          setVisitorName(res.visitor.name);
          setOptedOut(res.preference.opted_out);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [visitorId]);

  const handleToggleOptOut = async (optOut: boolean) => {
    if (!visitorId) return;
    setLoading(true);
    await mockDb.toggleOptOut(visitorId, optOut);
    setOptedOut(optOut);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-xl text-center">
      <div className="w-14 h-14 rounded-3xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mx-auto mb-4">
        {optedOut ? <Ban className="w-7 h-7 text-amber-400" /> : <ShieldCheck className="w-7 h-7" />}
      </div>

      <h1 className="text-xl font-bold text-white mb-1">Communication Consent Settings</h1>
      <p className="text-xs text-slate-400 mb-6">
        {visitorName ? `Managing preferences for ${visitorName}` : 'Manage your email & WhatsApp follow-up preferences'}
      </p>

      {optedOut ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-6">
          <p className="font-semibold mb-1">You have opted out of follow-up communications.</p>
          <p className="text-[11px] text-amber-400/80">No automated email or WhatsApp messages will be sent to your account.</p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-6">
          <p className="font-semibold mb-1">Communication Enabled</p>
          <p className="text-[11px] text-emerald-400/80">You are currently subscribed to receive 3D property tour updates.</p>
        </div>
      )}

      {optedOut ? (
        <button
          onClick={() => handleToggleOptOut(false)}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
        >
          Re-enable Property Updates
        </button>
      ) : (
        <button
          onClick={() => handleToggleOptOut(true)}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-xs border border-red-500/40 transition"
        >
          Opt Out of Future Follow-ups
        </button>
      )}

      <div className="mt-6 pt-6 border-t border-slate-800">
        <Link href="/walkthrough" className="text-xs text-sky-400 hover:underline flex items-center justify-center gap-1">
          <Building2 className="w-3.5 h-3.5" /> Return to 3D Property Walkthrough
        </Link>
      </div>
    </div>
  );
}

export default function OptOutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-400">Loading preference settings...</div>}>
        <OptOutForm />
      </Suspense>
    </div>
  );
}
