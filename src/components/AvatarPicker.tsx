'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shuffle, User, Link, Save, Loader2, Undo2 } from 'lucide-react';
import {
  getUserAvatar,
  getRandomFitnessAvatar,
  isValidAvatarUrl,
} from '@/lib/avatar';

interface AvatarPickerProps {
  username: string;
  currentAvatar?: string | null;
  onSave: (avatarUrl: string) => Promise<void>;
}

export function AvatarPicker({ username, currentAvatar, onSave }: AvatarPickerProps) {
  const [customUrl, setCustomUrl] = useState(currentAvatar || '');
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || getUserAvatar(username));
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasChanges = previewUrl !== currentAvatar;
  const canRevert = previousUrl !== null && previousUrl !== previewUrl;

  const handleRandomize = () => {
    setPreviousUrl(previewUrl);
    const newUrl = getRandomFitnessAvatar();
    setPreviewUrl(newUrl);
    setCustomUrl(newUrl);
  };

  const handleCustomUrl = () => {
    if (isValidAvatarUrl(customUrl)) {
      setPreviousUrl(previewUrl);
      setPreviewUrl(customUrl);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await onSave(previewUrl);
      setCustomUrl(previewUrl);
      setPreviousUrl(null);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (previousUrl) {
      const current = previewUrl;
      setPreviewUrl(previousUrl);
      setCustomUrl(previousUrl);
      setPreviousUrl(current);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Avatar
        </CardTitle>
        <CardDescription>
          Choose a generated avatar or use a custom image URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Avatar preview"
              className={`w-32 h-32 rounded-full border-4 ${hasChanges ? 'border-yellow-500' : 'border-primary'}`}
            />
            {hasChanges && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs bg-yellow-500 text-yellow-950 px-2 py-0.5 rounded-full font-medium">
                Unsaved
              </span>
            )}
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>

        {/* Avatar Actions */}
        <div className="flex justify-center gap-2">
          {canRevert && (
            <Button variant="outline" onClick={handleRevert} disabled={saving} className="gap-2">
              <Undo2 className="w-4 h-4" />
              Revert
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRandomize}
            className="gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Random
          </Button>
        </div>

        {/* Avatar URL */}
        <div className="space-y-3">
          <Label htmlFor="avatar-url">Avatar URL</Label>
          <div className="flex gap-2">
            <Input
              id="avatar-url"
              type="url"
              placeholder="https://example.com/avatar.png"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <Button onClick={handleCustomUrl} className="gap-2">
              <Link className="w-4 h-4" />
              Use
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a direct URL to an image (must be https://)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
