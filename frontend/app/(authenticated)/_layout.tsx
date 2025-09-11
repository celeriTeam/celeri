import { Redirect, Stack } from 'expo-router';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { UserProvider } from '@/app/UserProvider';
import { useEffect, useState } from 'react';
import { db, authInstance, messaging } from '@firebaseConfig';
import * as Device from 'expo-device';
import { AuthorizationStatus, getToken, requestPermission, subscribeToTopic } from '@react-native-firebase/messaging';
import { arrayUnion, doc, updateDoc } from '@react-native-firebase/firestore';
import { getActiveUserGroupIDs } from '@/backend/src/users';
import { TabBarProvider } from '../../hooks/useTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged } from '@react-native-firebase/auth';

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

        // Request permission for notifications
        const authStatus = await requestPermission(messaging);
        const isAuthorized =
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL;

        if (!isAuthorized) {
            console.log('Push notification permissions denied.');
            return;
        } else {
            // console.log('Authorization status:', authStatus);
        }

        // Retrieve Firebase push token (ensure Firebase is initialized)
        try {
            const token = await getToken(messaging);
            await saveTokenToDatabase(token, userID);

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
    await updateDoc(doc(db, 'users', userId), {
        tokens: arrayUnion(token),
    });
}

// Helper function to subscribe token to topic
async function subscribeTokenToTopic(token: string, topic: string) {
    subscribeToTopic(messaging, topic)
        .then((response: any) => {
            console.log('Successfully subscribed to topic:', topic);
        })
        .catch((error: any) => {
            console.log('Error subscribing to topic:', error);
        });
}


export default function AuthenticatedStack() {

    const [userID, setUserID] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
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
                    <Stack>
                        {/* this shows your bottom‑tab navigator */}
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="publicProfile" options={{ title: 'PublicProfile', headerShown: false }} />
                    </Stack>
                </TabBarProvider>
            </UserProvider>
        </SafeAreaView>
    );
}
