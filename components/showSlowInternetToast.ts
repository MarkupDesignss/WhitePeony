import Toast from 'react-native-toast-message';

export function showSlowInternetToast(
  lastToastTime: React.MutableRefObject<number>
) {
  const now = Date.now();

  if (now - lastToastTime.current < 8000) return;
  lastToastTime.current = now;

  Toast.show({
    type: 'info',
    text1: 'Slow Internet Connection',
    text2: 'Some features may not work properly.',
  });
}
