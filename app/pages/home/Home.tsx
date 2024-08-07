import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';
import CreateGroupPage from './CreateGroup';
import JoinGroupPage from './JoinGroup';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();

const HomeStackScreen: React.FC = () => (
    <HomeStack.Navigator>
        <HomeStack.Screen name="HomeTab" component={HomeTab} options={{ headerShown: false }} />
        <HomeStack.Screen name="CreateGroup" component={CreateGroupPage} />
        <HomeStack.Screen name="JoinGroup" component={JoinGroupPage} />
    </HomeStack.Navigator>
);

const HomePage: React.FC = () => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };

    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} />
        </Tab.Navigator>
    );
};

export default HomePage;
