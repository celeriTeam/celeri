import React, { useState, useRef, useEffect } from 'react';
import {
    SafeAreaView, Pressable, Keyboard,
    View, Image, Text, TouchableOpacity, TextInput, Alert,
    KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, User } from "firebase/auth";
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import MailchimpSubscribe from 'react-mailchimp-subscribe'


const SignUpPage: React.FC = () => {

    const [name, setName] = useState<string | undefined>();
    const [username, setUsername] = useState<string | undefined>();
    const [profileImage, setProfileImage] = useState<string | undefined>();
    const [email, setEmail] = useState<string | undefined>();
    const [password, setPassword] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [focusedInput, setFocusedInput] = useState<string>('');

    const auth = getAuth(app);
    const storage = getStorage(app);
    const router = useRouter();

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

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
    
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
    
        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
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
          quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            if (selectedAsset.uri) {
            // Compress and resize the image
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                selectedAsset.uri,
                [{ resize: { width: 800 } }], // Resize to 800px width
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            setProfileImage(manipulatedImage.uri);
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
                    router.back();
                    router.replace('/(authenticated)/(tabs)/home');
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
        } else if(!email && !password && !username && !profileImage) {
            Alert.alert("Error", "Please fill out all the fields above!")
        } else if(!email && !password && !username){ 
            Alert.alert("Error", "Please enter an email, password, and your username!")
        } else if(!email && !password){ 
            Alert.alert("Error", "Please enter your email and password!")
        } else if(!email){ 
            Alert.alert("Error", "Please enter your email!")
        } else if(!password){ 
            Alert.alert("Error", "Please enter a password!")
        } else if(!username){ 
            Alert.alert("Error", "Please enter a username!")
        } else if(!profileImage){ 
            Alert.alert("Error", "Please choose a profile picture! You can change this later if you'd like.")
        } else {
            Alert.alert("Error", "You have not filled out every field!")
        }
    };


    return (
        <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.contentView}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Create an account</Text>
                    </View>

                    <View style={styles.profileImageContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.profileImage} />
                            ) : (
                                <Image
                                    source={require('@components/blank-profile-picture.png')}
                                    style={styles.profileImage}
                                />
                            )}
                            <View style={styles.plusIconContainer}>
                                <Text style={styles.plusIconText}>+</Text>
                            </View>
                        </TouchableOpacity>
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
                            style={[
                                styles.loginTextField,
                                focusedInput === 'email' && keyboardHeight > 0 && {
                                    position: 'absolute',
                                    bottom: '50%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    zIndex: 1000,
                                    elevation: 5, // for Android
                                    shadowColor: '#000', // for iOS
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3.84,
                                }
                            ]}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            inputMode="email"
                            onFocus={() => setFocusedInput('email')}
                            autoCapitalize="none"
                            placeholderTextColor="#999797"
                        />
                        <TextInput
                            style={[
                                styles.loginTextField,
                                focusedInput === 'password' && keyboardHeight > 0 && {
                                    position: 'absolute',
                                    bottom: '50%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    zIndex: 1000,
                                    elevation: 5, // for Android
                                    shadowColor: '#000', // for iOS
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3.84,
                                }
                            ]}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            onFocus={() => setFocusedInput('password')}
                            placeholderTextColor="#999797"
                        />
                    
                    </View>

                    <TouchableOpacity
                        onPress={registerAndGoToMainFlow}
                        style={[styles.button_container]}
                    >
                        <Text style={styles.button_text}>Sign Up</Text>
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
        fontFamily: 'Lexend',
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
        marginTop: 50,
    },
    titleContainer: {
        flex: 1.2,
        justifyContent: "center",
        marginBottom: 30,
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
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginVertical: 10,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    
    profileImageWrapper: {
        width: 120, // Match the size of the profileImage
        height: 120, // Match the size of the profileImage
        borderRadius: 60, // Half of the width/height
        overflow: 'visible',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc', // Default gray background
        position: 'relative', // Enable absolute positioning for the plus icon
    },
    
    
    plusIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30, // Size of the blue circle
        height: 30, // Size of the blue circle
        borderRadius: 15, // Half of the width/height for a perfect circle
        backgroundColor: '#1976d2', // Blue background color
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    plusIconText: {
        color: '#fff', // White color for the plus sign
        fontSize: 20,
        lineHeight: 20,
    },
    
    defaultProfileImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc', // Default gray background
        borderRadius: 60,
    },
    
});

export default SignUpPage;