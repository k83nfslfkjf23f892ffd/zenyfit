'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { APP_VERSION } from '@shared/constants';

interface SplashScreenProps {
  children: React.ReactNode;
  loading: boolean;
}

export function SplashScreen({ children, loading }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // When loading completes, start fade out animation
    if (!loading && showSplash) {
      // Small delay to ensure smooth transition
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 300);

      // Remove splash after fade animation
      const removeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 600);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [loading, showSplash]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Splash Screen */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* App Name */}
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          ZenyFit
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-medium">
          Level up your fitness
        </p>

        {/* Logo and version at bottom */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2">
          <div className="relative h-10 w-10 opacity-60">
            <Image
              src="/logo.svg"
              alt="ZenyFit"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-xs text-muted-foreground">
            v{APP_VERSION}
          </div>
        </div>
      </div>

      {/* Content (hidden behind splash) */}
      <div className={fadeOut ? 'opacity-100' : 'opacity-0'}>
        {children}
      </div>
    </>
  );
}
