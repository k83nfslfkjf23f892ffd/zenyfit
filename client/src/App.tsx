import { Switch, Route } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initializeFirebase, getFirebaseInstances } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { syncOfflineWorkouts } from "@/lib/offline-sync";
import { toast } from "sonner";
import NotFound from "@/pages/NotFoundPage";
import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/AuthPage";
import ChallengesPage from "@/pages/ChallengesPage";
import YourStatsPage from "@/pages/YourStatsPage";
import LogPage from "@/pages/LogPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AchievementsPage from "@/pages/AchievementsPage";
import AdminPage from "@/pages/AdminPage";

function Router({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/challenges" component={ChallengesPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/achievements" component={AchievementsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/profile" component={YourStatsPage} />
      <Route path="/log" component={LogPage} />
      <Route path="/settings" component={ProfileSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize default custom exercises on app startup
    const saved = localStorage.getItem("customExercises");
    if (!saved) {
      const defaults = [
        { name: "Handstand", unit: "seconds", buttons: [10, 30, 60, 120] },
        { name: "Planks", unit: "seconds", buttons: [15, 30, 45, 60] },
        { name: "Swimming", unit: "km", buttons: [1, 2, 5, 10] }
      ];
      localStorage.setItem("customExercises", JSON.stringify(defaults));
    }

    // Initialize Firebase and listen for auth state changes
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        await initializeFirebase();
        const { auth } = getFirebaseInstances();

        if (auth) {
          unsubscribe = onAuthStateChanged(auth, async (user) => {
            setIsAuthenticated(!!user);
            setLoading(false);

            // Sync offline workouts when user is authenticated and online
            if (user && navigator.onLine) {
              try {
                const syncedCount = await syncOfflineWorkouts();
                if (syncedCount > 0) {
                  toast.success(`Synced ${syncedCount} offline workout${syncedCount > 1 ? 's' : ''}`, {
                    description: "Your workouts have been uploaded to the cloud"
                  });
                }
              } catch (error) {
                console.error("Failed to sync offline workouts:", error);
              }
            }
          });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Firebase init error:", error);
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <ThemeProvider>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading ZenyFit...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Router isAuthenticated={isAuthenticated} />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
