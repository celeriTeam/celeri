import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import RegisterPage from './pages/onboarding/Register';
import SignUpPage from './pages/onboarding/SignUp';
import LoginPage from './pages/onboarding/Login';
import VerificationPage from './pages/onboarding/PhoneVerification';
import BetsPage from './pages/bets/Bets';
import { RootStackParamList } from './types';
import InvitePage from './pages/groups/InviteGroup';
import AppPage from './pages/App';
import { ActivityIndicator, View, Text } from 'react-native';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Register');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const auth = getAuth();

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          setInitialRoute('HomePage');
        } else {
          setInitialRoute('Register');
        }
        setIsLoading(false);
      });
  
      return () => unsubscribe();
    }, [auth]);
  
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }
    
    return (
        <NavigationContainer independent={true}>
            <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen name="Register" component={RegisterPage} options={{ headerShown: false }} />
                <Stack.Screen name="SignUp" component={SignUpPage} options={{ headerShown: false }} />
                <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false}} />
                <Stack.Screen name="Verification" component={VerificationPage} options={{ headerShown: false }} />
                <Stack.Screen name="AppPage" component={AppPage} options={{ 
                    title: 'Groups',
                    headerStyle: { backgroundColor: '#42a5f5' },
                    headerTitleStyle: { fontWeight: 'bold' },
                    headerTintColor: '#fff',
                    headerLeft: () => null
                }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;