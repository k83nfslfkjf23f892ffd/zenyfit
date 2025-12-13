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
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-border z-50 max-w-md mx-auto"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div className="flex items-center justify-evenly h-20 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full cursor-pointer transition-colors duration-200 px-2 py-2 rounded-xl active:bg-muted/50",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  item.primary && "text-primary"
                )}
              >
                {item.primary ? (
                  <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg">
                    <item.icon size={26} />
                  </div>
                ) : (
                  <>
                    <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[11px] font-medium mt-1.5 whitespace-nowrap">{item.label}</span>
                  </>
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
