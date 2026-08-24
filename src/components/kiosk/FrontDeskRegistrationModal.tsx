'use client';

import React, { useState, useEffect } from 'react';
import { Profile } from '@/types/database';
import { Building2, User, Mail, Phone, UserCheck, MessageSquare, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface FrontDeskRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FrontDeskRegistrationModal({ isOpen, onClose, onSuccess }: FrontDeskRegistrationModalProps) {
  const [salesReps, setSalesReps] = useState<Profile[]>([]);
  const [selectedSalesId, setSelectedSalesId] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Master Suite & Floorplan Customization');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch from server-side API (uses service role, bypasses RLS)
      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((json) => {
          const profs: Profile[] = json.data ?? [];
          const reps = profs.filter((p) => p.is_active && p.role === 'SALES');
          setSalesReps(reps);
          if (reps.length > 0 && !selectedSalesId) {
            setSelectedSalesId(reps[0].id);
          }
        })
        .catch(() => setSalesReps([]));
      // Reset form states
      setSuccess(false);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
    }
  }, [isOpen, selectedSalesId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !selectedSalesId) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesperson_id: selectedSalesId,
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
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccess(false);
          onSuccess();
        }, 1500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Skip Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition z-10 flex items-center gap-1.5 text-xs font-semibold px-3"
        >
          <span>Skip & Open 3D Walkthrough</span>
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-sky-950/40 to-slate-900 border-b border-slate-800/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">OnePlace 3D Kiosk</h2>
              <p className="text-xs text-sky-400 font-medium">Front Desk Visitor Registration</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Welcome to OnePlace spatial property showcase. Please fill your details to receive personalized floorplans and virtual tour links.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Registration Complete!</h3>
              <p className="text-xs text-slate-300">
                Welcome email dispatched. Opening 3D Walkthrough...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Sales Representative Dropdown */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  Assigned Sales Representative
                </label>
                <select
                  value={selectedSalesId}
                  onChange={(e) => setSelectedSalesId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                >
                  {salesReps.length === 0 ? (
                    <option value="" disabled>No sales accounts found</option>
                  ) : (
                    salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.full_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Visitor Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Visitor Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Address */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="alex@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">WhatsApp / Phone</label>
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

              {/* Inquiry Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Primary Inquiry Interest</label>
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

              {/* Specific Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Notes (Optional)</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Specific requests, timeline..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting & Dispatching Email...' : 'Submit Registration & Open 3D'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
