'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Plus, Palette, Check, Clock, Users, LogOut, Share2, QrCode, ArrowLeft, Sparkles, ChevronDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { LIMITS, APP_URL, APP_VERSION, CHANGELOG } from '@shared/constants';
import { ThemeSelector, ThemeModeToggle } from '@/components/ThemeSelector';
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
  const { user, loading, firebaseUser, signOutUser } = useAuth();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('zenyfit_lastSeenVersion') !== APP_VERSION;
  });

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
    const url = `${APP_URL}/signup?invite=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite URL copied to clipboard!');
  };

  const shareInvite = async (code: string) => {
    const url = `${APP_URL}/signup?invite=${code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on ZenyFit!',
          text: 'Use my invite code to join ZenyFit and start your fitness journey!',
          url,
        });
      } catch (error) {
        // User cancelled or share failed - ignore
        if ((error as Error).name !== 'AbortError') {
          copyInviteUrl(code); // Fallback to copy
        }
      }
    } else {
      copyInviteUrl(code); // Fallback for browsers without Web Share API
    }
  };

  const handleAvatarSave = async (avatarUrl: string) => {
    if (!user) return;

    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatar: avatarUrl }),
    });

    if (response.ok) {
      toast.success('Avatar saved!');
    } else {
      const data = await response.json();
      toast.error(data.error || 'Failed to save avatar');
      throw new Error(data.error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-foreground/40" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-foreground/50">Manage your account</p>
          </div>
        </div>

        {/* Theme Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg gradient-bg-subtle">
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                Theme
              </CardTitle>
              <ThemeModeToggle />
            </div>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Avatar Picker */}
        <AvatarPicker
          username={user.username}
          currentAvatar={user.avatar}
          onSave={handleAvatarSave}
        />

        {/* Notifications */}
        <NotificationSettings />

        {/* What's New */}
        <Card>
          <CardHeader className="pb-3">
            <button
              onClick={() => {
                setWhatsNewOpen(!whatsNewOpen);
                if (!whatsNewOpen && hasNewUpdate) {
                  localStorage.setItem('zenyfit_lastSeenVersion', APP_VERSION);
                  setHasNewUpdate(false);
                }
              }}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg gradient-bg-subtle relative">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {hasNewUpdate && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                What&apos;s New
                <span className="text-xs font-normal text-foreground/40">v{APP_VERSION}</span>
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-foreground/40 transition-transform duration-200 ${whatsNewOpen ? 'rotate-180' : ''}`} />
            </button>
          </CardHeader>
          {whatsNewOpen && (
            <CardContent className="pt-0 space-y-4">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-1.5">
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
                  {i < CHANGELOG.length - 1 && (
                    <div className="border-b border-border/50 mt-3" />
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Invite Codes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg gradient-bg-subtle">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Invite Codes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status summary */}
            <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-surface border border-border">
              <span className="text-foreground/50">Codes generated</span>
              <span className="font-semibold">{inviteCodes.length} / {LIMITS.inviteCodes}</span>
            </div>

            {loadingCodes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : (
              <>
                {inviteCodes.length > 0 && (
                  <div className="space-y-2">
                    {inviteCodes.map((invite) => (
                      <div
                        key={invite.code}
                        className={`rounded-xl bg-surface border border-border p-3 ${invite.used ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-semibold text-sm">{invite.code}</div>
                          {invite.used ? (
                            <Badge variant="muted">
                              <Check className="h-3 w-3 mr-1" />
                              Used
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <Clock className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          )}
                        </div>

                        {/* QR Code Display */}
                        {showQrCode === invite.code && !invite.used && (
                          <div className="mt-3 flex justify-center p-4 bg-white rounded-lg">
                            <QRCodeSVG
                              value={`${APP_URL}/signup?invite=${invite.code}`}
                              size={160}
                              level="M"
                            />
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-foreground/40">
                            {invite.used && invite.usedBy ? (
                              <>Used by <span className="font-medium text-foreground/60">{invite.usedBy}</span></>
                            ) : (
                              <>Created {new Date(invite.createdAt).toLocaleDateString()}</>
                            )}
                          </div>
                          {!invite.used && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowQrCode(showQrCode === invite.code ? null : invite.code)}
                                className="h-7 text-xs"
                              >
                                <QrCode className="mr-1 h-3 w-3" />
                                QR
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyInviteUrl(invite.code)}
                                className="h-7 text-xs"
                              >
                                <Copy className="mr-1 h-3 w-3" />
                                Copy
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => shareInvite(invite.code)}
                                className="h-7 text-xs"
                              >
                                <Share2 className="mr-1 h-3 w-3" />
                                Share
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {inviteCodes.length === 0 && (
                  <p className="text-sm text-foreground/40 text-center py-4">
                    No invite codes yet. Generate one to invite friends!
                  </p>
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

        {/* Log Out */}
        <Card>
          <CardContent className="pt-6">
            {showLogoutConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/50">
                  Are you sure you want to log out?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
