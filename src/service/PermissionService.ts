// src/notifications/services/PermissionService.ts
import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AuthorizationStatus } from '@notifee/react-native';

class PermissionService {
  static async requestPermissions(): Promise<boolean> {
    try {
      // 🔹 ANDROID 13+ requires runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // 🔹 iOS & Android Firebase permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) return false;

      // 🔹 Notifee permission (mainly iOS)
      const notifeeSettings = await notifee.requestPermission();

      return (
        notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED
      );
    } catch (error) {
      console.log('Notification permission error:', error);
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    // 🔹 Check via Notifee (recommended)
    const settings = await notifee.getNotificationSettings();

    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  }
}

export default PermissionService;
