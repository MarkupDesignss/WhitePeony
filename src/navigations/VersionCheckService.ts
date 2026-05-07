// VersionCheckService.ts
import { Platform, Alert, Linking, BackHandler } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getAppVersion } from '../service/ApiService';

export interface VersionInfo {
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
  androidUrl: string;
  iosUrl: string;
}

export class VersionCheckService {
  private static isBlocking = false;

  static compareVersions(current: string, latest: string): number {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (
      let i = 0;
      i < Math.max(currentParts.length, latestParts.length);
      i++
    ) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (currentPart < latestPart) return -1;
      if (currentPart > latestPart) return 1;
    }
    return 0;
  }

  static async checkAndBlockIfNeeded(): Promise<boolean> {
    try {
      const versionInfo: VersionInfo = await getAppVersion();

      const currentVersion = DeviceInfo.getVersion();
      const comparison = this.compareVersions(
        currentVersion,
        versionInfo.latestVersion,
      );

      if (comparison < 0 && versionInfo.forceUpdate) {
        this.showForceUpdateDialog(versionInfo);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Version check failed:', error);

      return false;
    }
  }

  private static showForceUpdateDialog(versionInfo: VersionInfo) {
    this.isBlocking = true;

    // Disable back button on Android
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        return true;
      },
    );

    const updateUrl =
      Platform.OS === 'ios' ? versionInfo.iosUrl : versionInfo.androidUrl;

    Alert.alert(
      'Update Required',
      `A new version (${versionInfo.latestVersion}) is available. This update is mandatory to continue using the app.`,
      [
        {
          text: 'Update Now',
          onPress: () => {
            Linking.openURL(updateUrl).catch(err => {
              console.error('Failed to open store:', err);
              // If opening store fails, show alert and try again
              Alert.alert(
                'Error',
                'Unable to open app store. Please update manually.',
                [
                  {
                    text: 'Retry',
                    onPress: () => this.showForceUpdateDialog(versionInfo),
                  },
                ],
                { cancelable: false },
              );
            });
          },
        },
      ],
      { cancelable: false },
    );
  }

  static isUserBlocked(): boolean {
    return this.isBlocking;
  }
}
