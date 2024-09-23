import React, { useState, useRef, useEffect } from 'react';
import {
    SafeAreaView, Pressable, Keyboard,
    View, Text, TouchableOpacity, Button, TextInput, Alert, StyleSheet
} from 'react-native';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, User, AuthError } from "firebase/auth";
import firebase from '@react-native-firebase/app';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc } from 'firebase/firestore';
import { CTAButton } from "@components/CTAButton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { FirebaseError } from 'firebase/app';
import { RootStackParamList } from '../../types';
//import db from "@react-native-firebase/firestore";


type LoginPageNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type LoginPageRouteProp = RouteProp<RootStackParamList, 'Login'>;

type Props = {
    navigation: LoginPageNavigationProp;
    route: LoginPageRouteProp;
};

const LoginPage: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);

    const auth = getAuth(app);
    const nav = useNavigation<NativeStackNavigationProp<any>>();

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
                    // Assuming createProfile is only for registration, you may not need it here
                    // await createProfile(response.user);
                    // nav.replace("Main");
                    navigation.reset({
                        index: 0,  // Index of the screen to be focused on
                        routes: [{ name: 'AppPage' }],  // Define only the desired route
                    });
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
                        <Text style={styles.titleText}>Login</Text>
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

                    <CTAButton
                        title="Log In"
                        onPress={loginAndGoToMainFlow}
                        variant="primary"
                    />
                    <CTAButton title="Go Back" onPress={nav.goBack} variant="secondary" />
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
    },
    button_text: {
        textAlign: "center",
        fontSize: 24,
        color: "#1976d2"
    },
    button_container: {
        borderRadius: 15,
        flexDirection: "row",
        margin: 16,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#e6e6e6"
    },
    contentView: {
        flex: 1,
        backgroundColor: "white",
    },
    titleContainer: {
        flex: 1.2,
        justifyContent: "center",
    },
    titleText: {
        fontSize: 45,
        textAlign: "center",
        fontWeight: "200",
    },
    loginTextField: {
        borderBottomWidth: 1,
        height: 60,
        fontSize: 30,
        marginVertical: 10,
        fontWeight: "300",
    },
    mainContent: {
        flex: 6,
    },
});

export default LoginPage;
