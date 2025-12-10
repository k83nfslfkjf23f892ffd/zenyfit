import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { Toaster } from "@/components/ui/toaster";
import bgPattern from "@/assets/images/subtle_geometric_pattern_background.png";

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  return (
        <div
          className="min-h-screen bg-background font-sans text-foreground"
        >
          <div className="max-w-md mx-auto relative bg-background shadow-2xl flex flex-col pb-0">
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
                 style={{ backgroundImage: `url(${bgPattern})`, backgroundSize: 'cover' }} />
    
            <main
              className="relative z-10 flex-1 overflow-y-auto"
              style={{
                paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
                paddingLeft: 'env(safe-area-inset-left, 1rem)',
                paddingRight: 'env(safe-area-inset-right, 1rem)',
                paddingBottom: hideNav ? '1.5rem' : 'calc(4rem + max(env(safe-area-inset-bottom, 0px), 8px) + 1rem)',
              }}
            >
              {children}
            </main>
    
            {!hideNav && <BottomNav />}
          </div>
          <Toaster />
        </div>  );
}
