import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Button, TouchableOpacity, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { editProfilePic, editUsername } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';

const EditProfilePage: React.FC = () => {
    const { userID, profileImageUrl, username } = useUser();
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [currentUsername, setcurrentUsername] = useState(username);
    const [currentProfilePic, setcurrentProfilePic] = useState(profileImageUrl);
    const inputRef = useRef<TextInput>(null);
    const router = useRouter();

    const handleEditPress = () => {
        setIsEditingUsername(true);
    };

    const handleCheckPress = () => {
        //set username endpoint
        if (currentUsername !== username){
            editUsername(userID, currentUsername);
        }
        setIsEditingUsername(false);
    };

    useEffect(() => {
        if (isEditingUsername && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingUsername]);

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

            setcurrentProfilePic(manipulatedImage.uri);
            // set profile pic endpoint
            editProfilePic(userID, manipulatedImage.uri);
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Image
                        source={require('@components/back-icon.png')}
                        style={styles.backImage}
                    />
                </TouchableOpacity>
                {currentProfilePic != '' ? (
                    <Image
                    source={{ uri: currentProfilePic }}
                    style={styles.profileImage}
                    />
                ) : (
                    <Image
                    source={require('@components/blank-profile-picture.png')}
                    style={styles.profileImage}
                    />
                )}
                <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.buttonText}>Edit profile pic</Text>
                </TouchableOpacity>
                {isEditingUsername ? (
                    <>
                        <View style={styles.row}>
                            <TextInput
                                ref={inputRef}
                                style={styles.nameInput}
                                value={currentUsername}
                                onChangeText={setcurrentUsername}
                            />
                            <TouchableOpacity onPress={handleCheckPress}>
                                <Image
                                    source={require('@components/checkmark-icon.png')}
                                    style={styles.editImage}
                                />
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.name}>{currentUsername}</Text>
                            <TouchableOpacity onPress={handleEditPress}>
                                <Image
                                source={require('@components/edit-icon.jpg')}
                                style={styles.editImage}
                                />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        // flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        marginTop: 50,
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    backImage: {
        width: 40,
        height: 40,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        marginTop: 40,
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
    },
    buttonText: {
        marginBottom: 40,
        fontFamily: "Lexend",
        textAlign: 'center',
        color: 'blue',
    },
    name: {
        fontFamily: "Lexend-Bold",
        fontSize: 34,
        marginRight: 20,
    },
    editImage: {
        width: 20,
        height: 20,
        borderRadius: 50,
    },
    nameInput: {
        fontFamily: "Lexend-Bold",
        fontSize: 34,
        marginRight: 20,
        borderBottomWidth: 3,
        borderColor: '#6b6b6b',
        backgroundColor: '#d9d9d9', // Light gray input area
        padding: 5,
    },
});

export default EditProfilePage;