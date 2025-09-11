import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import * as Font from 'expo-font';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@firebaseConfig';

const App: React.FC = () => {
    const [initialRoute, setInitialRoute] = useState<"/(authenticated)/(tabs)/home" | "/onboarding" | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const router = useRouter(); // Move useRouter out of useEffect

    useEffect(() => {
        const loadFonts = async () => {
            try {
                console.log('Loading fonts...');
                await Font.loadAsync({
                    'Lexend': require('@assets/fonts/Lexend-Regular.ttf'),
                    'Lexend-Bold': require('@assets/fonts/Lexend-Bold.ttf'),
                });
                console.log('Fonts loaded successfully.');
                setFontsLoaded(true);
            } catch (error) {
                console.error('Error loading fonts:', error);
            }
        };

        loadFonts();
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check if registration is in progress
                const registrationInProgress = await AsyncStorage.getItem('registrationInProgress');
                console.log('Auth state changed, registration flag:', registrationInProgress);
                
                if (registrationInProgress === 'true') {
                    console.log('Registration in progress, STAYING on current screen');
                    setIsLoading(false);
                    return; // Don't redirect if registration is in progress
                }
                
                const user = auth().currentUser;
                if (user) {
                    // Check if this user has completed registration
                    try {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        
                        // Only navigate to home if user document exists (registration complete)
                        if (userDoc.exists) {
                            console.log("userDoc exists, navigating to home");
                            setInitialRoute('/(authenticated)/(tabs)/home');
                        } else {
                            // User exists in Auth but not in Firestore - still in registration
                            setInitialRoute('/onboarding');
                        }
                    } catch (error) {
                        console.error('Error checking user registration status:', error);
                        setInitialRoute('/onboarding');
                    }
                } else {
                    // No user, go to onboarding
                    setInitialRoute('/onboarding');
                }
                setIsLoading(false);
            } catch (error) {
                console.error('Error in auth state change handler:', error);
                setIsLoading(false);
                setInitialRoute('/onboarding');
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        // Navigate to the initial route once ready
        if (!isLoading && fontsLoaded && initialRoute) {
            router.replace(initialRoute);

        }
    }, [isLoading, fontsLoaded, initialRoute, router]);

    if (isLoading || !fontsLoaded || initialRoute === null) {
        return (
            
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ color: '#fff' }}>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return null; // No rendering needed as navigation is handled
};

export default App;