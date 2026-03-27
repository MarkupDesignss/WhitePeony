// types/versionTypes.ts

export interface VersionResponse {
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
  androidUrl: string;
  iosUrl: string;
}
