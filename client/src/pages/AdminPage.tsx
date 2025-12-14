import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { Users, Activity, Trophy, Zap, Shield, Ban, Trash2, Search, TrendingUp, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminStats = {
  totalUsers: number;
  totalWorkouts: number;
  totalChallenges: number;
  totalXP: number;
  newUsers: number;
  activeUsers: number;
  topUsers: Array<{ userId: string; username: string; xp: number; level: number }>;
};

type User = {
  userId: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  createdAt: number;
  isBanned: boolean;
  isAdmin: boolean;
  followerCount: number;
  followingCount: number;
};

type RecentActivity = {
  id: string;
  type: string;
  userId: string;
  username: string;
  exerciseType: string;
  amount: number;
  timestamp: number;
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: User } | null>(null);

  useEffect(() => {
    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();

      // Load stats
      const statsRes = await fetch(getApiUrl("/api/admin?action=stats"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load users
      const usersRes = await fetch(getApiUrl("/api/admin?action=users&limit=100"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
      }

      // Load recent activity
      const activityRes = await fetch(getApiUrl("/api/admin?action=activity"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activityData = await activityRes.json();
      if (activityData.success) {
        setActivities(activityData.activities);
      }
    } catch (error: any) {
      console.error("Load admin data error:", error);
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/admin?action=ban"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "User banned", description: "User has been banned successfully" });
        loadAdminData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Ban failed",
        description: error.message || "Could not ban user",
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const handleUnbanUser = async (userId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/admin?action=unban"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "User unbanned", description: "User has been unbanned successfully" });
        loadAdminData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Unban failed",
        description: error.message || "Could not unban user",
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/admin?action=user"), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "User deleted", description: "User and all data have been removed" });
        loadAdminData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete user",
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/admin?action=promote"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "User promoted", description: "User is now an admin" });
        loadAdminData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Promotion failed",
        description: error.message || "Could not promote user",
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
    <Card className="border-none shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", `bg-${color}-500/10`)}>
            <Icon size={20} className={`text-${color}-500`} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-heading">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading admin panel...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Shield size={48} className="mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have admin permissions</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-primary" />
          <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Users}
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                subtitle={`+${stats.newUsers} this week`}
                color="blue"
              />
              <StatCard
                icon={Activity}
                title="Active Users"
                value={stats.activeUsers.toLocaleString()}
                subtitle="Last 7 days"
                color="green"
              />
              <StatCard
                icon={TrendingUp}
                title="Total Workouts"
                value={stats.totalWorkouts.toLocaleString()}
                color="purple"
              />
              <StatCard
                icon={Trophy}
                title="Challenges"
                value={stats.totalChallenges.toLocaleString()}
                color="yellow"
              />
            </div>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Top Users by XP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topUsers.slice(0, 5).map((u, idx) => (
                    <div key={u.userId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{u.username}</p>
                          <p className="text-xs text-muted-foreground">Level {u.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{u.xp.toLocaleString()} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline">
                <Search size={18} />
              </Button>
            </div>

            <div className="space-y-2">
              {filteredUsers.map(u => (
                <Card key={u.userId} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{u.username}</p>
                          {u.isAdmin && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                              ADMIN
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-bold">
                              BANNED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Level {u.level} • {u.xp.toLocaleString()} XP • {u.followerCount} followers
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!u.isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ type: "promote", user: u })}
                          >
                            <UserPlus size={14} />
                          </Button>
                        )}
                        {u.isBanned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnbanUser(u.userId)}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ type: "ban", user: u })}
                          >
                            <Ban size={14} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmAction({ type: "delete", user: u })}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-3 mt-4">
            {activities.map(activity => (
              <Card key={activity.id} className="border-none shadow-sm">
                <CardContent className="p-3">
                  <p className="text-sm">
                    <span className="font-semibold">{activity.username}</span> logged{" "}
                    <span className="font-semibold text-primary">{activity.amount}</span>{" "}
                    {activity.exerciseType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction?.type === "ban" && "Ban User"}
                {confirmAction?.type === "delete" && "Delete User"}
                {confirmAction?.type === "promote" && "Promote to Admin"}
              </DialogTitle>
              <DialogDescription>
                {confirmAction?.type === "ban" &&
                  `Are you sure you want to ban ${confirmAction.user.username}? They won't be able to access the platform.`
                }
                {confirmAction?.type === "delete" &&
                  `Are you sure you want to permanently delete ${confirmAction.user.username}? This will remove all their data and cannot be undone.`
                }
                {confirmAction?.type === "promote" &&
                  `Are you sure you want to promote ${confirmAction.user.username} to admin? They will have full administrative access.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmAction?.type === "delete" ? "destructive" : "default"}
                onClick={() => {
                  if (!confirmAction) return;
                  if (confirmAction.type === "ban") handleBanUser(confirmAction.user.userId);
                  else if (confirmAction.type === "delete") handleDeleteUser(confirmAction.user.userId);
                  else if (confirmAction.type === "promote") handlePromoteToAdmin(confirmAction.user.userId);
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
