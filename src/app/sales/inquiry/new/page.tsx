'use client';

import React, { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth/context';
import { UserPlus, Mail, Phone, User, MessageSquare, Clock, CheckCircle2, Send, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewInquiryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Master Suite & Floorplan Customization');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [jobInfo, setJobInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !user) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesperson_id: user.id,
          name,
          email,
          phone,
          inquiry_type: inquiryType,
          notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setJobInfo(`Follow-up scheduled for ${new Date(data.job.scheduled_for).toLocaleTimeString()}`);
        
        // Non-blocking trigger to process job automatically for instant testing demo
        fetch('/api/jobs/process', { method: 'POST' }).catch(() => {});

        setTimeout(() => {
          router.push('/sales/visitors');
        }, 2500);
      } else {
        alert(data.error || 'Failed to submit inquiry.');
        setIsSubmitting(false);
      }
    } catch {
      alert('Network error submitting inquiry.');
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Register Property Visitor & Inquiry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Capture visitor details during in-person tours. Automatically triggers scheduled 1-minute follow-ups via SendGrid Email and WhatsApp.
          </p>
        </div>

        {success ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Visitor Registered Successfully!</h2>
            <p className="text-xs text-slate-300">
              Visitor <span className="font-semibold text-sky-400">{name}</span> has been saved and assigned to your account.
            </p>
            <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono border border-slate-800">
              {jobInfo}
            </div>
            <p className="text-[11px] text-slate-400">Redirecting to visitor leads manager...</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Visitor Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Jonathan Vance"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="jonathan@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">WhatsApp / Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+1 555-019-2834"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Primary Interest / Inquiry Category</label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                >
                  <option value="Master Suite & Floorplan Customization">Master Suite & Floorplan Customization</option>
                  <option value="Penthouse Rooftop Deck & Pool Option">Penthouse Rooftop Deck & Pool Option</option>
                  <option value="Gourmet Kitchen Appliance Packages">Gourmet Kitchen Appliance Packages</option>
                  <option value="Bulk Developer Multi-Unit Purchase">Bulk Developer Multi-Unit Purchase</option>
                  <option value="Financing & Virtual Walkthrough Consultation">Financing & Virtual Walkthrough Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Sales Notes & Specific Requests</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Requested evening virtual tour, floorplan PDF, Q4 move-in timeline..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-[11px] text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 flex-none" />
                <span>Automated 1-minute follow-up worker will send personalized Email & WhatsApp notification.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Registering Lead...' : 'Submit Registration & Schedule Follow-Up'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
