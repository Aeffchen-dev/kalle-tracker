import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Check if we're running in a native app
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativeApp()) {
    // For web, try using the Notification API
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Check if notifications are enabled
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativeApp()) {
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

// Schedule a walk reminder notification
export const scheduleWalkReminder = async (
  walkTime: Date,
  title: string,
  body: string
): Promise<void> => {
  // For web, use setTimeout to show notification at the scheduled time
  if (!isNativeApp()) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const delay = walkTime.getTime() - Date.now();
      if (delay > 0) {
        // Store timeout ID to allow cancellation
        const timeoutId = setTimeout(() => {
          new Notification(title, { 
            body, 
            icon: '/favicon.png',
            tag: 'walk-reminder',
            requireInteraction: true
          });
        }, delay);
        // Store for later cancellation
        (window as any).__walkReminderTimeout = timeoutId;
        console.log('Web walk reminder scheduled for:', walkTime);
      }
    }
    return;
  }

  try {
    // Cancel any existing walk reminders first
    await cancelWalkReminders();

    const options: ScheduleOptions = {
      notifications: [
        {
          id: 1001, // Fixed ID for walk reminders
          title,
          body,
          schedule: { at: walkTime },
          sound: 'default',
          actionTypeId: 'WALK_REMINDER',
          extra: { type: 'walk_reminder' }
        }
      ]
    };

    await LocalNotifications.schedule(options);
    console.log('Walk reminder scheduled for:', walkTime);
  } catch (error) {
    console.error('Error scheduling walk reminder:', error);
  }
};

// Cancel walk reminder notifications
export const cancelWalkReminders = async (): Promise<void> => {
  if (!isNativeApp()) {
    // Cancel web timeout
    if ((window as any).__walkReminderTimeout) {
      clearTimeout((window as any).__walkReminderTimeout);
      (window as any).__walkReminderTimeout = null;
    }
    return;
  }

  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });
  } catch (error) {
    console.error('Error canceling walk reminders:', error);
  }
};

// Show an immediate notification (for alerts)
export const showNotification = async (
  id: number,
  title: string,
  body: string
): Promise<void> => {
  if (!isNativeApp()) {
    // Use web Notification API for immediate notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { 
        body, 
        icon: '/favicon.png',
        tag: `notification-${id}`
      });
    }
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) }, // Schedule for "now"
          sound: 'default'
        }
      ]
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

// Register notification action types
export const registerNotificationActions = async (): Promise<void> => {
  if (!isNativeApp()) return;

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'WALK_REMINDER',
          actions: [
            {
              id: 'done',
              title: 'Erledigt'
            },
            {
              id: 'snooze',
              title: 'Später erinnern'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error registering notification actions:', error);
  }
};

// Initialize notifications (call on app start)
export const initializeNotifications = async (): Promise<void> => {
  const hasPermission = await checkNotificationPermissions();
  
  if (!hasPermission) {
    await requestNotificationPermissions();
  }

  if (isNativeApp()) {
    await registerNotificationActions();

    // Listen for notification actions
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Notification action:', notification.actionId);
      
      if (notification.actionId === 'snooze') {
        // Reschedule for 30 minutes later
        const snoozeTime = new Date(Date.now() + 30 * 60 * 1000);
        scheduleWalkReminder(snoozeTime, 'Bald Gassi-Zeit', 'Zeit für einen Spaziergang!');
      }
    });
  }
};
