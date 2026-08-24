'use client';

import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  HelpCircle, 
  Eye, 
  Compass, 
  Footprints, 
  Navigation, 
  ArrowLeft, 
  Building2,
  CheckCircle2
} from 'lucide-react';
import { Hotspot } from '@/types/database';
import { useRouter } from 'next/navigation';

export type CameraPreset = 'DEFAULT' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'AERIAL';

interface WalkthroughOverlayProps {
  projectTitle: string;
  hotspots: Hotspot[];
  activeHotspotId: string | null;
  onSelectHotspot: (hotspot: Hotspot) => void;
  onSelectPreset: (preset: CameraPreset) => void;
  freeWalkEnabled: boolean;
  onToggleFreeWalk: () => void;
  hotspotsVisible: boolean;
  onToggleHotspots: () => void;
  onMobileMove?: (vector: { x: number; y: number }) => void;
}

export function WalkthroughOverlay({
  projectTitle,
  hotspots,
  activeHotspotId,
  onSelectHotspot,
  onSelectPreset,
  freeWalkEnabled,
  onToggleFreeWalk,
  hotspotsVisible,
  onToggleHotspots,
  onMobileMove
}: WalkthroughOverlayProps) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [activeTab, setActiveTab] = useState<'presets' | 'hotspots'>('hotspots');
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !onMobileMove) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - touchStart.x) / 50;
    const dy = (touch.clientY - touchStart.y) / 50;
    onMobileMove({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    if (onMobileMove) onMobileMove({ x: 0, y: 0 });
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-10 select-none">
      {/* ================= TOP BAR ================= */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 text-slate-200 hover:text-white border border-slate-800/80 hover:border-sky-500/50 backdrop-blur-md transition-all shadow-xl"
            title="Exit Walkthrough"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-xl">
            <Building2 className="w-4 h-4 text-sky-400" />
            <div>
              <h1 className="text-xs sm:text-sm font-semibold text-white tracking-wide">
                {projectTitle}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 3D Walkthrough
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md hover:border-sky-500/50 transition shadow-xl"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Controls</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800 hover:border-sky-500/50 backdrop-blur-md transition shadow-xl"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE VIRTUAL JOYSTICK TOUCH AREA ================= */}
      <div 
        className="sm:hidden absolute bottom-24 left-6 w-28 h-28 rounded-full border border-sky-500/30 bg-slate-950/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-10 rounded-full bg-sky-500/60 border border-sky-300 flex items-center justify-center shadow-lg">
          <Footprints className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* ================= BOTTOM NAVIGATION & CAMERA BAR ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pointer-events-auto">
        {/* Mode Toggles */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-lg shadow-2xl self-start">
          <button
            onClick={onToggleFreeWalk}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              freeWalkEnabled
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Footprints className="w-4 h-4" />
            Free Walk
          </button>

          <button
            onClick={onToggleHotspots}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              hotspotsVisible
                ? 'bg-slate-800 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Hotspots ({hotspots.length})
          </button>
        </div>

        {/* View Presets & Hotspots Panel */}
        <div className="flex flex-col rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl p-2 max-w-md w-full sm:w-auto">
          {/* Tab Selector */}
          <div className="flex items-center border-b border-slate-800/80 mb-2 pb-1.5 px-1">
            <button
              onClick={() => setActiveTab('hotspots')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1 rounded-lg transition ${
                activeTab === 'hotspots' ? 'text-sky-400 bg-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" /> Room Points
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1 rounded-lg transition ${
                activeTab === 'presets' ? 'text-sky-400 bg-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Camera Views
            </button>
          </div>

          {/* Hotspots Quick Buttons */}
          {activeTab === 'hotspots' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {hotspots.map((hs) => (
                <button
                  key={hs.id}
                  onClick={() => onSelectHotspot(hs)}
                  className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    activeHotspotId === hs.id
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/60 ring-1 ring-sky-500/40'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {hs.name}
                </button>
              ))}
            </div>
          )}

          {/* Camera View Presets */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {(['DEFAULT', 'FRONT', 'BACK', 'LEFT', 'RIGHT', 'AERIAL'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => onSelectPreset(preset)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-sky-600/30 text-[11px] font-medium border border-slate-800 hover:border-sky-500/40 transition text-center capitalize"
                >
                  {preset.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= INSTRUCTIONS MODAL ================= */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">3D Walkthrough Controls</h3>
                <p className="text-xs text-slate-400">How to navigate the luxury property</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="px-2 py-1 rounded bg-slate-800 font-mono text-sky-400 font-bold">WASD / Keys</span>
                <div>
                  <p className="font-medium text-white">Keyboard Movement</p>
                  <p className="text-[11px] text-slate-400">Use W, A, S, D or Arrow keys to move forward, backward, left, right. Hold Shift to sprint.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="px-2 py-1 rounded bg-slate-800 font-mono text-sky-400 font-bold">Mouse / Touch</span>
                <div>
                  <p className="font-medium text-white">Look Around</p>
                  <p className="text-[11px] text-slate-400">Click on screen to lock pointer and move mouse to look 360°. Press ESC to unlock.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="px-2 py-1 rounded bg-slate-800 font-mono text-sky-400 font-bold">Hotspots</span>
                <div>
                  <p className="font-medium text-white">Room Navigation</p>
                  <p className="text-[11px] text-slate-400">Click any glowing 3D room point to smoothly jump directly to that space.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                <CheckCircle2 className="w-4 h-4 flex-none" />
                <span>Collision active: Walls block movement & stairs step automatically.</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-xs hover:from-sky-400 hover:to-blue-500 transition shadow-lg"
            >
              Start Exploring 3D Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
