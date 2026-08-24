import Link from 'next/link';
import { 
  Building2, 
  Compass, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  Layers, 
  Smartphone, 
  Send,
  Eye
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* ================= PUBLIC NAVIGATION ================= */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">LuxeEstate<span className="text-sky-400">3D</span></span>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Spatial Property Showcase</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <Link href="#features" className="hover:text-sky-400 transition">Experience Highlights</Link>
            <Link href="#architecture" className="hover:text-sky-400 transition">3D Engine</Link>
            <Link href="#sales" className="hover:text-sky-400 transition">Sales Automation</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-800 transition"
            >
              Portal Login
            </Link>
            <Link
              href="/walkthrough"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition group"
            >
              <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              Explore 3D Walkthrough
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Ambient Glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/30 text-sky-400 text-xs font-medium mb-8 backdrop-blur-md shadow-xl">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Next-Generation Spatial Real Estate Presentation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Immersive 3D Property Walkthroughs for <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">Visionary Builders</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            Transform architectural models into collision-aware, spatial 3D interactive experiences. Elevate luxury project sales with real-time room navigation, hotspot tours, and automated visitor follow-ups.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/walkthrough"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-2xl shadow-sky-500/30 transition group"
            >
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              Launch Interactive 3D Tour
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-800 backdrop-blur-md transition"
            >
              Sign In to Builder Portal
            </Link>
          </div>

          {/* 3D SHOWCASE PREVIEW HERO MOCKUP */}
          <div className="mt-16 relative max-w-5xl mx-auto rounded-3xl p-3 bg-gradient-to-b from-sky-500/30 via-slate-800/40 to-slate-950 border border-sky-500/30 shadow-2xl shadow-sky-500/10">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[16/9] flex items-center justify-center group border border-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/30 via-slate-950 to-slate-950" />
              
              <div className="relative z-10 text-center p-8 max-w-lg">
                <div className="w-16 h-16 rounded-3xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 mx-auto mb-4 backdrop-blur-md">
                  <Eye className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">The Sky Villa — Modern Residence</h3>
                <p className="text-xs text-slate-400 mt-2">Active Published Model — Interactive WASD & Touch Exploration</p>

                <Link
                  href="/walkthrough"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition"
                >
                  Enter 3D Viewport Now
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HIGHLIGHTS SECTION ================= */}
      <section id="features" className="py-24 bg-slate-900/50 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Engineered for Luxury Property Developers</h2>
            <p className="text-sm text-slate-400 mt-4">Complete end-to-end platform bridging 3D visualization, admin asset management, and sales inquiry follow-ups.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/40 transition shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic 3D Model Storage</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Upload GLB/GLTF architecture models dynamically. Admins can replace models, manage draft vs published states, and configure spatial tour points.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/40 transition shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Physical Collision Navigation</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Real collision detection prevents walking through walls. Ascend staircases, step onto balconies, and navigate with desktop WASD or mobile touch joystick.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/40 transition shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Automated Inquiry Follow-up</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Sales reps register visitors directly during tours. The background worker triggers 1-minute follow-ups via SendGrid Email and WhatsApp Business API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-white">LuxeEstate 3D Showcase Platform</span>
          </div>
          <p>© 2026 LuxeEstate Inc. All rights reserved. Production 3D Real Estate SaaS.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition">Admin Portal</Link>
            <Link href="/login" className="hover:text-white transition">Sales Portal</Link>
            <Link href="/walkthrough" className="hover:text-white transition">Live 3D Tour</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
