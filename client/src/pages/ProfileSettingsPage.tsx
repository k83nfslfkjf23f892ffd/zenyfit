import { useState, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { currentUser } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Edit2, Palette, Sun, Moon, LogOut, RotateCcw, Upload, Copy, Trash2, UserPlus, Plus, ArrowLeft, ZoomIn, ZoomOut, Check, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useThemeToggle } from "@/hooks/use-theme";
import { useLocation } from "wouter";

export default function ProfileSettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAvatarCustomizing, setIsAvatarCustomizing] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(currentUser.username);
  const [previousAvatarSeed, setPreviousAvatarSeed] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState(currentUser.username);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inviteCodes, setInviteCodes] = useState([
    { id: 1, code: "ZEN-5K9P-2X", createdAt: "2025-01-15", used: false },
    { id: 2, code: "FIT-7Q3M-8Y", createdAt: "2025-01-14", used: true },
  ]);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const { currentTheme, setTheme } = useThemeToggle();

  const currentAvatarUrl = customAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  const generateNewAvatar = () => {
    setPreviousAvatarSeed(avatarSeed);
    const randomSeed = `avatar-${Math.random().toString(36).substring(7)}`;
    setAvatarSeed(randomSeed);
    setCustomAvatarUrl(null);
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

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part3 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const code = `${part1}-${part2}-${part3}`;
    
    const newCode = {
      id: Math.max(...inviteCodes.map(c => c.id), 0) + 1,
      code,
      createdAt: new Date().toISOString().split('T')[0],
      used: false,
    };
    
    setInviteCodes([newCode, ...inviteCodes]);
    toast({
      title: "Invite Code Generated!",
      description: `${code} is ready to share.`,
    });
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
    const shareText = `Join me on ZenyFit! 💪 Use code: ${code}\n${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join ZenyFit",
        text: shareText,
        url: shareUrl,
      }).catch(() => {
        // Fallback if share dialog is cancelled
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
      // Fallback for browsers that don't support Web Share API
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

  const revokeInviteCode = (id: number) => {
    setInviteCodes(inviteCodes.filter(c => c.id !== id));
    toast({
      title: "Invite Code Revoked",
      description: "The code has been deleted.",
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameChanged(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
  };

  const handleSignOut = () => {
    setLocation("/auth");
    toast({
      title: "Signed Out",
      description: "You have been logged out.",
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
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

        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Edit2 size={18} />
            Profile
          </h2>

          <div className="bg-card dark:bg-zinc-900 rounded-2xl p-6 space-y-6 border border-border/50">
            {/* Avatar Section */}
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
                </div>
              )}
            </div>

            {/* Username Section */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <label className="text-sm font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameChanged(true);
                }}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {usernameChanged && (
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Save Changes
                </button>
              )}
            </form>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette size={18} />
            Preferences
          </h2>

          <div className="bg-card dark:bg-zinc-900 rounded-2xl p-6 space-y-4 border border-border/50">
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

        {/* Invite Codes Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus size={18} />
              Invite Codes
            </h2>
            <button
              onClick={generateInviteCode}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Generate
            </button>
          </div>

          <div className="bg-card dark:bg-zinc-900 rounded-2xl p-6 space-y-3 border border-border/50">
            {inviteCodes.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {inviteCodes.filter(c => !c.used).length} unused codes
                </p>
                {inviteCodes.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-mono font-semibold">{invite.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.used ? "Used" : "Unused"} • {invite.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => shareInviteCode(invite.code)}
                        className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Share invite"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(invite.code)}
                        className="p-2 rounded-lg hover:bg-background transition-colors"
                        title="Copy code"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => revokeInviteCode(invite.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete code"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No invite codes yet</p>
            )}
          </div>
        </section>

        {/* Sign Out Section */}
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
