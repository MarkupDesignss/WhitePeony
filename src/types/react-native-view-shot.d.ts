declare module 'react-native-view-shot' {
  import { View } from 'react-native'

  export function captureRef(target: View | any, options?: { format?: string; quality?: number }): Promise<string>

  const ViewShot: any
  export default ViewShot
}
