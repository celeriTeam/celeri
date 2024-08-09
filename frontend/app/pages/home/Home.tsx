import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';
import TestScreen from './Test';
import CreateGroupPage from './CreateGroup';
import JoinGroupPage from './JoinGroup';
import { getUserGroups, getGroupName, getUserName } from '../../database';
import { RootStackParamList } from '../types';
import { app, db } from "../../../firebaseConfig";
import { getAuth } from "firebase/auth";

type GroupDetailsPageNavigationProp = StackNavigationProp<RootStackParamList, 'GroupDetails'>;

type Props = {
    navigation: GroupDetailsPageNavigationProp;
};

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const auth = getAuth(app);
const user = auth.currentUser;
const userID: string = user?.uid || '';

const HomeStackScreen: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();

    const [currentUserName, setCurrentUserName] = React.useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = React.useState<string[] | undefined>(undefined);
    const [groupNames, setGroupNames] = React.useState<Record<string, string | undefined>>({});
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log("Testing if there's an ID, ", userID)
                const name = await getUserName(userID);
                setCurrentUserName(name);
                const groups = await getUserGroups(userID); // Assuming getUserGroups is an async function
                setCurrentUserGroups(groups);
                if (groups) {
                    const names: Record<string, string | undefined> = {};
                    for (const groupID of groups) {
                        names[groupID] = await getGroupName(groupID);
                    }
                    setGroupNames(names);
                }
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
            </HomeStack.Navigator>
        );
    } else {
        return (
            <View style={styles.container}>
                <Text>Welcome back, {currentUserName}</Text>
                {currentUserGroups.map((groupID: string) => {
                    const groupName = groupNames[groupID]; // Get the group name from the state
                    return (
                        <Button
                            key={groupID}
                            title={groupName || 'INVALID GROUP'}
                            onPress={() => navigation.navigate('GroupDetails', { GroupID: groupID })}
                        />
                    );
                })}
            </View>
        );
    }
};

const HomePage: React.FC = () => {
    const route = useRoute();

    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} initialParams={{ userID: userID }} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} initialParams={{ userID: userID }} />
            <Tab.Screen name="Test" component={TestScreen} options={{ headerShown: true }}/>
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
