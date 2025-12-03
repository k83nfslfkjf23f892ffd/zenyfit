import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { Toaster } from "@/components/ui/toaster";
import bgPattern from "@assets/generated_images/subtle_geometric_pattern_background.png";

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-md mx-auto min-h-screen relative bg-background shadow-2xl flex flex-col">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" 
             style={{ backgroundImage: `url(${bgPattern})`, backgroundSize: 'cover' }} />
        
        <main 
          className="relative z-10 px-4 py-6 flex-1 overflow-y-auto"
          style={{ 
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'
          }}
        >
          {children}
        </main>

        {!hideNav && <BottomNav />}
      </div>
      <Toaster />
    </div>
  );
}
