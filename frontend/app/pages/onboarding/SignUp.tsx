import React, { useState, useRef, useEffect } from 'react';
import {
    SafeAreaView, Pressable, Keyboard,
    View, Image, Text, TouchableOpacity, TextInput, Alert, StyleSheet
} from 'react-native';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, User } from "firebase/auth";
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CTAButton } from "@components/CTAButton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { FirebaseError } from 'firebase/app';
import { RootStackParamList } from '../../types';
import { Permission, PERMISSIONS, request } from 'react-native-permissions';
//import db from "@react-native-firebase/firestore";

type SignUpPageNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
type SignUpPageRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

type Props = {
    navigation: SignUpPageNavigationProp;
    route: SignUpPageRouteProp;
};


const SignUpPage: React.FC<Props> = ({ navigation }) => {

    const [name, setName] = useState<string | undefined>();
    const [username, setUsername] = useState<string | undefined>();
    const [profileImage, setProfileImage] = useState<string | undefined>();
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);

    const auth = getAuth(app);
    const nav = useNavigation<NativeStackNavigationProp<any>>();
    const storage = getStorage(app);

    const createProfile = async (user: any) => {
        try {
            console.log("This shows before you upload the profileImage");
            const profileImageUrl = await uploadProfileImage(user.uid);
            console.log("profileImage uploaded successfully");
            await setDoc(doc(db, 'users', user.uid), {
                name,
                username,
                email,
                profileImageUrl,
                "createdAt": serverTimestamp(),
                "updatedAt": serverTimestamp(),
                groups: [],
            })
        } catch (error) {
            console.error("Error creating user profile:", error);
            Alert.alert('Error', 'Failed to create user profile.');
        }

    };

    useEffect(() => {
        const authInstance = getAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const pickImage = async () => {
        // Request permission to access the media library
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permission Required', 'Please grant media library permissions to select a profile image.');
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            if (selectedAsset.uri) {
                setProfileImage(selectedAsset.uri);
            }
        }
    };

    const uploadProfileImage = async (userId: string): Promise<string | null> => {
        if (!profileImage) return null;

        try {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            const storageRef = ref(storage, `profileImages/${userId}`);
            console.log("profileImage checker THREE");
            console.log('Blob size: ', blob.size);
            console.log('Blob type: ', blob.type)
            console.log('Storage reference:', storageRef.fullPath);
            await uploadBytes(storageRef, blob);
            console.log("profileImage checker FOUR");
            const url = await getDownloadURL(storageRef);

            return url;
        } catch (error) {
            console.error('Error uploading profile image:', error);
            if (error instanceof FirebaseError) {
                console.error('Firebase error code:', error.code);
                Alert.alert('Firebase Error', error.message);
            } else {
                Alert.alert('Error', 'Failed to upload profile image.');
            }
            return null;
        }

    };


    const registerAndGoToMainFlow = async () => {
        if (email && password && username && profileImage) {
            try {
                console.log("Trying to register user...");
                const response = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password,
                );
                console.log("User registration response: ", response);

                if (response.user) {
                    console.log("createProfile function about to run:");
                    await createProfile(response.user);
                    console.log("Navigation to App Page now!");
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
                        <Text style={styles.titleText}>Register</Text>
                    </View>
                    <View style={styles.mainContent}>
                        <TextInput
                            style={styles.loginTextField}
                            placeholder="Name"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#999797"
                        />
                        <TextInput
                            style={styles.loginTextField}
                            placeholder="Username"
                            value={username}
                            onChangeText={setUsername}
                            placeholderTextColor="#999797"
                        />
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
                        <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
                            <Text style={styles.button_text2}>Pick Profile Image</Text>
                        </TouchableOpacity>
                        {profileImage && (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        )}
                    </View>

                    <CTAButton
                        title="Sign Up"
                        onPress={registerAndGoToMainFlow}
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
    button_text2: {
        color: 'white',
        fontSize: 16,
    },
    button_container: {
        borderRadius: 15,
        flexDirection: "row",
        margin: 16,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#e6e6e6"
    },
    imagePickerButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1976d2',
        borderRadius: 5,
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
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginVertical: 10,
    },
});

export default SignUpPage;