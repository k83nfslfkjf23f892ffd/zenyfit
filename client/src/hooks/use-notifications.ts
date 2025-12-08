export function useNotifications() {
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
        // Request permission if not already granted or denied
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } else if (Notification.permission !== 'denied') {
      if (permission === 'granted') {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      }
    }
  };


  const challengeInviteNotification = async (invitedBy: string, challengeName: string) => {
    await showNotification('Challenge Invite 🏆', {
      body: `${invitedBy} invited you to join "${challengeName}"`,
      tag: 'challenge-invite',
      requireInteraction: true,
    });
  };

  const challengeDeadlineNotification = async (challengeName: string, hoursLeft: number) => {
    await showNotification('Challenge Deadline Approaching! ⏰', {
      body: `"${challengeName}" ends in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Keep pushing!`,
      tag: 'challenge-deadline',
      requireInteraction: false,
    });
  };

  const rankChangeNotification = async (newRank: number, challengeName: string) => {
    await showNotification('Rank Updated 🚀', {
      body: `You're now rank #${newRank} in "${challengeName}"!`,
      tag: 'rank-change',
      requireInteraction: false,
    });
  };

  const remindWorkoutNotification = async () => {
    await showNotification('Time to Log Your Workout! 🏋️', {
      body: 'Stay consistent with your fitness goals. Log your workout now!',
      tag: 'workout-reminder',
      requireInteraction: false,
    });
  };

  return {
    requestPermission,
    showNotification,
    challengeInviteNotification,
    challengeDeadlineNotification,
    rankChangeNotification,
    remindWorkoutNotification,
  };
}
