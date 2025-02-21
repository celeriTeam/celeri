import React from 'react';
import { View, Text, Button, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';


const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 20 : StatusBar.currentHeight;
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;

const RegisterPage: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: '#A6D49F', marginBottom: -insets.bottom,
            marginTop: -insets.top, }}>
            <StatusBar
                backgroundColor="#A6D49F"
                barStyle="dark-content"
                translucent={true}
            />
            <View style={styles.container}>
                <Text style={styles.text}>FLEXBETS</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/Register')}>
                    <Text style={styles.buttonText}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/Login')}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#A6D49F', // Background color
    },
    text: {
        fontSize: 24,
        marginBottom: 20,
    },
    button: {
        backgroundColor: 'black', // Button color
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 25, // Rounded corners
        marginVertical: 10,
    },
    buttonText: {
        color: 'white', // Text color
        fontSize: 18,
    },
});

export default RegisterPage;
