import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "challenge" | "system" | "social";
};

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "New Challenge Invite",
    message: "IronLady invited you to '100 Push-up Daily'",
    time: "2m ago",
    read: false,
    type: "challenge",
  },
  {
    id: "2",
    title: "Goal Achieved! 🎉",
    message: "You hit your daily running goal.",
    time: "1h ago",
    read: false,
    type: "system",
  },
  {
    id: "3",
    title: "Rank Up",
    message: "You are now #2 in 'Marathon Month'",
    time: "5h ago",
    read: true,
    type: "social",
  },
];

export default function NotificationCenter() {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex justify-between items-center">
            <h4 className="font-heading font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {mockNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                  !notification.read && "bg-primary/5"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h5 className={cn("text-sm font-medium", !notification.read && "text-primary")}>
                    {notification.title}
                  </h5>
                  <span className="text-[10px] text-muted-foreground">{notification.time}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {notification.message}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="text-xs w-full h-8">
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
