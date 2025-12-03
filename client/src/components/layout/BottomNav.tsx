import { Link, useLocation } from "wouter";
import { Home, Trophy, PlusCircle, Medal, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/profile", icon: BarChart3, label: "Stats" },
    { href: "/log", icon: PlusCircle, label: "Log", primary: true },
    { href: "/challenges", icon: Trophy, label: "Challenges" },
    { href: "/leaderboard", icon: Medal, label: "Ranks" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-border z-50 safe-bottom"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full cursor-pointer transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  item.primary && "text-primary"
                )}
              >
                {item.primary ? (
                  <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg -mt-6 border-4 border-background">
                    <item.icon size={28} />
                  </div>
                ) : (
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                )}
                {!item.primary && (
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
