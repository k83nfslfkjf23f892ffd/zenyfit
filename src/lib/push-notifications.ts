/**
 * Push Notifications Utility
 *
 * Handles web push notifications for ZenyFit
 * Requires VAPID keys to be configured in environment variables
 */

// Check if push notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Check current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined') return 'default';
  return Notification.permission;
}

// Request notification permission from user
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return subscription;
    }

    // Subscribe to push notifications
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const result = await subscription.unsubscribe();
      return result;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Get current push subscription
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

// Save subscription to server
export async function savePushSubscription(
  subscription: PushSubscription,
  userToken: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(subscription),
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

// Delete subscription from server
export async function deletePushSubscription(userToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return false;
  }
}

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Test notification (client-side only)
export async function showTestNotification(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Notifications not supported');
  }

  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('ZenyFit', {
      body: 'Push notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      requireInteraction: false,
    });
  } else {
    throw new Error('Notification permission denied');
  }
}
