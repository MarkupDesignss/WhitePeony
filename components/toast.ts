import Toast from 'react-native-toast-message';

export const toastConfig = {
  success: ({ text1 }: any) => (
    Toast.show({
      type: 'success',
      text1,
    })
  ),
};
