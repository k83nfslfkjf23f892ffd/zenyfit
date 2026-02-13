'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { EXERCISE_INFO, CALISTHENICS_BASE_TYPES } from '@shared/constants';

// Base exercise categories for challenge creation
const EXERCISE_CATEGORIES = [
  { id: 'pullups', name: 'Pull-ups', unit: 'reps', hasVariants: true },
  { id: 'pushups', name: 'Push-ups', unit: 'reps', hasVariants: true },
  { id: 'dips', name: 'Dips', unit: 'reps', hasVariants: true },
  { id: 'hangs', name: 'Hangs', unit: 'sec', hasVariants: true },
  { id: 'running', name: 'Running', unit: 'km', hasVariants: false },
];

type BaseExerciseType = keyof typeof CALISTHENICS_BASE_TYPES;

export default function CreateChallengePage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseType, setBaseType] = useState('pullups');
  const [selectedVariant, setSelectedVariant] = useState('pullups');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('7');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if current base type has variants
  const hasVariants = baseType in CALISTHENICS_BASE_TYPES;
  const variants = hasVariants
    ? CALISTHENICS_BASE_TYPES[baseType as BaseExerciseType].variations
    : [];

  // When base type changes, update selected variant
  useEffect(() => {
    if (hasVariants) {
      const baseConfig = CALISTHENICS_BASE_TYPES[baseType as BaseExerciseType];
      if (baseConfig && !(baseConfig.variations as readonly string[]).includes(selectedVariant)) {
        setSelectedVariant(baseConfig.variations[0]);
      }
    } else {
      setSelectedVariant(baseType);
    }
  }, [baseType, hasVariants, selectedVariant]);

  // Get the actual exercise type to use
  const getActiveType = () => {
    if (hasVariants) return selectedVariant;
    return baseType;
  };

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
          type: getActiveType(),
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
    return null;
  }

  if (!user) {
    return null;
  }

  const selectedCategory = EXERCISE_CATEGORIES.find((t) => t.id === baseType);
  const activeType = getActiveType();
  const activeTypeInfo = EXERCISE_INFO[activeType];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/challenges">
              <ArrowLeft className="h-5 w-5 text-foreground/40" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create Challenge</h1>
            <p className="text-sm text-foreground/50">Set a goal and compete</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Challenge Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm text-foreground/70">Title</Label>
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
                <Label htmlFor="description" className="text-sm text-foreground/70">Description (optional)</Label>
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
                <Label className="text-sm text-foreground/70">Exercise Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EXERCISE_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setBaseType(category.id)}
                      disabled={submitting}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        baseType === category.id
                          ? 'gradient-bg text-white glow-sm'
                          : 'bg-surface/50 border border-border/50 hover:bg-surface/80'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Variant selector for calisthenics */}
                {hasVariants && variants.length > 1 && (
                  <div className="mt-3">
                    <Label className="text-xs text-foreground/40 mb-2 block">Variation</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {variants.map((variant) => {
                        const variantInfo = EXERCISE_INFO[variant];
                        const baseLabel = CALISTHENICS_BASE_TYPES[baseType as BaseExerciseType]?.label || '';
                        // Shorten the label by removing the base type name
                        const shortLabel = variantInfo?.label
                          .replace(` ${baseLabel}`, '')
                          .replace(baseLabel, 'Standard') || variant;

                        return (
                          <button
                            key={variant}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            disabled={submitting}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              selectedVariant === variant
                                ? 'gradient-bg text-white'
                                : 'bg-surface/50 border border-border/50 hover:bg-surface/80'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show selected exercise info */}
                {activeTypeInfo && (
                  <p className="text-xs text-foreground/40 mt-2">
                    Selected: <span className="font-medium text-foreground/70">{activeTypeInfo.label}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal" className="text-sm text-foreground/70">
                  Goal ({activeTypeInfo?.unit || selectedCategory?.unit || 'reps'})
                </Label>
                <Input
                  id="goal"
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={`e.g., ${baseType === 'running' ? '50' : '100'}`}
                  min="1"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm text-foreground/70">Duration (days)</Label>
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
                <Label htmlFor="isPublic" className="font-normal text-foreground/70">
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
