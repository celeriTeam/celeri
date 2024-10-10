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
import * as Font from 'expo-font';
import AppLoading from 'expo-app-loading';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Register');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const auth = getAuth();

    console.log('In Index Page');
    
    useEffect(() => {
        const loadFonts = async () => {
            console.log('Loading fonts...'); // Add this line to check if the function is running
            await Font.loadAsync({
                'Lexend': require('../assets/fonts/Lexend-Regular.ttf'), // Adjust path as necessary
                'Lexend-Bold': require('../assets/fonts/Lexend-Bold.ttf'),
            });
            console.log('Fonts loaded successfully.'); // Add this line to confirm successful font loading
            setFontsLoaded(true);
        };

        loadFonts();
    }, []);

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
                    // title: 'Groups',
                    // headerStyle: { backgroundColor: '#42a5f5' },
                    // headerTitleStyle: { fontWeight: 'bold' },
                    // headerTintColor: '#fff',
                    // headerLeft: () => null
                    headerShown: false
                }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;