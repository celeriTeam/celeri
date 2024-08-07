import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeTab from './HomeTab';
import ProfileTab from './ProfileTab';

const Tab = createBottomTabNavigator();

const HomePage: React.FC = () => {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeTab} options={{ headerShown: false }} />
            <Tab.Screen name="Profile" component={ProfileTab} options={{ headerShown: false }} />
        </Tab.Navigator>
    );
};

export default HomePage;
