import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import RegisterPage from './pages/Register';
import SignUpPage from './pages/SignUp';
import VerificationPage from './pages/PhoneVerification';
import HomePage from './pages/home/Home';
import GroupDetails from './pages/home/GroupDetails';
import { RootStackParamList } from './pages/types';

const Stack = createStackNavigator<RootStackParamList>();

let userID = 1

const App: React.FC = () => {
    const [initialRoute, setInitialRoute] = useState<string>('SignUp');
    const [loading, setLoading] = useState<boolean>(true);
    const auth = getAuth();

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          setInitialRoute('FLEX');
        } else {
          setInitialRoute('SignUp');
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
            <Stack.Navigator initialRouteName="Register">
                <Stack.Screen name="Register" component={RegisterPage} options={{ headerShown: false }} />
                <Stack.Screen name="SignUp" component={SignUpPage} options={{ headerShown: false }} />
                <Stack.Screen name="Verification" component={VerificationPage} options={{ headerShown: false }} />
                <Stack.Screen name="FLEX" component={HomePage} options={{ 
                    title: 'Groups',
                    headerStyle: { backgroundColor: '#42a5f5' },
                    headerTitleStyle: { fontWeight: 'bold' },
                    headerTintColor: '#fff',
                    headerLeft: () => null
                }}
                initialParams={{userID: userID}}
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