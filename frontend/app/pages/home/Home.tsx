import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import HomeTab from './HomeTab';
import ProfileTab from './Profile';
import TestScreen from './Test';
import CreateGroupPage from './CreateGroup';
import JoinGroupPage from './JoinGroup';
import InvitePage from './InviteGroup';
import BugReportsPage from './BugReports';
import { RootStackParamList } from '../types';
import { app } from "../../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRoute } from '@react-navigation/native';

type GroupDetailsPageNavigationProp = StackNavigationProp<RootStackParamList, 'HomePage'>;

type Props = {
    navigation: GroupDetailsPageNavigationProp;
};

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const auth = getAuth(app);

const HomeStackScreen: React.FC = () => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };

    return (
        <HomeStack.Navigator>
            <HomeStack.Screen name="HomeTab" component={HomeTab} options={{ headerShown: false }} initialParams={{ userID: userID }} />
            <HomeStack.Screen name="CreateGroup" component={CreateGroupPage} options={{ headerShown: false }} />
            <HomeStack.Screen name="JoinGroup" component={JoinGroupPage} options={{ headerShown: false }} />
            <HomeStack.Screen name="InviteGroup" component={InvitePage} options={{ headerShown: false }} />
        </HomeStack.Navigator>
    );
};

const HomePage: React.FC = () => {
    const [userID, setUserID] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserID(user.uid);
            } else {
                setUserID(undefined); // Handle case where user is not signed in
            }
            setLoading(false); // Loading is done whether or not we have a user
        });

        return () => unsubscribe(); // Clean up the listener on unmount
    }, []);

    if (loading) {
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
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} initialParams={{ userID: userID }} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} initialParams={{ userID: userID }} />
            <Tab.Screen name="Test" component={TestScreen} options={{ headerShown: true }}/>
            <Tab.Screen name="Bug Reports" component={BugReportsPage} options={{ headerShown: false }} initialParams={{ userID: userID }} />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
});

export default HomePage;
