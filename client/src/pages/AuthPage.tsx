import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import minimalistLogo from "@/assets/images/minimalist_zen_fitness_logo.png";
import { signInWithEmailAndPassword, signInWithCustomToken } from "firebase/auth";
import { initializeFirebase } from "@/lib/firebase";
import { getApiUrl } from "@/lib/api";
import { toast } from "sonner";
import { Ticket } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error("Invite code is required to sign up");
      return;
    }
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!confirmPassword) {
      toast.error("Please confirm your password");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          inviteCode: inviteCode.trim().toUpperCase(),
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        toast.error(result.error || "Signup failed");
        setLoading(false);
        return;
      }
      
      const { auth } = await initializeFirebase();
      await signInWithCustomToken(auth, result.customToken);
      
      toast.success("Account created! Welcome to ZenyFit!");
      setLocation("/");

      // Request notification permission
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            toast.info("Notifications are enabled!");
          } else {
            toast.info("Notifications are blocked. You can enable them in your browser settings.");
          }
        });
      }
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = "Sign up failed";
      if (error instanceof Error) {
        if (error.message?.includes("did not match")) {
          errorMessage = "Server configuration error. Please contact support.";
        } else {
          errorMessage = error.message;
        }
      }
      // Check for Firebase auth error codes
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/invalid-api-key") {
        errorMessage = "Server configuration error. Please contact support.";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }

    setLoading(true);
    try {
      const { auth } = await initializeFirebase();
      const email = `${username.toLowerCase()}@zenyfit.local`;
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      setLocation("/");
    } catch (error) {
      console.error("Sign in error:", error);
      let errorMessage = "Login failed";
      const firebaseError = error as { code?: string; message?: string };

      if (firebaseError.message?.includes("did not match") || firebaseError.code === "auth/invalid-api-key") {
        errorMessage = "Server configuration error. Please contact support.";
      } else if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/invalid-credential") {
        errorMessage = "Username or password is incorrect";
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setInviteCode("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-4">
          <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border-4 border-primary/20">
            <img src={minimalistLogo} alt="ZenyFit Logo" className="w-full h-full object-cover p-4" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-primary">ZenyFit</h1>
          <p className="text-muted-foreground">Find your strength. Find your zen.</p>
        </div>

        <Card className="w-full border-none shadow-lg bg-white/80 backdrop-blur-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-center font-heading">
              {step === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={step === "login" ? handleSignIn : handleSignUp} className="space-y-4">
              {step === "signup" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Invite Code" 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="bg-background pl-10 uppercase tracking-wider"
                      data-testid="input-invite-code"
                      disabled={loading}
                      maxLength={19}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    You need an invite code to join ZenyFit
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Input 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="bg-background"
                  data-testid="input-username"
                  disabled={loading}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Input 
                  placeholder="Password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                  data-testid="input-password"
                  disabled={loading}
                />
              </div>
              
              {step === "signup" && (
                <div className="space-y-2">
                  <Input 
                    placeholder="Confirm Password" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background"
                    data-testid="input-confirm-password"
                    disabled={loading}
                  />
                </div>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="submit" 
                  className="w-full font-semibold" 
                  size="lg"
                  disabled={loading}
                  data-testid={step === "login" ? "button-signin" : "button-signup"}
                >
                  {loading ? "Loading..." : (step === "login" ? "Sign In" : "Create Account")}
                </Button>
              </motion.div>
            </form>

            <div className="mt-4 text-center text-sm">
              {step === "login" ? (
                <p>
                  Have an invite code?{" "}
                  <button 
                    type="button"
                    onClick={() => { resetForm(); setStep("signup"); }} 
                    className="text-primary font-semibold hover:underline cursor-pointer"
                    data-testid="link-signup"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button 
                    type="button"
                    onClick={() => { resetForm(); setStep("login"); }} 
                    className="text-primary font-semibold hover:underline cursor-pointer"
                    data-testid="link-signin"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
