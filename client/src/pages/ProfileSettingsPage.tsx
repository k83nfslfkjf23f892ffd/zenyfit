import { useState, useRef, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Edit2, Palette, Sun, Moon, LogOut, RotateCcw, Upload, Copy, Trash2, UserPlus, Plus, ArrowLeft, Share2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useThemeToggle } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";

interface InviteCodeData {
  id: string;
  code: string;
  createdAt: number;
  used: boolean;
  usedBy?: string | null;
}

export default function ProfileSettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, userProfile, logout } = useAuth();
  const [isAvatarCustomizing, setIsAvatarCustomizing] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(userProfile?.username || "user");
  const [previousAvatarSeed, setPreviousAvatarSeed] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [hasGeneratedNewAvatar, setHasGeneratedNewAvatar] = useState(false);
  const [username, setUsername] = useState(userProfile?.username || "");
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeData[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const { currentTheme, setTheme } = useThemeToggle();

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username);
      setAvatarSeed(userProfile.username);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchInviteCodes();
  }, [user]);

  // Check username availability with debouncing
  useEffect(() => {
    const originalUsername = userProfile?.username;

    if (!usernameChanged || !username || username.length < 3 || username === originalUsername) {
      setUsernameAvailable(null);
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameError(null);

      try {
        const response = await fetch(getApiUrl(`/api/check-username?username=${encodeURIComponent(username)}`));
        const data = await response.json();

        if (data.success) {
          setUsernameAvailable(data.available);
          setUsernameError(data.reason);
        }
      } catch (error) {
        console.error("Failed to check username:", error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [username, usernameChanged, userProfile?.username]);

  const fetchInviteCodes = async () => {
    if (!user) {
      setLoadingCodes(false);
      return;
    }
    
    try {
      const token = await user.getIdToken(true);
      const response = await fetch(getApiUrl("/api/invite-codes"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.inviteCodes) {
          setInviteCodes(data.inviteCodes);
        }
      }
    } catch (err) {
      console.error("Failed to fetch invite codes:", err);
    } finally {
      setLoadingCodes(false);
    }
  };

  const currentAvatarUrl = customAvatarUrl || (hasGeneratedNewAvatar ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}` : userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`);

  const saveAvatarToBackend = async (avatarUrl: string) => {
    if (!user) return false;
    setSavingAvatar(true);
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(getApiUrl("/api/users"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, avatar: avatarUrl }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Avatar Saved!",
          description: "Your avatar has been updated.",
        });
        setHasGeneratedNewAvatar(false);
        return true;
      } else {
        toast({
          title: "Failed to Save",
          description: data.error || "Could not save avatar.",
          variant: "destructive",
        });
        return false;
      }
    } catch (err) {
      console.error("Save avatar error:", err);
      toast({
        title: "Error",
        description: "Failed to save avatar.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSavingAvatar(false);
    }
  };

  const generateNewAvatar = () => {
    setPreviousAvatarSeed(avatarSeed);
    const randomSeed = `avatar-${Math.random().toString(36).substring(7)}`;
    setAvatarSeed(randomSeed);
    setCustomAvatarUrl(null);
    setHasGeneratedNewAvatar(true);
    toast({
      title: "Avatar Generated!",
      description: "Your new avatar is ready.",
    });
  };

  const revertToPreviousAvatar = () => {
    if (previousAvatarSeed) {
      setAvatarSeed(previousAvatarSeed);
      setCustomAvatarUrl(null);
      setPreviousAvatarSeed(null);
      toast({
        title: "Avatar Reverted",
        description: "Restored your previous avatar.",
      });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviousAvatarSeed(avatarSeed);
        setCroppingImage(reader.result as string);
        setIsCropping(true);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffsetX(e.clientX - dragStart.x);
      setOffsetY(e.clientY - dragStart.y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.1 : 0.9;
    setZoom(Math.max(0.5, Math.min(3, zoom * factor)));
  };

  const cropConfirm = () => {
    if (croppingImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const size = 128;
          const x = (canvas.width - size) / 2;
          const y = (canvas.height - size) / 2;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          
          ctx.drawImage(
            img,
            offsetX + x,
            offsetY + y,
            img.width * zoom,
            img.height * zoom
          );
          ctx.restore();
          
          const croppedUrl = canvas.toDataURL();
          setCustomAvatarUrl(croppedUrl);
          setIsCropping(false);
          setCroppingImage(null);
          setIsAvatarCustomizing(false);
          toast({
            title: "Avatar Updated!",
            description: "Your custom avatar has been set.",
          });
        };
        img.src = croppingImage;
      }
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCroppingImage(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const generateInviteCode = async () => {
    if (!user) return;
    
    if (inviteCodes.length >= 10) {
      toast({
        title: "Limit Reached",
        description: "You can only have 10 invite codes.",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingCode(true);
    
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(getApiUrl("/api/invite-codes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await response.json();
      
      if (data.success && data.inviteCode) {
        setInviteCodes([data.inviteCode, ...inviteCodes]);
        toast({
          title: "Invite Code Generated!",
          description: `${data.inviteCode.code} is ready to share.`,
        });
      } else {
        toast({
          title: "Failed to Generate",
          description: data.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Generate invite code error:", err);
      toast({
        title: "Error",
        description: "Failed to generate invite code.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "Copied!",
        description: `${code} copied to clipboard.`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please try again.",
      });
    });
  };

  const shareInviteCode = (code: string) => {
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}?invite=${code}`;
    const shareText = `Join me on ZenyFit! Use code: ${code}\n${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join ZenyFit",
        text: shareText,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast({
            title: "Link Copied!",
            description: "Invite link copied to clipboard.",
          });
        }).catch(() => {
          toast({
            title: "Copy Failed",
            description: "Could not copy to clipboard. Please try again.",
          });
        });
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "Link Copied!",
          description: "Invite link copied to clipboard.",
        });
      }).catch(() => {
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard. Please try again.",
        });
      });
    }
  };

  const revokeInviteCode = async (code: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(getApiUrl("/api/invite-codes"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, code }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInviteCodes(inviteCodes.filter(c => c.code !== code));
        toast({
          title: "Invite Code Deleted",
          description: "The code has been removed.",
        });
      } else {
        toast({
          title: "Failed to Delete",
          description: data.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Revoke invite code error:", err);
      toast({
        title: "Error",
        description: "Failed to delete invite code.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameChanged(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setLocation("/auth");
      toast({
        title: "Signed Out",
        description: "You have been logged out.",
      });
    } catch (err) {
      console.error("Sign out error:", err);
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-bold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Edit2 size={18} />
            Profile
          </h2>

          <div className="bg-card dark:bg-black rounded-2xl p-6 space-y-6 border border-border/50">
            <div className="space-y-3">
              <label className="text-sm font-medium">Avatar</label>
              <div className="flex items-center gap-4">
                <img
                  src={currentAvatarUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-primary/20"
                />
                <button
                  onClick={() => setIsAvatarCustomizing(!isAvatarCustomizing)}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Customize Avatar
                </button>
              </div>

              {isAvatarCustomizing && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                  <button
                    onClick={generateNewAvatar}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <RotateCcw size={16} />
                    Generate New Avatar
                  </button>
                  {previousAvatarSeed && (
                    <button
                      onClick={revertToPreviousAvatar}
                      className="w-full px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-slate-400 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Revert to Previous
                    </button>
                  )}
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-slate-400 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                    <Upload size={16} />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {(hasGeneratedNewAvatar || customAvatarUrl) && (
                    <button
                      onClick={() => saveAvatarToBackend(currentAvatarUrl)}
                      disabled={savingAvatar}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
                    >
                      {savingAvatar ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      Save Avatar
                    </button>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                    setUsernameChanged(true);
                  }}
                  maxLength={20}
                  className="w-full px-4 py-3 pr-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-base"
                />
                {usernameChanged && username !== userProfile?.username && username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : usernameAvailable === true ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {usernameError && usernameChanged && (
                <p className="text-xs text-red-500">{usernameError}</p>
              )}
              {usernameChanged && (
                <button
                  type="submit"
                  disabled={usernameAvailable === false || checkingUsername}
                  className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  Save Changes
                </button>
              )}
            </form>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette size={18} />
            Preferences
          </h2>

          <div className="bg-card dark:bg-black rounded-2xl p-6 space-y-4 border border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                {currentTheme === "light" ? <Sun size={16} /> : <Moon size={16} />}
                Dark Mode
              </label>
              <Switch
                checked={currentTheme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus size={18} />
              Invite Codes
            </h2>
            <button
              onClick={generateInviteCode}
              disabled={generatingCode || inviteCodes.length >= 10}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingCode ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Generate
            </button>
          </div>

          <div className="bg-card dark:bg-black rounded-2xl p-6 space-y-3 border border-border/50">
            {loadingCodes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : inviteCodes.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {inviteCodes.filter(c => !c.used).length} unused codes ({inviteCodes.length}/10)
                </p>
                {inviteCodes.map((invite) => (
                  <div
                    key={invite.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors gap-2"
                  >
                    <div className="min-w-0 flex-shrink">
                      <p className="text-sm font-mono font-semibold truncate">{invite.code}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {invite.used ? "Used" : "Unused"} • {formatDate(invite.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => shareInviteCode(invite.code)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Share invite"
                        aria-label="Share invite code"
                      >
                        <Share2 size={15} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(invite.code)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background transition-colors"
                        title="Copy code"
                        aria-label="Copy invite code"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => revokeInviteCode(invite.code)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete code"
                        aria-label="Delete invite code"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invite codes yet. Generate one to invite friends!
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                <LogOut size={16} />
                Sign Out
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign Out?</DialogTitle>
                <DialogDescription>Are you sure you want to sign out of ZenyFit?</DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setIsSignOutDialogOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsSignOutDialogOpen(false);
                    handleSignOut();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </Layout>
  );
}
