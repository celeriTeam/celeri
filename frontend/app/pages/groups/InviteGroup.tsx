import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Button, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup, addGroupImage } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser } from '@backend/src/users';
import { useUser } from '../../UserProvider';

type InviteGroupNavigationProp = StackNavigationProp<RootStackParamList, 'InviteGroup'>;
type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

type Props = {
    navigation: InviteGroupNavigationProp;
};

const InvitePage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups, loading } = useUser();
    const route = useRoute<InviteGroupRouteProp>();
    const { groupID, fromCreate } = route.params;
    const [isModalVisible, setModalVisible] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [cycles, setCycles] = useState('5');
    const [dailyTokens, setDailyTokens] = useState('100');
    const [startingTokens, setStartingTokens] = useState('1000');
    const [defaultBetOnSelf, setDefaultBetOnSelf] = useState('100');
    const userStartRequirement = 3;

    const currentGroupName = groups[groupID]?.groupName;
    const currentGroupCode = groups[groupID]?.groupCode;
    const groupUsersIdArray = groups[groupID]?.userList;
    let currentGroupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; }[] = [];
    if (groupUsersIdArray) {
        // get user names & pfps from user IDs
        for (let i = 0; i < groupUsersIdArray.length; i++) {
            const userID = groupUsersIdArray[i];
            const userName = groups[groupID]?.users[userID].username;
            const profilePic = groups[groupID]?.users[userID].profilePic;
            currentGroupUsersArray.push({ id: userID, name: userName, pfp: profilePic });
        }
    }
    const groupCreator = groups[groupID]?.groupCreator;
    const isCreator = (groupCreator === userID);

    useEffect(() => {
        // Add listeners to track the keyboard state
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        // Cleanup listeners
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const openModal = () => {
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const isFormValid = cycles !== '' && dailyTokens !== '' && startingTokens !== '' && defaultBetOnSelf !== '';

    const handleStartPress = async () => {
        console.log('Start game button pressed');
        setModalVisible(false);
        await startGame(groupID, +cycles, +dailyTokens, +startingTokens, +defaultBetOnSelf);
        // navigation.navigate('GroupDetails', { groupID: groupID });
        navigation.reset({
            index: 1,
            routes: [
                { name: 'HomeTab' }, // the first route in the stack
                { name: 'HeadToHeadPage', params: { groupID: groupID } } // the top route in the stack
            ],
        });
    };

    const handleStartReminderPress = async () => {
        console.log('Remind creator to start button pressed');

        Alert.alert('Reminder sent', 'The creator has been reminded to start the game.');
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

            addGroupImage(groupID, manipulatedImage.uri);
            }
        }
    };

    const copyToClipboard = () => {
        Clipboard.setString(currentGroupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.contentView}>
            <View style={styles.container}>
                {fromCreate ? (
                    <Text style={styles.groupNameCreated}>
                        <Text style={styles.groupName}>{currentGroupName}</Text> has been successfully created!
                    </Text>
                ) : (
                    <View>
                        <View style={styles.titleContainer}>
                            <Text style={styles.groupNameStandalone}>{currentGroupName}</Text>
                        </View>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Image
                                source={require('@components/back-icon.png')}
                                style={styles.backImage}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.groupImageContainer}>
                    {groups[groupID]?.groupImageUrl ? (
                        <Image source={{ uri: groups[groupID]?.groupImageUrl }} style={styles.groupImage} />
                    ) : (
                        <Image
                            source={require('@components/blank-profile-picture.png')}
                            style={styles.groupImage}
                        />
                    )}
                </View>
            <TouchableOpacity onPress={pickImage}>
                <Text style={styles.buttonText}>Edit group pic</Text>
            </TouchableOpacity>
                {currentGroupUsersArray.length >= userStartRequirement ? (
                    <Text style={styles.text}>
                        If your group is ready, click the button below to start a new game.
                    </Text>
                ) : (
                    <Text style={styles.text}>
                        You need three members to start a game. Share the group code below to invite others to join!
                    </Text>
                )}
                <Text style={styles.text}>
                    Group Members:
                </Text>
               {currentGroupUsersArray ? (
                    currentGroupUsersArray.map((user) => (
                        <View key={user.id} style={styles.row}>
                            <Image
                                source={{ uri: user.pfp }}
                                style={styles.profileImage}
                            />
                            <Text key={user.id} style={styles.username}>{user.name}</Text>
                        </View>
                    ))
                ) : (
                    <Text>No users found.</Text>
                )}
                <View style={styles.centeredGroupCode}>
                    <Text style={styles.groupCode}>{currentGroupCode}</Text>
                    <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardIcon}>
                        <MaterialIcons name="content-copy" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                {currentGroupUsersArray.length >= userStartRequirement && (
                    isCreator ? (
                        <TouchableOpacity
                            onPress={openModal}
                            style={styles.startButton}
                        >
                            <Text style={styles.startButtonText}>Start</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleStartReminderPress}
                            style={styles.startButton}
                        >
                            <Text style={styles.startButtonText}>Remind creator to start</Text>
                        </TouchableOpacity>
                    )
                )}
            </View>
            {/* Settings Modal */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={closeModal}
            >
                {/* Overlay to dismiss the keyboard */}
                {keyboardVisible && (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.dismissOverlay} />
                    </TouchableWithoutFeedback>
                )}
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Input fields */}
                        <Text style={styles.modalTitle}>Game Settings</Text>

                        <Text>Amount of Cycles (Rounds):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="5"
                            value={cycles}
                            onChangeText={setCycles}
                            keyboardType="numeric"
                            placeholderTextColor="#888"
                        />

                        <Text>Amount of Tokens You Get Each Day:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="100"
                            value={dailyTokens}
                            onChangeText={setDailyTokens}
                            keyboardType="numeric"
                            placeholderTextColor="#888"
                        />

                        <Text>Starting Tokens (Minimum 1000):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1000"
                            value={startingTokens}
                            onChangeText={setStartingTokens}
                            keyboardType="numeric"
                            placeholderTextColor="#888"
                        />

                        <Text>Default Bet on Yourself:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="100"
                            value={defaultBetOnSelf}
                            onChangeText={setDefaultBetOnSelf}
                            keyboardType="numeric"
                            placeholderTextColor="#888"
                        />

                        {/* Buttons */}
                        <TouchableOpacity 
                            onPress={isFormValid ? handleStartPress : undefined} 
                            style={[styles.confirmButton, { backgroundColor: isFormValid ? '#28a745' : '#d3d3d3' }]}
                            disabled={!isFormValid}
                        >
                            <Text style={styles.confirmButtonText}>Confirm & Start</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={closeModal} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    contentView: {
        flex: 1,
        backgroundColor: 'white'
    },
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    groupImageContainer: {
        alignItems: 'center',
        //marginBottom: 10,
    },
    groupImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginVertical: 10,
    },
    buttonText: {
        marginBottom: 20,
        fontFamily: "Lexend",
        textAlign: 'center',
        color: 'blue',
    },
    backButton: {
        position: 'absolute',
        top: 22,
        left: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginLeft: 20, 
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    backImage: {
        width: 40,
        height: 40,
    },
    groupNameCreated: {
        marginTop: 40,
        fontSize: 20,
        marginBottom: 40,
        fontFamily: "Lexend",
        textAlign: "center",
        alignSelf: "center",
    },
    groupName: {
        fontSize: 24,
        fontFamily: "Lexend-Bold",
    },
    titleContainer: {
        justifyContent: "center",
    },
    groupNameStandalone: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
    },
    text: {
        fontSize: 18,
        marginTop: 20,
        marginHorizontal: 20,
        fontFamily: "Lexend",
        textAlign: "center",
        alignSelf: "center",
        marginBottom: 20
    },
    bold_text: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 40,
        marginHorizontal: 20,
        fontFamily: "Lexend-Bold",
        textAlign: "center",
        alignSelf: "center"
    },
    username: {
        fontSize: 16,
        fontFamily: "Lexend"
    },
    centeredGroupCode: {
        flexDirection: 'row',
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
    startButton: {
        borderRadius: 30,
        flexDirection: "row",
        paddingVertical: 13, // Reduce padding to make it smaller
        justifyContent: "center",
        backgroundColor: '#1976d2',
        alignSelf: "center",
        width: 150,
    },
    startButtonText: {
        textAlign: "center",
        fontSize: 15,
        color: 'white',
        fontFamily: 'Lexend',
    },
    // Modal styles
    dismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
    },
    confirmButton: {
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        marginTop: 10,
        padding: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ff0000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default InvitePage;
