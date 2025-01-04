import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Font from 'expo-font';
import ProfileTab from './profile/PersonalProfile';
import TestScreen from './Test';
import BugReportsPage from './BugReports';
import HomePage from './home/Home';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { UserProvider } from '../UserProvider';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import messaging from '@react-native-firebase/messaging';
import { getMessaging, getToken} from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';



const Tab = createBottomTabNavigator();
const auth = getAuth(app);

// Register for push notifications function
async function registerForPushNotificationsAsync(userID: string) {
  if (Device.isDevice) {
      console.log("check point one!!");

      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const isAuthorized =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!isAuthorized) {
          console.log('Push notification permissions denied.');
          return;
      } else {
        console.log('Authorization status:', authStatus);
      }
      
      // Retrieve Firebase push token (ensure Firebase is initialized)
      try {
          await messaging().registerDeviceForRemoteMessages();
          const token = await messaging().getToken()
          await saveTokenToDatabase(token, userID);

          console.log('Firebase push token:', token);

          // Subscribe Firebase token to topic
          await subscribeTokenToTopic(token, 'allUsers');
      } catch (error) {
          console.error("Error getting Firebase token:", error);
      }
  } else {
      alert('Must use physical device for Push Notifications');
  }
}

async function saveTokenToDatabase(token: string, uid: string) {
  // Assume user is already signed in
  const userId = uid;

  // Add the token to the users datastore
  await firestore()
    .collection('users')
    .doc(userId)
    .update({
      tokens: firestore.FieldValue.arrayUnion(token),
    });
}

  // Helper function to subscribe token to topic
async function subscribeTokenToTopic(token: string, topic: string) {
    getMessaging()
    .subscribeToTopic('allUsers', token)
    .then((response: any) => {
        console.log('Successfully subscribed to topic:', response);
      })
      .catch((error: any) => {
        console.log('Error subscribing to topic:', error);
      });
  }


const AppPage: React.FC = () => {
    const [userID, setUserID] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [fontsLoaded, setFontsLoaded] = useState(false);

    console.log('In apppages');
    
    useEffect(() => {
        const loadFonts = async () => {
            await Font.loadAsync({
                'Lexend': require('../../assets/fonts/Lexend-Regular.ttf'),
            });
            setFontsLoaded(true);
        };
        loadFonts();
    }, []);

    console.log('Second test');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('There is a user. In useEffect.');
                console.log(user);
                setUserID(user.uid);
            } else {
                console.log('User is not signed in.');
                setUserID(''); // Handle case where user is not signed in
            }
            setIsLoading(false); // Loading is done whether or not we have a user
        });

        return () => unsubscribe(); // Clean up the listener on unmount
    }, []);

    // Register for push notifications after userID is set
    useEffect(() => {
        if (userID) {
            registerForPushNotificationsAsync(userID);
        }
    }, [userID]);

    if (isLoading || !fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!userID) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No user found. Please log in.</Text>
            </View>
        );
    }
    return (
        <UserProvider>
            <Tab.Navigator>
                <Tab.Screen name="Home" component={HomePage} options={{ headerShown: false }} />
                <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} />
                {/* <Tab.Screen name="Test" component={TestScreen} options={{ headerShown: true }}/> */}
                <Tab.Screen name="Bug Reports" component={BugReportsPage} options={{ headerShown: false }} />
            </Tab.Navigator>
        </UserProvider>
    );
};

export default AppPage;