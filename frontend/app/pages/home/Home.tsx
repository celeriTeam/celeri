import React from 'react';
import { View, Button, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import HomeTab from './HomeTab';
import ProfileTab from './EditProfile';
import TestScreen from './Test';
import CreateGroupPage from './CreateGroup';
import JoinGroupPage from './JoinGroup';
import InvitePage from './InviteGroup';
import BugReportsPage from './BugReports';
import { getUserGroups, getUserName } from '../../database';
import { RootStackParamList } from '../types';
import { app } from "../../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type GroupDetailsPageNavigationProp = StackNavigationProp<RootStackParamList, 'GroupDetails'>;

type Props = {
    navigation: GroupDetailsPageNavigationProp;
};

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const auth = getAuth(app);

const HomeStackScreen: React.FC<Props> = ({ navigation }) => {
    const [currentUserName, setCurrentUserName] = React.useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = React.useState<string[] | undefined>(undefined);
    const [loading, setLoading] = React.useState(true);
    let userID = '';
    let groupID = '';

    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                let userID = user?.uid || '';
                console.log('userid: ', userID)
                const name = await getUserName(userID);
                setCurrentUserName(name);
                const groups = await getUserGroups(userID);
                setCurrentUserGroups(groups);
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [userID]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (currentUserGroups === null || currentUserGroups === undefined) {
        return (
            <View style={styles.container}>
                <Text>Failed to fetch user groups</Text>
            </View>
        );
    } else if (currentUserGroups.length === 0) {
        return (
            <HomeStack.Navigator>
                <HomeStack.Screen name="HomeTab" component={HomeTab} options={{ headerShown: false }} />
                <HomeStack.Screen name="CreateGroup" component={CreateGroupPage} initialParams={{ userID: userID }} />
                <HomeStack.Screen name="JoinGroup" component={JoinGroupPage} />
                <HomeStack.Screen name="InviteGroup" component={InvitePage} initialParams={{ groupID: groupID}} />
            </HomeStack.Navigator>
        );
    } else {
        return (
            <View style={styles.container}>
                <Text>Welcome back, {currentUserName}</Text>
                {currentUserGroups.map((groupName: string) => (
                    <Button
                        key={groupName}
                        title={String(groupName)}
                        onPress={() => navigation.navigate('GroupDetails', { GroupName: groupName })}
                    />
                ))}
            </View>
        );
    }
};

const HomePage: React.FC = () => {
    const [userID, setUserID] = React.useState<string | undefined>(undefined);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
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
