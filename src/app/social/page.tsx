'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Bug, MessageCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { listContainerVariants, listItemVariants } from '@/lib/animations';
import { UserHeaderWidget } from '@/components/widgets';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'idea', label: 'Idea', icon: Lightbulb },
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'opinion', label: 'Opinion', icon: MessageCircle },
] as const;

type Category = typeof CATEGORIES[number]['value'];

interface FeedbackItem {
  id: string;
  category: Category;
  message: string;
  createdAt: number;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const categoryStyles: Record<Category, { bg: string; text: string }> = {
  idea: { bg: 'bg-yellow-500/15', text: 'text-yellow-500' },
  bug: { bg: 'bg-red-500/15', text: 'text-red-500' },
  opinion: { bg: 'bg-blue-500/15', text: 'text-blue-500' },
};

export default function SocialPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const [category, setCategory] = useState<Category>('idea');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const firebaseUserRef = useRef(firebaseUser);
  firebaseUserRef.current = firebaseUser;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchFeedback = useCallback(async () => {
    try {
      const token = await firebaseUserRef.current?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/feedback', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
      }
    } catch {
      // Silently fail — feed just stays empty
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (firebaseUser) fetchFeedback();
  }, [fetchFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error('Message is too short');
      return;
    }

    setSubmitting(true);
    try {
      const token = await firebaseUserRef.current?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, message: trimmed }),
      });

      if (res.ok) {
        toast.success('Feedback submitted!');
        setMessage('');
        fetchFeedback();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to submit');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !user) return null;
  if (!user) return null;

  return (
    <AppLayout>
      <UserHeaderWidget user={user} />

      <div className="h-2" />

      <motion.div
        className="space-y-4 pb-6"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Submit feedback */}
        <motion.div variants={listItemVariants}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Share your feedback</p>

              {/* Category pills */}
              <div className="flex gap-2">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      category === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-foreground/50 active:bg-muted'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Message input */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder={
                  category === 'idea' ? 'I have an idea...'
                    : category === 'bug' ? 'I found a bug...'
                    : 'I think...'
                }
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/30">{message.length}/500</span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || message.trim().length < 3}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feedback feed */}
        {loadingFeed ? (
          <motion.div variants={listItemVariants} className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </motion.div>
        ) : feedback.length === 0 ? (
          <motion.div variants={listItemVariants} className="text-center py-8">
            <p className="text-sm text-foreground/40">No feedback yet. Be the first!</p>
          </motion.div>
        ) : (
          feedback.map((item) => {
            const style = categoryStyles[item.category];
            const catInfo = CATEGORIES.find(c => c.value === item.category);
            const Icon = catInfo?.icon || MessageCircle;
            return (
              <motion.div key={item.id} variants={listItemVariants}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', style.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', style.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs font-medium', style.text)}>
                            {catInfo?.label}
                          </span>
                          <span className="text-xs text-foreground/25">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/70 whitespace-pre-wrap break-words">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </AppLayout>
  );
}
