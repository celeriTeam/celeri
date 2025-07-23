import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Button, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { addGroupImage, editGroupName } from '@backend/src/groups';
import { useUser } from '../../../../UserProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native-size-scaling';

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
    const [editGroupModal, setEditGroupModal] = useState(false);
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [currentGroupName, setCurrentGroupName] = useState(groups[groupID]?.groupName);
    const [currentGroupPic, setCurrentGroupPic] = useState(groups[groupID]?.groupImageUrl);
    const inputRef = useRef<TextInput>(null);
    
    const date = new Date(groups[groupID]?.createdAt.seconds * 1000);
    const month = date.getMonth() + 1;
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const handleClose = () => {
        setCurrentGroupName(groups[groupID]?.groupName);
        setCurrentGroupPic(groups[groupID]?.groupImageUrl);
        setEditGroupModal(false);
    }
    
    const handleSave = () => {
        // Check username update
        if (currentGroupName !== groups[groupID]?.groupName){
            editGroupName(groupID, currentGroupName);
        }

        // Check image update
        if (currentGroupPic !== groups[groupID]?.groupImageUrl){
            addGroupImage(groupID, currentGroupPic);
        }
        setEditGroupModal(false);
    }
    
    const copyToClipboard = () => {
        Clipboard.setString(groups[groupID]?.groupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };
    
    useEffect(() => {
        if (editGroupModal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editGroupModal]);

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
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setEditGroupModal(true)} style={styles.editButton} activeOpacity={0.8}>
                        <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditGroupModalVisible(false)}>
                        <Image
                            source={require('@assets/icons/x.png')}
                            style={styles.closeButtonIcon}
                        />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setEditGroupModal(true)} activeOpacity={0.8}>
                    <Image
                        source={currentGroupPic != '' ? { uri: currentGroupPic } : require('@components/blank-profile-picture.png')}
                        style={styles.groupImage}
                    />
                    {/* <View style={styles.whiteCircle}>
                        <Image
                            source={require('@assets/icons/editBlack.png')}
                            style={styles.editImage}
                        />
                    </View> */}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditGroupModal(true)} activeOpacity={0.8}>
                    <Text style={styles.name}>{currentGroupName}</Text>
                </TouchableOpacity>
                <View style={{ padding: 5, }}>
                    <Text style={styles.joinedDate}>Joined {monthName} {year}</Text>
                </View>
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
                visible={editGroupModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.header, { paddingVertical: 20, paddingHorizontal: 20, }]}>
                            <TouchableOpacity onPress={handleClose} activeOpacity={1}>
                                <Text style={styles.headerText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={1}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={1}>
                            <Image
                                source={currentGroupPic != '' ? { uri: currentGroupPic } : require('@components/blank-profile-picture.png')}
                                style={styles.groupImage}
                            />
                            <Text style={styles.editImageText}>Change or Upload Profile Photo</Text>
                        </TouchableOpacity>
                        <TextInput
                            ref={inputRef}
                            style={styles.nameInput}
                            value={currentGroupName}
                            onChangeText={setCurrentGroupName}
                        />
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
        width: '100%',
        padding: 10,
        paddingVertical: 5,
    },
    headerText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#fff',
    },
    saveText: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#74FF6D',
    },
    imageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    editImageText: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#74FF6D',
        marginBottom: 30,
    },
    saveButton: {
        borderColor: '#74FF6D',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 20
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
        marginVertical: 10,
        width: 110,
        height: 110,
        borderRadius: 60,
        borderColor: '#74FF6D',
        borderWidth: 2,
    },
    editButton: {
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 25,
        padding: 5,
        paddingHorizontal: 20
    },
    buttonText: {
        fontFamily: "Lexend",
        fontSize: 13,
        textAlign: 'center',
        color: '#fff',
    },
    name: {
        fontFamily: "Lexend",
        fontSize: 25,
        color: '#fff',
    },
    joinedDate: {
        fontFamily: "Lexend",
        fontSize: 15,
        color: '#74FF6D',
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
        fontSize: 17,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#656565',
        backgroundColor: '#000', // Light gray input area
        padding: 13,
        marginHorizontal: 17,
        marginVertical: 5,
        borderRadius: 16,
        marginBottom: 30,
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
        width: '93%',
        backgroundColor: 'black',
        position: 'absolute',
        top: '21%',
        borderWidth: 1, // Thin border
        borderColor: '#4A4A4A', // Dark grey border
        borderRadius: 20,
    },
});

export default EditGroupPage;