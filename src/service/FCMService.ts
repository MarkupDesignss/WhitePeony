// src/service/FCMService.ts
import {
  getMessaging,
  getToken,
  onMessage,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import PushNotificationService from './PushNotificationService';

class FCMService {
  private static fcmToken: string | null = null;

  // ✅ Make this method public/static so it can be accessed
  static getFCMToken(): string | null {
    return this.fcmToken;
  }

  // ✅ Optional: Add a method to check and refresh token
  static async getFreshToken(): Promise<string | null> {
    try {
      const messagingInstance = getMessaging();
      const token = await getToken(messagingInstance);
      this.fcmToken = token;
      return token;
    } catch (error) {
      console.log('❌ Error getting fresh FCM token:', error);
      return this.fcmToken;
    }
  }

  static async init() {
    try {
      console.log('🚀 FCM init called');
      const messagingInstance = getMessaging();

      // 🔑 REQUIRED STEP (fixes your error)
      await messagingInstance.registerDeviceForRemoteMessages();

      // 🔹 Now it's safe to get token
      const token = await getToken(messagingInstance);
      console.log('🔥🔥🔥 FCM TOKEN:', token);
      this.fcmToken = token; // Store the token

      // 🔹 Foreground messages
      onMessage(messagingInstance, async remoteMessage => {
        console.log('📩 Foreground message:', remoteMessage);
        PushNotificationService.displayNotification(remoteMessage);
      });

      // 🔹 Background / quit messages
      setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
        console.log('🌙 Background message:', remoteMessage);
      });

      // 🔹 Notification tap (background)
      onNotificationOpenedApp(messagingInstance, remoteMessage => {
        console.log('👉 Notification opened:', remoteMessage);
      });
    } catch (error) {
      console.log('❌ FCM init error:', error);
    }
  }
}

export default FCMService;
