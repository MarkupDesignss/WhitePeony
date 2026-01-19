
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import './src/components/TextOverride';
import React, { useEffect } from 'react';
import HomeStackNavigator from './src/navigations/HomeStackNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import {  CommonLoaderProvider } from './src/components/CommonLoader/commonLoader';
import { UserDataContextProvider, WishlistProvider } from './src/context';
import Toast from 'react-native-toast-message';
import NetworkStatus from './components/NetworkStatus';
import NotificationService, { handleNotifeeBackgroundEvent } from './src/service/NotificationService';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { CartProvider } from './src/context/CartContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated'; // 👈 import this early
import 'react-native-gesture-handler';
import { TranslationProvider } from './src/hooks/useTranslate';
import { NetworkProvider } from './src/context/NetworkContext';


const Stack = createNativeStackNavigator();

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

    NotificationService.requestUserPermission();
    NotificationService.listenToForegroundMessages();
    NotificationService.listenToBackgroundMessages();
    handleNotifeeBackgroundEvent();
  }, [])

  return (
    <>
      <NetworkProvider>

        <TranslationProvider>
          <CommonLoaderProvider>
            <UserDataContextProvider>
              <WishlistProvider>
                <CartProvider>
                  <NetworkStatus />
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
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

    </>

  );
}

export default App;