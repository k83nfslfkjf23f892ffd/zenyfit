'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function SignupForm() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const searchParams = useSearchParams();
  const [signupComplete, setSignupComplete] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join ZenyFit and start your fitness journey</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
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
                />
                {usernameChecking && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!usernameChecking && usernameAvailable === true && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <XCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only. Cannot be changed later.
              </p>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 7 characters"
                required
                minLength={7}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                At least 7 characters
              </p>
            </div>

            {/* Invite Code Input */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <div className="relative">
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  required
                  disabled={loading}
                />
                {inviteCodeChecking && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!inviteCodeChecking && inviteCodeValid === true && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                )}
                {!inviteCodeChecking && inviteCodeValid === false && (
                  <XCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                ZenyFit is invite-only
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
