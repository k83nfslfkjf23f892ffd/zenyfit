'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-6">
          <WifiOff className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold mb-2">You&apos;re Offline</h1>
        <p className="text-sm text-foreground/50 mb-6">
          This page isn&apos;t available offline. Connect to the internet and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
