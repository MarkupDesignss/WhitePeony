import React, { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import './src/components/TextOverride';

import HomeStackNavigator from './src/navigations/HomeStackNavigation';
import { CommonLoaderProvider } from './src/components/CommonLoader/commonLoader';
import { UserDataContextProvider, WishlistProvider } from './src/context';
import { CartProvider } from './src/context/CartContext';
import { TranslationProvider } from './src/hooks/useTranslate';
import { NetworkProvider } from './src/context/NetworkContext';

import NetworkStatus from './components/NetworkStatus';
import Toast from 'react-native-toast-message';

import notifee, { AndroidImportance } from '@notifee/react-native';

import 'react-native-reanimated';
import 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'https://www.markupdesigns.net',
    'http://www.markupdesigns.net',
    'whitepeony://',
  ],
  config: {
    screens: {
      // ArticleDetails is directly in HomeStackNavigator, not nested
      ArticleDetails: 'article/:slug',

      // If you want to add other deep links
      ProductDetails: 'product/:id',
      EventDetails: 'event/:id',
      // etc...
    },
  },
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    console.log('Initial URL:', url);
    return url;
  },
  subscribe: listener => {
    const onReceiveURL = ({ url }) => {
      console.log('Deep link received:', url);
      listener(url);
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);
    return () => subscription.remove();
  },
};

function App() {
  const theme = useColorScheme();

  useEffect(() => {
    const createChannel = async () => {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
    };
    createChannel();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NetworkProvider>
          <TranslationProvider>
            <CommonLoaderProvider>
              <UserDataContextProvider>
                <WishlistProvider>
                  <CartProvider>
                    <NetworkStatus />
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <NavigationContainer
                        linking={linking}
                        theme={theme === 'dark' ? DarkTheme : DefaultTheme}
                      >
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                          <Stack.Screen
                            name="HomeStackNavigator"
                            component={HomeStackNavigator}
                          />
                        </Stack.Navigator>
                      </NavigationContainer>
                    </GestureHandlerRootView>
                    <Toast />
                  </CartProvider>
                </WishlistProvider>
              </UserDataContextProvider>
            </CommonLoaderProvider>
          </TranslationProvider>
        </NetworkProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
