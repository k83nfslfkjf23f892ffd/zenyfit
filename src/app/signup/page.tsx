'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function SignupForm() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const searchParams = useSearchParams();
  const [signupComplete, setSignupComplete] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation states
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteCodeChecking, setInviteCodeChecking] = useState(false);

  // Auto-fill invite code from URL
  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      setInviteCode(invite);
    }
  }, [searchParams]);

  // Redirect to dashboard once signup is complete and user is authenticated
  useEffect(() => {
    if (signupComplete && user) {
      router.replace('/dashboard');
    }
  }, [signupComplete, user, router]);

  // Validate username availability
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const response = await fetch(`/api/users/validate?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Validate invite code
  useEffect(() => {
    if (inviteCode.length === 0) {
      setInviteCodeValid(null);
      return;
    }

    const timer = setTimeout(async () => {
      setInviteCodeChecking(true);
      try {
        const response = await fetch(`/api/invites/validate?code=${encodeURIComponent(inviteCode)}`);
        const data = await response.json();
        setInviteCodeValid(data.valid);
      } catch (error) {
        console.error('Error checking invite code:', error);
      } finally {
        setInviteCodeChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usernameAvailable) {
      toast.error('Username is not available');
      return;
    }

    if (!inviteCodeValid) {
      toast.error('Invalid invite code');
      return;
    }

    if (password.length < 7) {
      toast.error('Password must be at least 7 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          inviteCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create account');
        return;
      }

      // Auto sign in after successful registration
      await signIn(username, password);

      toast.success('Account created successfully!');

      // Mark signup complete - redirect will happen via useEffect when user state updates
      setSignupComplete(true);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = usernameAvailable && inviteCodeValid && password.length >= 7;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'rgb(var(--gradient-from))' }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'rgb(var(--gradient-to))' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gradient-text">ZenyFit</h1>
          <p className="text-sm text-foreground/50">Start your fitness journey</p>
        </div>

        {/* Signup Form */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-foreground/70">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-12 characters"
                  required
                  minLength={3}
                  maxLength={12}
                  pattern="[a-zA-Z0-9_]+"
                  disabled={loading}
                  className="pr-10"
                />
                {usernameChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-foreground/30" />
                )}
                {!usernameChecking && usernameAvailable === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-foreground/40">
                Letters, numbers, and underscores only. Cannot be changed later.
              </p>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground/70">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 7 characters"
                  required
                  minLength={7}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Invite Code Input */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-sm text-foreground/70">Invite Code</Label>
              <div className="relative">
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  required
                  disabled={loading}
                  className="pr-10 font-mono tracking-wider"
                />
                {inviteCodeChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-foreground/30" />
                )}
                {!inviteCodeChecking && inviteCodeValid === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!inviteCodeChecking && inviteCodeValid === false && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-foreground/40">
                ZenyFit is invite-only
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={!isFormValid || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center">
          <p className="text-sm text-foreground/50">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-[0.06] blur-3xl"
            style={{ background: 'rgb(var(--gradient-from))' }}
          />
        </div>
        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">ZenyFit</h1>
            <p className="text-sm text-foreground/50">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
