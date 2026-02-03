// src/notifications/services/PushNotificationService.ts
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { RemoteMessage } from '@react-native-firebase/messaging';

class PushNotificationService {
  static async displayNotification(message: RemoteMessage) {
    await notifee.displayNotification({
      title: message.notification?.title,
      body: message.notification?.body,
      android: {
        channelId: 'default',
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher', // Add this icon to android/app/src/main/res/mipmap
        style: {
          type: AndroidStyle.BIGTEXT,
          text: message.notification?.body,
        },
      },
    });
  }

  static async createDefaultChannel() {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  }
}

export default PushNotificationService;
