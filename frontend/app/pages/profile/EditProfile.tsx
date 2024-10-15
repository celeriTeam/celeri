import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Button, TouchableOpacity, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { editProfilePic, editUsername } from '@backend/src/users';
import { useUser } from '../../UserProvider';

type EditProfilePageNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

type Props = {
    navigation: EditProfilePageNavigationProp;
};

const EditProfilePage: React.FC<Props> = ({ navigation }) => {
    const { userID, profileImageUrl, username } = useUser();
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [currentUsername, setcurrentUsername] = useState(username);
    const [currentProfilePic, setcurrentProfilePic] = useState(profileImageUrl);
    const inputRef = useRef<TextInput>(null);

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
          quality: 1,
        });
    
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            if (selectedAsset.uri) {
                setcurrentProfilePic(selectedAsset.uri);
                // set profile pic endpoint
                editProfilePic(userID, selectedAsset.uri);
            }
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
            <View style={styles.editPic} >
                <Button title="Edit profile pic" onPress={pickImage} />
            </View>
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
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    backImage: {
        width: 24,
        height: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        marginTop: 40,
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    editPic: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    name: {
        fontSize: 34,
        fontWeight: 'bold',
        marginRight: 20,
    },
    editImage: {
        width: 20,
        height: 20,
        borderRadius: 50,
    },
    nameInput: {
        fontSize: 34,
        fontWeight: 'bold',
        marginRight: 20,
        borderBottomWidth: 3,
        borderColor: '#6b6b6b',
        backgroundColor: '#d9d9d9', // Light gray input area
        padding: 5,
    },
});

export default EditProfilePage;