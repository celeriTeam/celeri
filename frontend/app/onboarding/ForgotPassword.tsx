import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, Pressable, SafeAreaView, View, TextInput, Keyboard, TouchableOpacity, Alert } from 'react-native';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, User, AuthError, updatePassword } from "firebase/auth";
import firebase from '@react-native-firebase/app';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc } from 'firebase/firestore';
import { CTAButton } from "@components/CTAButton";
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'expo-router';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const router = useRouter(); 

    const auth = getAuth(app);
    
    const resetPassword = async () => {
        if (email && password) {
            try {
                console.log("Trying to update user password...");
                if (email) {
                    Alert.alert('Error', 'Currently not supported');
                    return;
                }
                Alert.alert('Success', 'Password updated successfully');
                router.replace('/(authenticated)');
            } catch (error) {
                const errorCode = (error as AuthError).code;
                const errorMessage = (error as AuthError).message;
                console.error("Error updating user password: ", errorCode, errorMessage);
            }
        } else {
            Alert.alert('Error', 'Please fill in all fields');
        }
    }

    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.contentView}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Forgot Password</Text>
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
                            placeholder="New Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#999797"
                        />
                    </View>

                    <TouchableOpacity 
                        onPress={() => resetPassword()}
                        style={[styles.button_container]}
                    >
                        <Text style={styles.button_text}>Set Password</Text>
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

export default ForgotPasswordPage;