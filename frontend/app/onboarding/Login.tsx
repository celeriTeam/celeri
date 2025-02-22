import React, { useState, useRef, useEffect } from 'react';
import {
    SafeAreaView, Pressable, Keyboard,
    View, Text, TouchableOpacity, Button, TextInput, Alert
} from 'react-native';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, User, AuthError } from "firebase/auth";
import { app, auth, db } from "@firebaseConfig";
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const auth = getAuth(app);

    useEffect(() => {
        const authInstance = getAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const loginAndGoToMainFlow = async () => {
        if (email && password) {
            try {
                console.log("Trying to log in user...");
                const response = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                console.log("User login response: ", response);

                if (response.user) {
                    router.replace('/(authenticated)'); // Change to your authenticated route
                }
            } catch (e: unknown) {
                if (e instanceof FirebaseError) {
                    console.error("Firebase Error Code:", e.code);
                    console.error("Firebase Error Message:", e.message);
                    Alert.alert("Error", e.message);
                } else if (e instanceof Error) {
                    console.error("General Error Message:", e.message);
                    Alert.alert("Error", e.message);
                } else {
                    console.error("Unknown Error:", e);
                    Alert.alert("Error", "An unknown error occurred");
                }
            }
        } else {
            Alert.alert("Error", "Please enter both email and password.");
        }
    };

    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.contentView}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Login here</Text>
                    </View>
                    <View style={styles.mainContent}>
                        <TextInput
                            style={styles.loginTextField}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            inputMode="email"
                            autoCapitalize="none"
                            placeholderTextColor="#999797"
                        />
                        <TextInput
                            style={styles.loginTextField}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#999797"
                        />
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push("/onboarding/ForgotPassword")}
                        style={[styles.button_container2]}
                    >
                        <Text style={styles.button_text2}>Forgot Password?</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={loginAndGoToMainFlow}
                        style={[styles.button_container]}
                    >
                        <Text style={styles.button_text}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.button_container2]}
                    >
                        <Text style={styles.button_text2}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Pressable>

    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    text: {
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 24,
        fontFamily: "Lexend"
    },
    button_text: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    button_text2: {
        color: 'black',
        fontSize: 16,
        fontFamily: 'Lexend',
    },
    button_container: {
        borderRadius: 30,
        flexDirection: "row",
        marginVertical: 8,
        paddingVertical: 18, // Reduce padding to make it smaller
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: '#1976d2'
    },
    button_container2: {
        flexDirection: "row",
        paddingVertical: 12, // Reduce padding to make it smaller
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: '#fff'
    },
    contentView: {
        flex: 1,
        backgroundColor: "white",
        marginTop: 50,
    },
    titleContainer: {
        flex: 1.2,
        justifyContent: "center",
    },
    titleText: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend',
    },
    loginTextField: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        height: 50,
        fontSize: 20,
        paddingHorizontal: 12,
        marginVertical: 12,
        fontWeight: "100",
        fontFamily: 'Lexend'
        
    },
    mainContent: {
        flex: 6,
    },
});

export default LoginPage;
