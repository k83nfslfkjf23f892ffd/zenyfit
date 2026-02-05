'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  savePushSubscription,
  deletePushSubscription,
  showTestNotification,
} from '@/lib/push-notifications';

export function NotificationSettings() {
  const { firebaseUser } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
    checkNotificationStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/notifications/subscribe', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const handleEnableNotifications = async () => {
    if (!supported) {
      toast.error('Push notifications are not supported in your browser');
      return;
    }

    setLoading(true);

    try {
      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Notification permission denied');
        setLoading(false);
        return;
      }

      // Get VAPID public key from config
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();

      if (!config.webPushPublicKey) {
        toast.error('Push notifications are not configured on the server');
        setLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications(config.webPushPublicKey);

      // Save subscription to server
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        setLoading(false);
        return;
      }

      const saved = await savePushSubscription(subscription, token);

      if (saved) {
        setEnabled(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);

    try {
      await unsubscribeFromPushNotifications();

      const token = await firebaseUser?.getIdToken();
      if (token) {
        await deletePushSubscription(token);
      }

      setEnabled(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showTestNotification();
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg gradient-bg-subtle">
              <BellOff className="h-4 w-4 text-primary" />
            </div>
            Push Notifications
          </CardTitle>
          <p className="text-xs text-foreground/40 mt-1">Not supported in your browser</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg gradient-bg-subtle">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications" className="flex flex-col gap-1">
            <span>Enable Push Notifications</span>
            <span className="text-xs text-foreground/40 font-normal">
              Permission: {permission}
            </span>
          </Label>
          <Switch
            id="push-notifications"
            checked={enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                handleEnableNotifications();
              } else {
                handleDisableNotifications();
              }
            }}
            disabled={loading}
          />
        </div>

        {enabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            className="w-full"
          >
            Send Test Notification
          </Button>
        )}

        <div className="text-xs text-foreground/40 space-y-1">
          <p>You&apos;ll receive notifications for:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Level-up achievements</li>
            <li>New badges unlocked</li>
            <li>Challenge invitations</li>
            <li>Challenge milestones</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
