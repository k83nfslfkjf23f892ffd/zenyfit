'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Plus, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS } from '@shared/constants';
import { ThemeSelector } from '@/components/ThemeSelector';
import { AvatarPicker } from '@/components/AvatarPicker';
import { NotificationSettings } from '@/components/NotificationSettings';

interface InviteCode {
  code: string;
  used: boolean;
  usedBy: string | null;
  createdAt: number;
  usedAt: number | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchInviteCodes = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/invites', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data.inviteCodes || []);
      }
    } catch (error) {
      console.error('Error fetching invite codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchInviteCodes();
    }
  }, [user, firebaseUser, fetchInviteCodes]);

  const handleGenerateCode = async () => {
    if (inviteCodes.length >= LIMITS.inviteCodes) {
      toast.error(`Maximum ${LIMITS.inviteCodes} invite codes allowed`);
      return;
    }

    setGenerating(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Invite code generated!');
        fetchInviteCodes(); // Refresh list
      } else {
        toast.error(data.error || 'Failed to generate code');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const copyInviteUrl = (code: string) => {
    const url = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite URL copied to clipboard!');
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    if (!user) return;

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (response.ok) {
        toast.success('Avatar updated!');
        // Auth context will update automatically via Firestore listener
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update avatar');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('An error occurred');
    }
  };

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
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Theme Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme
            </CardTitle>
            <CardDescription>Choose your visual style (24 themes available)</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Avatar Picker */}
        <AvatarPicker
          username={user.username}
          currentAvatar={user.avatar}
          onAvatarChange={handleAvatarChange}
        />

        {/* Notifications */}
        <NotificationSettings />

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Username</Label>
              <div className="mt-1 text-sm font-medium">{user.username}</div>
              <p className="text-xs text-muted-foreground mt-1">Cannot be changed</p>
            </div>
            <div>
              <Label>Level</Label>
              <div className="mt-1 text-sm font-medium">Level {user.level}</div>
            </div>
            <div>
              <Label>Total XP</Label>
              <div className="mt-1 text-sm font-medium">{user.xp.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Invite Codes</CardTitle>
            <CardDescription>
              Share ZenyFit with friends ({inviteCodes.length} / {LIMITS.inviteCodes} codes used)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCodes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {inviteCodes.length > 0 && (
                  <div className="space-y-2">
                    {inviteCodes.map((invite) => (
                      <div
                        key={invite.code}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-mono font-semibold">{invite.code}</div>
                          <div className="text-xs text-muted-foreground">
                            {invite.used ? 'Used' : 'Available'}
                          </div>
                        </div>
                        {!invite.used && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteUrl(invite.code)}
                          >
                            <Copy className="mr-2 h-3 w-3" />
                            Copy URL
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {inviteCodes.length < LIMITS.inviteCodes && (
                  <Button
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Plus className="mr-2 h-4 w-4" />
                    {generating ? 'Generating...' : 'Generate New Code'}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
