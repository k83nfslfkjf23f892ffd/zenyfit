import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import BottomNav from "./BottomNav";
import { Toaster } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { currentUser } from "@/lib/mockData";
import { useThemeToggle } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { Settings, Edit2, Bell, Mail, Moon, Sun, Palette, LogOut } from "lucide-react";
import bgPattern from "@assets/generated_images/subtle_geometric_pattern_background.png";

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [, setLocation] = useLocation();
  const { currentTheme, setTheme } = useThemeToggle();
  const { toast } = useToast();
  const [avatarSeed, setAvatarSeed] = useState(currentUser.username);

  const generateNewAvatar = () => {
    const randomSeed = `avatar-${Math.random().toString(36).substring(7)}`;
    setAvatarSeed(randomSeed);
    toast({
      title: "Avatar Generated!",
      description: "Your new avatar is ready.",
    });
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
  };

  const handleSignOut = () => {
    setIsEditing(false);
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-md mx-auto min-h-screen relative bg-background shadow-2xl flex flex-col">
        {/* Optional subtle background texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" 
             style={{ backgroundImage: `url(${bgPattern})`, backgroundSize: 'cover' }} />
        
        <main className="relative z-10 px-4 py-6 flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {!hideNav && <BottomNav />}
      </div>
      <Toaster />
    </div>
  );
}
