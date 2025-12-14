import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { getFirebaseInstances } from "@/lib/firebase";
import { Search, Users, UserPlus, UserMinus, TrendingUp, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

type User = {
  userId: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
};

type Activity = {
  id: string;
  type: "workout";
  userId: string;
  username: string;
  avatar: string;
  exerciseType: string;
  amount: number;
  unit: string;
  timestamp: number;
  xpGained: number;
};

export default function SocialPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"feed" | "search" | "followers" | "following">("feed");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Followers/Following state
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Feed state
  const [feed, setFeed] = useState<Activity[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Track following status for each user
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

  // Load feed on mount
  useEffect(() => {
    if (activeTab === "feed") {
      loadFeed();
    }
  }, [activeTab]);

  // Load followers when tab is selected
  useEffect(() => {
    if (activeTab === "followers") {
      loadFollowers();
    }
  }, [activeTab]);

  // Load following when tab is selected
  useEffect(() => {
    if (activeTab === "following") {
      loadFollowing();
    }
  }, [activeTab]);

  const loadFeed = async () => {
    if (!user) return;

    setLoadingFeed(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/social?action=feed"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setFeed(data.activities || []);
      }
    } catch (error) {
      console.error("Load feed error:", error);
      toast({
        title: "Failed to load feed",
        description: "Could not load activity feed",
        variant: "destructive",
      });
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadFollowers = async () => {
    if (!user) return;

    setLoadingFollowers(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/social?action=followers"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error("Load followers error:", error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadFollowing = async () => {
    if (!user) return;

    setLoadingFollowing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/social?action=following"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setFollowing(data.following || []);

        // Update following status
        const status: Record<string, boolean> = {};
        data.following?.forEach((u: User) => {
          status[u.userId] = true;
        });
        setFollowingStatus(status);
      }
    } catch (error) {
      console.error("Load following error:", error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleSearch = async () => {
    if (!user || !searchQuery.trim() || searchQuery.length < 2) {
      return;
    }

    setIsSearching(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        getApiUrl(`/api/social?action=search&query=${encodeURIComponent(searchQuery)}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Could not search users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { auth } = getFirebaseInstances();
      if (!auth?.currentUser) throw new Error("Not authenticated");

      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(getApiUrl("/api/social?action=follow"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, targetUserId }),
      });

      const data = await response.json();

      if (data.success) {
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: true }));
        toast({
          title: "Following!",
          description: "You are now following this user",
        });
        loadFollowing(); // Refresh following list
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Follow error:", error);
      toast({
        title: "Follow failed",
        description: error.message || "Could not follow user",
        variant: "destructive",
      });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { auth } = getFirebaseInstances();
      if (!auth?.currentUser) throw new Error("Not authenticated");

      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(getApiUrl("/api/social?action=unfollow"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, targetUserId }),
      });

      const data = await response.json();

      if (data.success) {
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: false }));
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        });
        loadFollowing(); // Refresh following list
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Unfollow error:", error);
      toast({
        title: "Unfollow failed",
        description: error.message || "Could not unfollow user",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const renderUserCard = (u: User, showFollowButton = true) => {
    const isFollowing = followingStatus[u.userId];

    return (
      <Card key={u.userId} className="border-none shadow-md">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={u.avatar || "/default-avatar.png"}
              alt={u.username}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <p className="font-semibold text-foreground">{u.username}</p>
              <p className="text-xs text-muted-foreground">
                Level {u.level} • {u.xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          {showFollowButton && (
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              onClick={() => isFollowing ? handleUnfollow(u.userId) : handleFollow(u.userId)}
              className="gap-1"
            >
              {isFollowing ? (
                <>
                  <UserMinus size={16} />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Follow
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Social</h1>
          <p className="text-xs text-muted-foreground">Connect with other athletes</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed" className="gap-1">
              <TrendingUp size={16} />
              Feed
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1">
              <Search size={16} />
              Search
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-1">
              <Users size={16} />
              Followers
              {userProfile?.followerCount ? ` (${userProfile.followerCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1">
              <UserPlus size={16} />
              Following
              {userProfile?.followingCount ? ` (${userProfile.followingCount})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-3 mt-4">
            {loadingFeed ? (
              <p className="text-center text-muted-foreground py-8">Loading feed...</p>
            ) : feed.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Dumbbell size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Follow other users to see their activity here!
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("search")}
                  >
                    Find People
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {feed.map((activity) => (
                  <Card key={activity.id} className="border-none shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={activity.avatar || "/default-avatar.png"}
                          alt={activity.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                        />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold text-foreground">
                              {activity.username}
                            </span>{" "}
                            logged{" "}
                            <span className="font-semibold text-primary">
                              {activity.amount} {activity.unit}
                            </span>{" "}
                            of {activity.exerciseType}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                            {activity.xpGained && (
                              <p className="text-xs text-primary font-semibold">
                                +{activity.xpGained} XP
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching || searchQuery.length < 2}>
                <Search size={18} />
              </Button>
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Search size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Search for users to follow and connect with
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {searchResults.map((u) => renderUserCard(u))}
              </div>
            )}
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers" className="space-y-3 mt-4">
            {loadingFollowers ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : followers.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No followers yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {followers.map((u) => renderUserCard(u))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-3 mt-4">
            {loadingFollowing ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : following.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <UserPlus size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Not following anyone yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("search")}
                  >
                    Find People
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {following.map((u) => renderUserCard(u))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
