// src/services/NotificationService.js
import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { LocalStorage } from '../helpers/localstorage';
import { EventType } from '@notifee/react-native';
import firebase from '@react-native-firebase/app';

const firebaseConfig = {
    // Only if you're using the web SDK or dynamic setup
    apiKey: "AIzaSyALkbP5wZxDQM2RZ-dl-TopkkgLIW_HVoA",
    authDomain: "whitepeaony.firebaseapp.com",
    projectId: "whitepeaony",
    storageBucket: "whitepeaony.firebasestorage.app",
    messagingSenderId: "904156768249",
    appId: "1:904156768249:android:2cc590e447a26566e8bf28",
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
class NotificationService {
    async requestUserPermission() {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
    
            await this.getFCMToken();
        } else {
        
        }
    }

    async getFCMToken() {
        try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
                LocalStorage.save("fcmtoken", fcmToken)
               
                // You can save this token to your backend server here
            }
        } catch (error) {
           
        }
    }

    listenToForegroundMessages() {
        return messaging().onMessage(async remoteMessage => {
           
            Alert.alert(remoteMessage.notification?.title || "New Message", remoteMessage.notification?.body || '');
        });
    }

    listenToBackgroundMessages() {
        messaging().setBackgroundMessageHandler(async remoteMessage => {
         
            await notifee.displayNotification({
                title: remoteMessage.notification?.title || '📩 New Message',
                body: remoteMessage.notification?.body || 'You have a new notification',
                android: {
                    channelId: 'default',
                    smallIcon: 'ic_launcher', // should match your app's small icon
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        });

        messaging().onNotificationOpenedApp(remoteMessage => {
        
            // You can navigate based on notification data here
        });

        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    // Navigate if needed
                }
            });
    }
}

export default new NotificationService();

export const handleNotifeeBackgroundEvent = async () => {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
    

        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'reply') {
            // Handle quick reply or custom actions
          
        }
    });
};
