'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { APP_VERSION, CHANGELOG } from '@shared/constants';

export default function WhatsNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Mark as seen
  useEffect(() => {
    localStorage.setItem('zenyfit_lastSeenVersion', APP_VERSION);
  }, []);

  if (!loading && !user) return null;

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">What&apos;s New</h1>
            <p className="text-sm text-foreground/50">v{APP_VERSION}</p>
          </div>
        </div>

        {/* Changelog entries */}
        {CHANGELOG.map((entry) => (
          <Card key={entry.version}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{entry.title}</span>
                <span className="text-xs text-foreground/30">v{entry.version}</span>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, j) => (
                  <li key={j} className="text-sm text-foreground/60 flex gap-2">
                    <span className="text-foreground/25 shrink-0">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
