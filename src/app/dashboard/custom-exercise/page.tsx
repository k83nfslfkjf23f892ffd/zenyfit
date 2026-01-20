'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCustomExercisePage() {
  const router = useRouter();
  const { user, firebaseUser } = useAuth();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('reps');
  const [quickActions, setQuickActions] = useState('5,10,15,20');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }

    setCreating(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      // Parse quick actions
      const parsedQuickActions = quickActions
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)
        .slice(0, 6);

      const response = await fetch('/api/exercises/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim() || 'reps',
          quickActions: parsedQuickActions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create exercise');
        return;
      }

      toast.success(`Created "${name}"`);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error creating custom exercise:', error);
      toast.error('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Custom Exercise</CardTitle>
            <CardDescription>
              Custom exercises are for tracking only (no XP)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exerciseName">Exercise Name</Label>
              <Input
                id="exerciseName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Squats, Meditation, etc."
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exerciseUnit">Unit</Label>
              <Input
                id="exerciseUnit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., reps, minutes, sets"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quickActions">Quick Add Values (comma-separated)</Label>
              <Input
                id="quickActions"
                value={quickActions}
                onChange={(e) => setQuickActions(e.target.value)}
                placeholder="e.g., 5,10,15,20"
              />
              <p className="text-xs text-muted-foreground">
                Up to 6 values for quick selection
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creating ? 'Creating...' : 'Create Exercise'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
