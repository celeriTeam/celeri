import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Button, TouchableOpacity, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types';
import { addGroupImage, editGroupName } from '@backend/src/groups';
import { useUser } from '../../../UserProvider';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

type EditGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'EditGroupPage'>;
type EditGroupPageRouteProp = RouteProp<RootStackParamList, 'EditGroupPage'>;

type Props = {
    navigation: EditGroupPageNavigationProp;
};

const EditGroupPage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups } = useUser();
    const route = useRoute<EditGroupPageRouteProp>();
    const { groupID } = route.params;
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [currentGroupName, setCurrentGroupName] = useState(groups[groupID]?.groupName);
    const [currentGroupPic, setCurrentGroupPic] = useState(groups[groupID]?.groupImageUrl);
    const inputRef = useRef<TextInput>(null);

    const handleEditPress = () => {
        setIsEditingGroupName(true);
    };

    const handleCheckPress = () => {
        //set username endpoint
        if (currentGroupName !== groups[groupID]?.groupName){
            editGroupName(groupID, currentGroupName);
        }
        setIsEditingGroupName(false);
    };
    
        const copyToClipboard = () => {
            Clipboard.setString(groups[groupID]?.groupCode || '');
            Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
        };

    useEffect(() => {
        if (isEditingGroupName && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingGroupName]);

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

            setCurrentGroupPic(manipulatedImage.uri);
            // set profile pic endpoint
            addGroupImage(groupID, manipulatedImage.uri);
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
            {currentGroupPic != '' ? (
                <Image
                source={{ uri: currentGroupPic }}
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
            {isEditingGroupName ? (
                <>
                    <View style={styles.row}>
                        <TextInput
                            ref={inputRef}
                            style={styles.nameInput}
                            value={currentGroupName}
                            onChangeText={setCurrentGroupName}
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
                        <Text style={styles.name}>{currentGroupName}</Text>
                        <TouchableOpacity onPress={handleEditPress}>
                            <Image
                            source={require('@components/edit-icon.jpg')}
                            style={styles.editImage}
                            />
                        </TouchableOpacity>
                    </View>
                </>
            )}
            <View style={styles.centeredGroupCode}>
                <Text style={styles.groupCodeInvite}>Invite more people!</Text>
                <View style={styles.row}>
                    <Text style={styles.groupCode}>{groups[groupID]?.groupCode}</Text>
                    <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardIcon}>
                        <MaterialIcons name="content-copy" size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
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
    groupCodeInvite: {
        fontFamily: "Lexend",
        fontSize: 20,
        marginBottom: 20,
    },
    centeredGroupCode: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupCode: {
        fontSize: 45,
        // color: '#0F1108',
        // backgroundColor: '#D3D3D3',
        color: '#0F1108',
        backgroundColor: '#1E90FF',
        fontWeight: 'bold',
        padding: 15,
        borderRadius: 5,
    },
    clipboardIcon: {
        marginLeft: 10,
    },
});

export default EditGroupPage;