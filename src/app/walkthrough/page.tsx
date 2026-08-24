'use client';

import React from 'react';
import { WalkthroughCanvas } from '@/components/3d/WalkthroughCanvas';

export default function StandaloneWalkthroughPage() {
  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden">
      <WalkthroughCanvas />
    </div>
  );
}
