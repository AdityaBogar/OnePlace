'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/context';
import { FrontDeskRegistrationModal } from '@/components/kiosk/FrontDeskRegistrationModal';

// Dynamically import WalkthroughCanvas with SSR disabled to fix Vercel rendering crash
const WalkthroughCanvas = dynamic(
  () => import('@/components/3d/WalkthroughCanvas').then((mod) => mod.WalkthroughCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wider text-white">Initializing OnePlace 3D Engine...</p>
      </div>
    ),
  }
);

export default function StandaloneWalkthroughPage() {
  const { user } = useAuth();
  const isFrontDesk = user?.role === 'FRONT_DESK';

  const [isModalOpen, setIsModalOpen] = useState(isFrontDesk);
  const [idleSeconds, setIdleSeconds] = useState(0);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize initial modal state if role changes or loads
  useEffect(() => {
    if (isFrontDesk) {
      setIsModalOpen(true);
    }
  }, [isFrontDesk]);

  // Reset Idle Activity Callback
  const resetIdleTimer = useCallback(() => {
    setIdleSeconds(0);
  }, []);

  // 30-Second Inactivity Listener for Front Desk / Kiosk Mode
  useEffect(() => {
    if (!isFrontDesk || isModalOpen) return;

    const activityEvents = ['mousemove', 'pointermove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // 1-second interval ticker
    idleTimerRef.current = setInterval(() => {
      setIdleSeconds((prev) => {
        if (prev >= 29) {
          setIsModalOpen(true);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetIdleTimer);
      });
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [isFrontDesk, isModalOpen, resetIdleTimer]);

  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden relative">
      <WalkthroughCanvas
        isFrontDesk={isFrontDesk}
        onOpenRegistration={() => setIsModalOpen(true)}
        idleCountdown={30 - idleSeconds}
      />

      {/* Front Desk Registration Kiosk Modal */}
      <FrontDeskRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}
