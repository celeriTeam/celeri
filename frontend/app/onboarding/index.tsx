import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';

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
            <View style={{ flex: 1, marginBottom: -insets.bottom, marginTop: -insets.top }}>
                <StatusBar
                    backgroundColor="#A6D49F"
                    barStyle="dark-content"
                    translucent={true}
                />
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.text}>
                            Welcome{'\n'}
                            to the{'\n'}
                            Celeri Beta.
                        </Text>
                    </View>
                    
                    <TouchableOpacity style={styles.button} onPress={() => router.replace('/onboarding/OnboardPrimer')}>
                        <Text style={styles.buttonText}>I don't have an account yet.</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button2} onPress={() => router.replace('/onboarding/Login')}>
                        <Text style={styles.buttonText2}>I already have an account.</Text>
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
        paddingHorizontal: 40,
    },
    titleContainer: {
        alignSelf: 'flex-start',
        marginBottom: 100,
        width: '100%',
    },
    text: {
        fontSize: 40,
        fontFamily: 'Lexend-Bold',
        color: '#fff',
        textAlign: 'left',
        lineHeight: 50,
    },
    button: {
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 35,
        padding: 20,
        paddingHorizontal: 25,
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    button2: {
        marginTop: 20,
    },
    buttonText: {
        fontFamily: "Lexend",
        fontSize: 15,
        textAlign: 'center',
        color: '#000',
    },
    buttonText2: {
        fontFamily: "Lexend",
        fontSize: 14,
        textAlign: 'center',
        color: '#fff',
    },
});

export default RegisterPage;
