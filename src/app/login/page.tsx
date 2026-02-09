'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginComplete, setLoginComplete] = useState(false);

  useEffect(() => {
    if (loginComplete && user) {
      router.replace('/dashboard');
    }
  }, [loginComplete, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 3) {
      toast.error('Please enter your username');
      return;
    }

    if (password.length < 7) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      await signIn(username, password);
      toast.success('Welcome back!');
      setLoginComplete(true);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        toast.error('Invalid username or password');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        toast.error('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-sm text-foreground/50">Welcome back</p>
        </div>

        {/* Login Form */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-foreground/70">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground/70">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
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

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground/50">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <p className="text-xs text-foreground/30">
            ZenyFit is invite-only
          </p>
        </div>
      </div>
    </div>
  );
}
