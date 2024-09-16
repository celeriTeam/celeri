import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ProfileTab from './profile/Profile';
import TestScreen from './Test';
import BugReportsPage from './BugReports';
import HomePage from './home/Home';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { UserProvider } from '../UserProvider';

const Tab = createBottomTabNavigator();
const auth = getAuth(app);

const AppPage: React.FC = () => {
    const [userID, setUserID] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserID(user.uid);
            } else {
                setUserID(''); // Handle case where user is not signed in
            }
            setIsLoading(false); // Loading is done whether or not we have a user
        });

        return () => unsubscribe(); // Clean up the listener on unmount
    }, []);

    if (isLoading) {
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
                <Tab.Screen name="Test" component={TestScreen} options={{ headerShown: true }}/>
                <Tab.Screen name="Bug Reports" component={BugReportsPage} options={{ headerShown: false }} />
            </Tab.Navigator>
        </UserProvider>
    );
};

export default AppPage;