import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';
import CreateGroupPage from '../CreateGroup';
import JoinGroupPage from '../JoinGroup';
import { NavigationContainer } from '@react-navigation/native';

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
    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} />
        </Tab.Navigator>
    );
};

export default HomePage;
