import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RegisterPage from './pages/Register';
import PhoneNumberPage from './pages/PhoneNumber';
import VerificationPage from './pages/PhoneVerification';
import HomePage from './pages/home/Home';

type RootStackParamList = {
    Register: undefined;
    PhoneNumber: undefined;
    Verification: undefined;
    FLEX: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <NavigationContainer independent={true}>
            <Stack.Navigator initialRouteName="Register">
                <Stack.Screen name="Register" component={RegisterPage} options={{ headerShown: false }} />
                <Stack.Screen name="PhoneNumber" component={PhoneNumberPage} options={{ headerShown: false }} />
                <Stack.Screen name="Verification" component={VerificationPage} options={{ headerShown: false }} />
                <Stack.Screen name="FLEX" component={HomePage} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;