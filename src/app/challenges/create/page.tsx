'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const EXERCISE_TYPES = [
  { id: 'pullups', name: 'Pull-ups', unit: 'reps' },
  { id: 'pushups', name: 'Push-ups', unit: 'reps' },
  { id: 'dips', name: 'Dips', unit: 'reps' },
  { id: 'running', name: 'Running', unit: 'km' },
];

export default function CreateChallengePage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('pullups');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('7');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!goal || parseInt(goal) <= 0) {
      toast.error('Please enter a valid goal');
      return;
    }

    setSubmitting(true);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          goal: parseInt(goal),
          duration: parseInt(duration),
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create challenge');
        return;
      }

      toast.success('Challenge created!');
      router.push(`/challenges/${data.challenge.id}`);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const selectedType = EXERCISE_TYPES.find((t) => t.id === type);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/challenges">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Challenge</h1>
            <p className="text-muted-foreground">Set a goal and compete</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Challenge Details</CardTitle>
            <CardDescription>Define your challenge parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 100 Pull-ups Challenge"
                  maxLength={100}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this challenge about?"
                  maxLength={500}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Exercise Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EXERCISE_TYPES.map((exerciseType) => (
                    <Button
                      key={exerciseType.id}
                      type="button"
                      variant={type === exerciseType.id ? 'default' : 'outline'}
                      onClick={() => setType(exerciseType.id)}
                      disabled={submitting}
                      className="w-full"
                    >
                      {exerciseType.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">
                  Goal ({selectedType?.unit || 'reps'})
                </Label>
                <Input
                  id="goal"
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={`e.g., ${type === 'running' ? '50' : '100'}`}
                  min="1"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="365"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="isPublic" className="font-normal">
                  Make this challenge public (anyone can join)
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Challenge'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
