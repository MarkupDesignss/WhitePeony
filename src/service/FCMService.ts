// src/notifications/services/FCMService.ts
import messaging from '@react-native-firebase/messaging';
import PushNotificationService from './PushNotificationService';

class FCMService {
  static async init() {
    // Get FCM token
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Listen for foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      PushNotificationService.displayNotification(remoteMessage);
    });

    // Handle background/quit messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
    });

    // Optional: handle when user taps notification
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened:', remoteMessage);
    });
  }
}

export default FCMService;
