import AsyncStorage from '@react-native-async-storage/async-storage';

export const LocalStorage = {
  save: async function (key: string, data: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  },

  read: async function (key: string) {
    try {
      let data = await AsyncStorage.getItem(key);
      if (data !== null) {
        return JSON.parse(data);
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  },

  empty: function (key: string) {
    try {
      AsyncStorage.setItem(key, '');
      return true;
    } catch (error) {
      return false;
    }
  },

  removeItem: async function (key: string) {
    await AsyncStorage.removeItem(key);
  },

  flushQuestionKeys: function () {
    AsyncStorage.getAllKeys().then(keys => {
      const questionKeys = keys.filter(key => {
        return key;
      });
      questionKeys.map(key => {
        if (
          key != 'fcm_token' &&
          key != 'loginId' &&
          key != 'password' &&
          key != 'rememberMe'
        ) {
          this.removeItem(key);
        }
      });
    });
  },
};
