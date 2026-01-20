'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shuffle, User, Link, Save, Loader2 } from 'lucide-react';
import {
  FITNESS_AVATAR_STYLES,
  getUserAvatar,
  getRandomFitnessAvatar,
  isValidAvatarUrl,
  type AvatarStyle
} from '@/lib/avatar';

interface AvatarPickerProps {
  username: string;
  currentAvatar?: string | null;
  onSave: (avatarUrl: string) => Promise<void>;
}

export function AvatarPicker({ username, currentAvatar, onSave }: AvatarPickerProps) {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('bottts');
  const [customUrl, setCustomUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || getUserAvatar(username));
  const [saving, setSaving] = useState(false);

  const hasChanges = previewUrl !== currentAvatar;

  const handleStyleChange = (style: AvatarStyle) => {
    setSelectedStyle(style);
    const newUrl = getUserAvatar(username, style);
    setPreviewUrl(newUrl);
  };

  const handleRandomize = () => {
    const newUrl = getRandomFitnessAvatar();
    setPreviewUrl(newUrl);
  };

  const handleCustomUrl = () => {
    if (isValidAvatarUrl(customUrl)) {
      setPreviewUrl(customUrl);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await onSave(previewUrl);
    } finally {
      setSaving(false);
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
              {saving ? 'Saving...' : 'Save Avatar'}
            </Button>
          )}
        </div>

        {/* Generated Avatars */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Generated Avatars</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomize}
              className="gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Random
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {FITNESS_AVATAR_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => handleStyleChange(style)}
                className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedStyle === style
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                title={style}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getUserAvatar(username, style)}
                  alt={style}
                  className="w-full h-auto rounded-md"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Custom URL */}
        <div className="space-y-3">
          <Label htmlFor="custom-avatar">Custom Avatar URL</Label>
          <div className="flex gap-2">
            <Input
              id="custom-avatar"
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
