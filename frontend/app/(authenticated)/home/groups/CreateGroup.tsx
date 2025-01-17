import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, Image, Button, StyleSheet, Alert, Pressable, Keyboard, TouchableOpacity,
    SafeAreaView, TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, auth, db } from "@firebaseConfig";
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CTAButton } from "@components/CTAButton";
import { generateGroupCode, createGroup, addGroupImage } from '@backend/src/groups';
import { addGroupToUser } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import { useRouter } from 'expo-router'

const CreateGroupPage: React.FC = () => {
    const { userID } = useUser();
    const [groupName, setGroupName] = useState<string | undefined>();
    const [groupImage, setGroupImage] = useState<string | undefined>();
    const [users, setUsers] = useState<Map<string, Map<string, any>> | undefined>();
    const [errorMessage, setErrorMessage] = useState<string | undefined>(); // State for error message
    const router = useRouter();


    const createGroupFnc = async () => {
        if (!groupName) {
            setErrorMessage('Please provide a group name.');
            return;
        }
        const groupCode = await generateGroupCode();
        const groupID: any = await createGroup(userID, groupName || '', groupCode);
        await addGroupImage(groupID, groupImage || '');
        await addGroupToUser(userID, groupID);
        // Replace current route with 'HomeTab'
        router.replace('/(authenticated)/home'); // Replace with your HomeTab route

        // Navigate to 'InviteGroup' with parameters
        router.push({
            pathname: '/(authenticated)/home/groups/InviteGroup',
            params: { groupID, fromCreate: "true" },
        });
    }

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

            setGroupImage(manipulatedImage.uri);
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Pressable style={styles.contentView} onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Create Group</Text>
                    </View>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Image
                            source={require('@components/back-icon.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>

                    <View style={styles.groupImageContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.groupImageWrapper}>
                            {groupImage ? (
                                <Image source={{ uri: groupImage }} style={styles.groupImage} />
                            ) : (
                                <Image
                                    source={require('@components/blank-profile-picture.png')}
                                    style={styles.groupImage}
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
                            placeholder="Group Name"
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholderTextColor="#999797"
                        />
                        <TouchableOpacity 
                        onPress={createGroupFnc}
                        style={[styles.buttonContainer]}
                        >
                            <Text style={styles.button_text}>Submit</Text>
                        </TouchableOpacity>
                        {errorMessage && ( // Display error message if present
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        )}
                    </View>

            
                </View>
            </Pressable>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    input: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    container: {
        // flex: 1,
        justifyContent: 'center',
        marginTop: 50,
        height: '100%',
    },
    // row: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     justifyContent: 'space-between',
    //     marginBottom: 20,
    // },
    backImage: {
        width: 40,
        height: 40,
    },
    text: {
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 24,
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
        justifyContent: "center",
    },
    titleText: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
    },
    loginTextField: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        height: 50,
        fontSize: 20,
        paddingHorizontal: 12,
        marginVertical: 30,
        marginBottom: 80,
        marginHorizontal: 20,
        fontWeight: "100",
        fontFamily: 'Lexend'
    },
    mainContent: {
        flex: 6,
    },
    backButton: {
        position: 'absolute',
        top: 22,
        left: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    groupImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginVertical: 10,
    },
    groupImageContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    
    groupImageWrapper: {
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
    
    defaultGroupImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc', // Default gray background
        borderRadius: 60,
    },
    button_text: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        color: 'red',
        marginTop: 30,
    },
    buttonContainer: {
        borderRadius: 30,
        flexDirection: "row",
        paddingVertical: 13, // Reduce padding to make it smaller
        justifyContent: "center",
        backgroundColor: '#1976d2',
        alignSelf: "center",
        width: 150,
    },
});

export default CreateGroupPage;
