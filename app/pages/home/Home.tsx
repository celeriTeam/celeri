import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackNavigationProp, createStackNavigator } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';
import CreateGroupPage from './CreateGroup';
import JoinGroupPage from './JoinGroup';
import { getUserGroups, getGroupName, getUserName } from '../../database';
import { RootStackParamList } from '../types';

type GroupDetailsPageNavigationProp = StackNavigationProp<RootStackParamList, 'GroupDetails'>;

type Props = {
    navigation: GroupDetailsPageNavigationProp;
};

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();

const HomeStackScreen: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();
    const { userID } = route.params as { userID: number };
    const currentUserName = getUserName(userID); // get user name api call
    const currentUserGroups = getUserGroups(userID); // get user groups api call

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
                <HomeStack.Screen name="CreateGroup" component={CreateGroupPage} />
                <HomeStack.Screen name="JoinGroup" component={JoinGroupPage} />
            </HomeStack.Navigator>
        );
    } else {
        return (
            <View style={styles.container}>
                <Text>Welcome back, {currentUserName}</Text>
                {currentUserGroups.map((groupID: number) => {
                    const groupName = getGroupName(groupID); // This function should fetch the group name
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
    const { userID } = route.params as { userID: number };

    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} initialParams={{userID: userID}} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} initialParams={{userID: userID}} />
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
