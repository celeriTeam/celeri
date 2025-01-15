import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { ActivityIndicator, View, Text } from 'react-native';
import * as Font from 'expo-font';
import { useRouter } from 'expo-router';

const App: React.FC = () => {
    const [initialRoute, setInitialRoute] = useState<"/(authenticated)/home" | "/onboarding" | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const auth = getAuth();
    const router = useRouter(); // Move useRouter out of useEffect

    useEffect(() => {
        const loadFonts = async () => {
            try {
                console.log('Loading fonts...');
                await Font.loadAsync({
                    'Lexend': require('../assets/fonts/Lexend-Regular.ttf'),
                    'Lexend-Bold': require('../assets/fonts/Lexend-Bold.ttf'),
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
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            setInitialRoute(user ? '/(authenticated)/home' : '/onboarding');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    useEffect(() => {
        // Navigate to the initial route once ready
        if (!isLoading && fontsLoaded && initialRoute) {
            router.replace(initialRoute);

        }
    }, [isLoading, fontsLoaded, initialRoute, router]);

    if (isLoading || !fontsLoaded || initialRoute === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return null; // No rendering needed as navigation is handled
};

export default App;
