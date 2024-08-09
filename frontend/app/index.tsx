import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import RegisterPage from './pages/Register';
import SignUpPage from './pages/SignUp';
import LoginPage from './pages/Login';
import VerificationPage from './pages/PhoneVerification';
import HomePage from './pages/home/Home';
import GroupDetails from './pages/home/GroupDetails';
import { RootStackParamList } from './pages/types';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Register');
    const [loading, setLoading] = useState<boolean>(true);
    const auth = getAuth();

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          setInitialRoute('FLEX');
        } else {
          setInitialRoute('Register');
        }
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, [auth]);
  
    if (loading) {
      // Optionally, show a loading spinner or screen while determining the initial route
      return null;
    }
    
    return (
        <NavigationContainer independent={true}>
            <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen name="Register" component={RegisterPage} options={{ headerShown: false }} />
                <Stack.Screen name="SignUp" component={SignUpPage} options={{ headerShown: false }} />
                <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false}} />
                <Stack.Screen name="Verification" component={VerificationPage} options={{ headerShown: false }} />
                <Stack.Screen name="FLEX" component={HomePage} options={{ 
                    title: 'Groups',
                    headerStyle: { backgroundColor: '#42a5f5' },
                    headerTitleStyle: { fontWeight: 'bold' },
                    headerTintColor: '#fff',
                    headerLeft: () => null
                }}
                />
                <Stack.Screen name="GroupDetails" component={GroupDetails} options={{ 
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