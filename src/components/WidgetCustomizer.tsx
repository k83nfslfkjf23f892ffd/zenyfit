'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronUp, ChevronDown, X, RotateCcw, Loader2 } from 'lucide-react';
import { DEFAULT_WIDGET_CONFIG, getWidgetDefinition } from '@/lib/widgets';
import { toast } from 'sonner';
import type { User as FirebaseUser } from 'firebase/auth';

interface WidgetConfig {
  order: string[];
  hidden: string[];
}

interface WidgetCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WidgetConfig;
  firebaseUser: FirebaseUser | null;
  userId: string;
}

export function WidgetCustomizer({
  open,
  onOpenChange,
  config,
  firebaseUser,
  userId,
}: WidgetCustomizerProps) {
  const [localConfig, setLocalConfig] = useState<WidgetConfig>(config);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const currentIndex = localConfig.order.indexOf(widgetId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= localConfig.order.length) return;

    const newOrder = [...localConfig.order];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    setLocalConfig({ ...localConfig, order: newOrder });
  };

  const toggleWidget = (widgetId: string) => {
    const isHidden = localConfig.hidden.includes(widgetId);
    const newHidden = isHidden
      ? localConfig.hidden.filter((id) => id !== widgetId)
      : [...localConfig.hidden, widgetId];

    setLocalConfig({ ...localConfig, hidden: newHidden });
  };

  const resetToDefault = () => {
    setLocalConfig(DEFAULT_WIDGET_CONFIG);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dashboardWidgets: localConfig }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('Dashboard saved');
      onOpenChange(false);
      // Reload to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-background border rounded-t-lg sm:rounded-lg w-full sm:max-w-md max-h-[85vh] overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Customize Dashboard</h3>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-muted-foreground mb-4">
            Reorder widgets and toggle visibility
          </p>

          <div className="space-y-2">
            {localConfig.order.map((widgetId, index) => {
              const widget = getWidgetDefinition(widgetId);
              if (!widget) return null;

              const isHidden = localConfig.hidden.includes(widgetId);
              const isFirst = index === 0;
              const isLast = index === localConfig.order.length - 1;

              return (
                <div
                  key={widgetId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isHidden ? 'opacity-50 bg-muted/30' : 'bg-card'
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveWidget(widgetId, 'up')}
                      disabled={isFirst}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveWidget(widgetId, 'down')}
                      disabled={isLast}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Widget info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{widget.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {widget.description}
                    </div>
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={!isHidden}
                    onCheckedChange={() => toggleWidget(widgetId)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
