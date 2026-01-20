'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shuffle, User, Link, Save, Loader2, Undo2, Redo2, Palette, Sparkles, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserAvatar,
  getRandomFitnessAvatar,
  getAvatarWithNewStyle,
  getAvatarWithNewSeed,
  getAvatarWithNewColor,
  isValidAvatarUrl,
} from '@/lib/avatar';

interface AvatarPickerProps {
  username: string;
  currentAvatar?: string | null;
  onSave: (avatarUrl: string) => Promise<void>;
}

export function AvatarPicker({ username, currentAvatar, onSave }: AvatarPickerProps) {
  const initialAvatar = currentAvatar || getUserAvatar(username);
  const [history, setHistory] = useState<string[]>([initialAvatar]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [customUrl, setCustomUrl] = useState(currentAvatar || '');
  const [saving, setSaving] = useState(false);

  const previewUrl = history[historyIndex];
  const hasChanges = previewUrl !== currentAvatar;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const addToHistory = (url: string) => {
    // Truncate any forward history and add new entry
    const newHistory = [...history.slice(0, historyIndex + 1), url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCustomUrl(url);
  };

  const handleRandomize = () => {
    const newUrl = getRandomFitnessAvatar();
    addToHistory(newUrl);
  };

  const handleNewStyle = () => {
    const newUrl = getAvatarWithNewStyle(previewUrl);
    addToHistory(newUrl);
  };

  const handleNewFace = () => {
    const newUrl = getAvatarWithNewSeed(previewUrl);
    addToHistory(newUrl);
  };

  const handleNewColor = () => {
    const newUrl = getAvatarWithNewColor(previewUrl);
    addToHistory(newUrl);
  };

  const handleCustomUrl = () => {
    if (isValidAvatarUrl(customUrl)) {
      addToHistory(customUrl);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(customUrl);
    toast.success('URL copied!');
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await onSave(previewUrl);
      setCustomUrl(previewUrl);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setHistoryIndex(historyIndex - 1);
      setCustomUrl(history[historyIndex - 1]);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      setHistoryIndex(historyIndex + 1);
      setCustomUrl(history[historyIndex + 1]);
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
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            disabled={saving || !canGoBack}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleRandomize}
            className="gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Random
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleForward}
            disabled={saving || !canGoForward}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Customize Parts */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewStyle}
            className="gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Style
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewFace}
            className="gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Face
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewColor}
            className="gap-1"
          >
            <Palette className="w-3 h-3" />
            Color
          </Button>
        </div>

        {/* Avatar URL */}
        <div className="space-y-3">
          <Label htmlFor="avatar-url">Avatar URL</Label>
          <textarea
            id="avatar-url"
            placeholder="https://example.com/avatar.png"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyUrl} className="flex-1 gap-2">
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button onClick={handleCustomUrl} className="flex-1 gap-2">
              <Link className="w-4 h-4" />
              Use
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
