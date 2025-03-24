import React from 'react';
import { View, Text, Button, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';


const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 20 : StatusBar.currentHeight;
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;

const RegisterPage: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <View style={{ flex: 1,  marginBottom: -insets.bottom,
                marginTop: -insets.top, }}>
                <StatusBar
                    backgroundColor="#A6D49F"
                    barStyle="dark-content"
                    translucent={true}
                />
                <View style={styles.container}>
                    <Text style={styles.text}>Celeri</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/Register')}>
                        <Text style={styles.buttonText}>Register</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/Login')}>
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 40,
        marginBottom: 20,
        fontFamily: 'Lexend-Bold',
        color: '#fff',
    },
    button: {
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 25,
        padding: 10,
        width: '40%',
        borderColor: '#fff',
    },
    buttonText: {
        fontFamily: "Lexend",
        fontSize: 14,
        textAlign: 'center',
        color: '#fff',
    },
});

export default RegisterPage;
