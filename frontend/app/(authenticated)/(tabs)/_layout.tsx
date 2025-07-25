import { Tabs, Redirect } from 'expo-router';
import { Image, View, Text, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { UserProvider } from '../../UserProvider';
import * as Font from 'expo-font';
import { JSX, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@firebaseConfig';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { getActiveUserGroupIDs } from '@/backend/src/users';
import TabBar from "../../../components/TabBar";
import { useTabBar, TabBarProvider } from '../../../hooks/useTabBar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';


const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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

          // Subscribe to group-specific tokens
          let activeUserGroups = await getActiveUserGroupIDs(userID);

          if (activeUserGroups && Array.isArray(activeUserGroups)) {
            for (const group of activeUserGroups) {
                try {
                await subscribeTokenToTopic(token, group);
                } catch (error) {
                console.error(`Failed to subscribe token to topic ${group}:`, error);
                }
            }
        }
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
      messaging()
      .subscribeToTopic(topic)
      .then((response: any) => {
          console.log('Successfully subscribed to topic:', topic);
        })
        .catch((error: any) => {
          console.log('Error subscribing to topic:', error);
        });
    }
  

const AuthenticatedLayout: React.FC = () => {

    const auth = getAuth(app);
    const [userID, setUserID] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text style={{ color: '#fff' }}>Loading...</Text>
            </View>
        );
    }

    if (!userID) {
        return <Redirect href={{ pathname: '../login' }} />;
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <UserProvider>
                <TabBarProvider>
                    <InnerAuthenticatedLayout />
                </TabBarProvider>
            </UserProvider>
        </SafeAreaView>
    );
}

function InnerAuthenticatedLayout() {
    const { isTabBarVisible } = useTabBar();
    const insets = useSafeAreaInsets();

    return (
      <Tabs
        screenOptions={({ route }: { route: { name: string } }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1b2c1c',
            borderTopWidth: 0,
            paddingBottom: insets.bottom, // this accounts for the bottom safe area
            paddingTop: Platform.OS === 'ios' ? verticalScale(10) : 0, // Adjust padding for iOS
            height: (isTabBarVisible ? verticalScale(60) : 0) + insets.bottom, // <-- THE MAGIC
          },
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#51ba51',
          tabBarInactiveTintColor: '#ffffff',
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => {
            let iconSource, width, height;
  
            if (route.name === 'home') {
              iconSource = require('@assets/icons/home.png');
              width = focused ? 24 : 22;
              height = focused ? 26 : 24;
            } else if (route.name === 'competition/index') {
              iconSource = require('@assets/icons/shoe.png');
              width = focused ? 22 : 20;
              height = focused ? 25 : 23;
            } else if (route.name === 'profile') {
              iconSource = require('@assets/icons/profile.png');
              width = focused ? 22 : 20;
              height = focused ? 25 : 23;
            } else if (route.name === 'bugReports/index') {
              iconSource = require('@assets/icons/bugReports.png');
              width = focused ? 31 : 29;
              height = focused ? 31 : 29;
            }
  
            return (
              <Image
                source={iconSource}
                style={{
                  width,
                  height,
                  tintColor: color,
                  opacity: focused ? 1 : 0.7,
                }}
              />
            );
          },
        })}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="competition" options={{ title: 'Competition' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="bugReports/index" options={{ title: 'Bug Reports' }} />
      </Tabs>
    );
}

export default AuthenticatedLayout;