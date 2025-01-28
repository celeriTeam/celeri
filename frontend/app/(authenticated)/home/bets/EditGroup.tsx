import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Button, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { addGroupImage, editGroupName } from '@backend/src/groups';
import { useUser } from '../../../UserProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

type userProp = {
    id: string;
    name: string;
    username: string;
};

const EditGroupPage: React.FC< {
    groupID: string,
    setEditGroupModalVisible: (visible: boolean) => void;
    onNavigate: (id: string) => void;
} > = ({ groupID, setEditGroupModalVisible, onNavigate }) => {
    const { userID, groups } = useUser();
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [currentGroupName, setCurrentGroupName] = useState(groups[groupID]?.groupName);
    const [currentGroupPic, setCurrentGroupPic] = useState(groups[groupID]?.groupImageUrl);
    const inputRef = useRef<TextInput>(null);
    
    const handleSave = () => {
        // Check username update
        if (currentGroupName !== groups[groupID]?.groupName){
            editGroupName(groupID, currentGroupName);
        }

        // Check image update
        if (currentGroupPic !== groups[groupID]?.groupImageUrl){
            addGroupImage(groupID, currentGroupPic);
        }
        setEditGroupModalVisible(false);
    }
    
    const copyToClipboard = () => {
        Clipboard.setString(groups[groupID]?.groupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };

    useEffect(() => {
        if (isEditingGroupName && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingGroupName]);

    const handleEditGroupName = async () => {
        if (currentGroupName !== groups[groupID]?.groupName){
            editGroupName(groupID, currentGroupName);
        }
        setIsEditingGroupName(false);
    };

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
                addGroupImage(groupID, manipulatedImage.uri);
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setEditGroupModalVisible(false)}>
                    <Image
                        source={require('@assets/icons/x.png')}
                        style={styles.closeButtonIcon}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} activeOpacity={1}>
                    <Image
                        source={currentGroupPic != '' ? { uri: currentGroupPic } : require('@components/blank-profile-picture.png')}
                        style={styles.groupImage}
                    />
                    <View style={styles.whiteCircle}>
                        <Image
                            source={require('@assets/icons/editBlack.png')}
                            style={styles.editImage}
                        />
                    </View>
                </TouchableOpacity>
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => setIsEditingGroupName(true)} activeOpacity={0.8}>
                        <Text style={styles.name}>{currentGroupName}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.buttonText}>Edit Group Photo</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Invite Code</Text>
                <View style={styles.groupCodeContainer}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.groupCode}>{groups[groupID]?.groupCode}</Text>
                            <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardContainer}>
                                <Image
                                    source={require('@assets/icons/clipboard.png')}
                                    style={styles.clipboardIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                <Text style={styles.title}>{groups[groupID]?.userList.length} Members</Text>
                <GestureHandlerRootView style={{ flex: 1, width: '100%', marginBottom: 70, }}>
                    <ScrollView style={styles.membersContainer}>
                        {groups[groupID]?.userList.map((id: string) => (
                            <TouchableOpacity onPress={() => onNavigate(id)} activeOpacity={1} key={id} style={styles.memberItem}>
                                <View style={styles.row}>
                                    <Image
                                        source={
                                            groups[groupID]?.users[id]?.profilePic ? 
                                            { uri: groups[groupID]?.users[id]?.profilePic }
                                            : require('@components/blank-profile-picture.png')
                                        }
                                        style={styles.profilePic}
                                    />
                                    <Text style={styles.memberName}>{groups[groupID]?.users[id]?.name}</Text>
                                </View>
                                <Text style={styles.memberUserName}>@{groups[groupID]?.users[id]?.username}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </GestureHandlerRootView>
            </View>
            <Modal
                transparent={true}
                visible={isEditingGroupName}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.moneyModalContainer, { height: '20%',}]}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsEditingGroupName(false)}>
                            <Image
                                source={require('@assets/icons/x.png')}
                                style={styles.closeButtonIcon}
                            />
                        </TouchableOpacity>
                        <TextInput
                            ref={inputRef}
                            style={styles.nameInput}
                            value={currentGroupName}
                            onChangeText={setCurrentGroupName}
                        />
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => {setCurrentGroupName(groups[groupID]?.groupName); setIsEditingGroupName(false);}} activeOpacity={1}>
                                <Text style={styles.headerText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleEditGroupName} style={styles.saveButton} activeOpacity={1}>
                                <Text style={styles.headerText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        // flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '90%',
    },
    headerText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#fff',
    },
    saveButton: {
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 20
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
    closeButtonIcon: {
        width: 20,
        height: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupImage: {
        marginTop: 40,
        width: 110,
        height: 110,
        borderRadius: 60,
        marginBottom: 20,
        borderColor: '#74FF6D',
        borderWidth: 2,
    },
    buttonText: {
        marginBottom: 40,
        fontFamily: "Lexend",
        fontSize: 13,
        textAlign: 'center',
        color: '#74FF6D',
    },
    name: {
        fontFamily: "Lexend",
        fontSize: 25,
        color: '#fff',
        marginRight: 3,
        marginBottom: 5,
    },
    whiteCircle: {
        position: 'absolute',
        bottom: 20,
        right: 0,
        width: 34,
        height: 34,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editImage: {
        width: 14,
        height: 14,
    },
    checkmarkImage: {
        width: 18,
        height: 18,
        backgroundColor: '#fff',
        borderRadius: 50,
    },
    nameInput: {
        fontFamily: "Lexend",
        fontSize: 23,
        marginRight: 20,
        borderBottomWidth: 3,
        borderColor: '#6b6b6b',
        backgroundColor: '#d9d9d9', // Light gray input area
        padding: 5,
    },
    groupCodeInvite: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#fff',
    },
    title: {
        fontFamily: "Lexend",
        fontSize: 16,
        color: '#fff',
        alignSelf: 'flex-start',
        paddingVertical: 10,
    },
    groupCodeContainer: {
        alignItems: 'center',
        width: '100%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#4BFF6C96',
    },
    groupCode: {
        fontFamily: "Lexend",
        fontSize: 20,
        color: '#fff',
    },
    clipboardContainer: {
        position: 'absolute',
        right: 0,
    },
    clipboardIcon: {
        width: 23,
        height: 23,
    },
    membersContainer: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        paddingHorizontal: 20,
        backgroundColor: '#00000080',
        marginVertical: 3,
        borderRadius: 10,
    },
    profilePic: {
        width: 26,
        height: 26,
        borderRadius: 20,
        borderColor: '#fff',
        borderWidth: 1,
    },
    memberName: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#fff',
        marginLeft: 10,
    },
    memberUserName: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#74FF6D',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        position: 'relative',
    },
    moneyModalContainer: {
        width: '90%',
        // height: '80%',
        backgroundColor: 'black',
        position: 'relative',
        borderWidth: 1, // Thin border
        borderColor: '#4A4A4A', // Dark grey border
        borderRadius: 15,
    },
    infoModalContainer: {
        padding: 30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tokenText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: "white"
    },
});

export default EditGroupPage;