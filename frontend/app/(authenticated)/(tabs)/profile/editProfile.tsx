import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Button, TouchableOpacity, TextInput, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { deleteUser, editName, editProfilePic, editUsername } from '@backend/src/users';
import { useUser } from '@/app/UserProvider';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';

type Props = {
    setEditProfileModal: (editProfileModal: boolean) => void,
};

const EditProfilePage: React.FC<Props> = ({ setEditProfileModal }) => {
    const { userID, profileImageUrl, username, name } = useUser();
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [currentUsername, setCurrentUsername] = useState(username);
    const [currentPic, setCurrentPic] = useState(profileImageUrl);
    const [currentName, setCurrentName] = useState(name);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const router = useRouter();

    const handleEditPress = () => {
        setIsEditingUsername(true);
    };
    
    const handleCloseEdit = () => {
        setEditProfileModal(false);
        setCurrentName(name);
        setCurrentUsername(username);
        setCurrentPic(profileImageUrl);
    }

    const handleEdit = async () => {
        if (currentName !== name) {
            editName(userID, currentName);
        }
        if (currentUsername !== username) {
            editUsername(userID, currentUsername);
        }
        if (currentPic !== profileImageUrl) {
            editProfilePic(userID, currentPic);
        }
        setEditProfileModal(false);
    };

    const handleCheckPress = () => {
        //set username endpoint
        if (currentUsername !== username){
            editUsername(userID, currentUsername);
        }
        setIsEditingUsername(false);
    };

    const openDeleteModal = () => {
        setDeleteConfirmation(true);
    };

    const reAuthenticateAccount = () => {

    };
    
    const handleDeleteAccount = () => {
        // logic to delete account
        deleteUser(userID);
        router.replace('/onboarding');
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

                setCurrentPic(manipulatedImage.uri);
            }
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleCloseEdit} activeOpacity={1}>
                        <Text style={styles.headerText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleEdit} style={styles.saveButton} activeOpacity={1}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.imageContainer}>
                    <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={1}>
                        <Image
                            source={currentPic != '' ? { uri: currentPic } : require('@components/blank-profile-picture.png')}
                            style={styles.profileImageEdit}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={1}>
                        <Text style={styles.editImageText}>Change or Upload Profile Photo</Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    ref={inputRef}
                    style={styles.nameInput}
                    value={currentName}
                    onChangeText={setCurrentName}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, }}>
                    <Text style={{ fontFamily: 'Lexend', color: '#fff', fontSize: 17, width: '5%', marginLeft: 17, }}>@</Text>
                    <TextInput
                        ref={inputRef}
                        style={[styles.nameInput, { width: '84%', marginLeft: 5, }]}
                        value={currentUsername}
                        onChangeText={setCurrentUsername}
                    />
                </View>
                <TouchableOpacity onPress={openDeleteModal}>
                    <Text style={styles.delete}>Delete this account</Text>
                </TouchableOpacity>
                <Modal transparent={true} visible={deleteConfirmation}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.headerText}>Are you sure you want to delete your account?</Text>
                            <Text style={styles.header2Text}>This action cannot be undone.</Text>
                            <View>
                                <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteYesButton}>
                                    <Text style={styles.deleteYes}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setDeleteConfirmation(false)}>
                                    <Text style={styles.deleteNo}>Nevermind.</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    imageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 25,
    },
    headerText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#fff',
    },
    header2Text: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#ffffffaa',
        marginBottom: 10,
    },
    saveText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#74FF6D',
    },
    saveButton: {
        borderColor: '#74FF6D',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 20
    },
    profileImageEdit: {
        width: 110,
        height: 110,
        borderRadius: 60,
        borderColor: '#74FF6D',
        borderWidth: 2,
        marginBottom: 20,
    },
    editImageText: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#74FF6D',
        marginBottom: 10,
    },
    nameInput: {
        fontFamily: "Lexend",
        fontSize: 17,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#656565',
        backgroundColor: '#000', // Light gray input area
        padding: 13,
        marginHorizontal: 17,
        marginVertical: 5,
        borderRadius: 16,
    },
    delete: {
        fontFamily: "Lexend",
        color: '#ff4444ff',
        marginBottom: 15,
        alignSelf: 'center',
    },
    deleteYesButton: {
        backgroundColor: '#ffffff11',
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 30,
        alignSelf: 'center',
        marginBottom: 10,
    },
    deleteYes: {
        fontFamily: "Lexend",
        color: '#ff4444ff',
        fontSize: 15,
    },
    deleteNo: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 11,
        marginBottom: 15,
        alignSelf: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '85%',
        backgroundColor: 'black',
        borderWidth: 1,
        borderColor: '#A7A7A7',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        gap: 15,
    },
});

export default EditProfilePage;