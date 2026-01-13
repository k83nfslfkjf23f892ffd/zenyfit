'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome, {user.username}!</CardTitle>
          <CardDescription>ZenyFit Dashboard (Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Level:</span>
              <span className="font-semibold">{user.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">XP:</span>
              <span className="font-semibold">{user.xp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admin:</span>
              <span className="font-semibold">{user.isAdmin ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Phase 4 Complete: Authentication is working!
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✅ User signup with invite validation</li>
              <li>✅ User login</li>
              <li>✅ Real-time username availability check</li>
              <li>✅ Session management with Firebase Auth</li>
              <li>✅ Firestore user profile syncing</li>
            </ul>
          </div>

          <Button onClick={signOutUser} variant="outline" className="w-full">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
