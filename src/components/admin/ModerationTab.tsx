'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  type: string;
  goal: number;
  isPublic: boolean;
  participants: Array<{ username: string }>;
  createdAt: number;
}

interface CustomExercise {
  id: string;
  userId: string;
  name: string;
  unit: string;
  createdAt: number;
}

interface Activity {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  type: string;
  amount: number;
  timestamp: number;
  xpEarned: number;
}

interface ModerationData {
  challenges?: Challenge[];
  customExercises?: CustomExercise[];
  recentActivity?: Activity[];
}

export function ModerationTab() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<ModerationData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('challenges');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/moderation?type=all&limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching moderation data:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (type: 'challenge' | 'customExercise' | 'workoutLog', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/moderation', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, id }),
      });

      if (response.ok) {
        alert('Content deleted successfully');
        fetchData();
      } else {
        const result = await response.json();
        alert(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Review and manage user-generated content</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="exercises">Custom Exercises</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Challenges</CardTitle>
              <CardDescription>Public and private challenges</CardDescription>
            </CardHeader>
            <CardContent>
              {!data.challenges || data.challenges.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No challenges found</p>
              ) : (
                <div className="space-y-4">
                  {data.challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="p-4 border rounded-lg flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{challenge.title}</h3>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {challenge.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            {challenge.type} • Goal: {challenge.goal}
                          </span>
                          <span className="text-muted-foreground">
                            {challenge.participants.length} participant(s)
                          </span>
                          <span className={challenge.isPublic ? 'text-green-500' : 'text-amber-500'}>
                            {challenge.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete('challenge', challenge.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Exercises</CardTitle>
              <CardDescription>User-created exercises</CardDescription>
            </CardHeader>
            <CardContent>
              {!data.customExercises || data.customExercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No custom exercises found</p>
              ) : (
                <div className="space-y-3">
                  {data.customExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold">{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Unit: {exercise.unit}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete('customExercise', exercise.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest workout logs across all users</CardDescription>
            </CardHeader>
            <CardContent>
              {!data.recentActivity || data.recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 border rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {activity.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activity.avatar}
                            alt={activity.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {activity.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{activity.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.type}: {activity.amount} • {activity.xpEarned} XP
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete('workoutLog', activity.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
