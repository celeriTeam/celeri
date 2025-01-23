import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Button, ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView, } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup, addGroupImage, deleteGroup, leaveGroup, getGroupIsGameActive, getGroupProfilePic } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import { createNudge } from '@/backend/src/notifs';
import { useLocalSearchParams, useRouter } from 'expo-router';

const db = getFirestore(app);

const InvitePage: React.FC = () => {
    const { userID } = useUser();
    const { leaderID, groupID, fromCreate } = useLocalSearchParams();
    const router = useRouter();

    // Convert `fromCreate` back to a boolean
    const isFromCreate = fromCreate === 'true';
    const resolvedLeaderID = Array.isArray(leaderID) ? leaderID[0] : leaderID;
    const resolvedGroupID = Array.isArray(groupID) ? groupID[0] : groupID;
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; }[]>([]);
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [cycles, setCycles] = useState('5');
    const [dailyTokens, setDailyTokens] = useState('100');
    const [startingTokens, setStartingTokens] = useState('1000');
    const [gameType, setGameType] = useState("weekly");
    const [resetDay, setResetDay] = useState(0);
    const [defaultBetOnSelf, setDefaultBetOnSelf] = useState('100');
    const [isLoading, setIsLoading] = useState(true);
    const userStartRequirement = 3;

    // Direct firebase listener in InviteGroup page
    useEffect(() => {
            let cleanup: () => void;
        
            const initialize = async () => {
                try {
                    cleanup = await fetchData(userID);
                } catch (error) {
                    console.error('Error fetching user groups:', error);
                } finally {
                    setIsLoading(false);
                }
            };
        
            initialize();
        
            return () => {
                if (cleanup) {
                    cleanup();
                }
            };
        }, [userID]);

    const fetchData = async (uid: string) => {
        const currentGroups: { [groupID: string]: any } = {};
        const groupsRef = collection(db, "groups");
        const groupDocRef = doc(groupsRef, resolvedGroupID);

        // Unsubscribe firebase listener functions
        const unsubscribeFunctions: (() => void)[] = [];
        const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
            setIsLoading(true);
            if (docSnapshot.exists() && resolvedGroupID) {
                const [isGameActive, groupCode, groupName, groupImageUrl, groupCreator] = await Promise.all([
                    getGroupIsGameActive(resolvedGroupID),
                    getGroupCode(resolvedGroupID),
                    getGroupName(resolvedGroupID),
                    getGroupProfilePic(resolvedGroupID),
                    getGroupCreator(resolvedGroupID),
                ]);
                
                const userList = await getUsersInGroup(resolvedGroupID); // userIDs
                const users: { [userID: string]: any } = {};
                let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined }[] = [];
                if (userList) {
                    await Promise.all(userList.map(async (selectedUserID) => {
                        const [profilePic, username] = await Promise.all([
                            getProfilePic(selectedUserID),
                            getUserName(selectedUserID),
                        ]);

                        users[selectedUserID] = {
                            profilePic,
                            username,
                        };
                        groupUsersArray.push({ id: selectedUserID, name: username, pfp: profilePic });
                    }));
                    setCurrentGroupUsersArray(groupUsersArray);
                }
                currentGroups[resolvedGroupID] = {
                    isGameActive, 
                    groupCode, 
                    groupName, 
                    groupImageUrl, 
                    groupCreator,
                    userList,
                };
                setGroups(currentGroups);
            }
            
            unsubscribeFunctions.push(unsubscribeGroup);
            setIsLoading(false);
        });

        return () => {
            unsubscribeFunctions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };

    }

    // if groups[groupID]?.isGameActive is true, then nav to headtohead page
    useEffect(() => {
        if (groups && groupID && groups[resolvedGroupID]?.isGameActive) {
            router.push({
                pathname: '/(authenticated)/home/bets/HeadToHead',
                params: { groupID: groupID },
            });
        }
    }, [groups, groupID,]);


    const [gameTypeItems, setGameTypeItems] = useState([
        { label: 'Weekly', value: 'weekly' },
        { label: 'Daily', value: 'daily' },
    ]);
    const [gameTypeOpen, setGameTypeOpen] = useState(false);

    const [resetDayItems, setResetDayItems] = useState([
        { label: 'Sunday', value: 0},
        { label: 'Monday', value: 1},
        { label: 'Tuesday', value: 2},
        { label: 'Wednesday', value: 3},
        { label: 'Thursday', value: 4},
        { label: 'Friday', value: 5},
        { label: 'Saturday', value: 6},
    ])
    const [resetDayOpen, setResetDayOpen] = useState(false);

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

    const isFormValid = cycles !== '' && dailyTokens !== '' && startingTokens !== '' && defaultBetOnSelf !== '';

    const handleStartPress = async () => {
        console.log('Start game button pressed');
        setModalVisible(false);
        await startGame(resolvedGroupID, +cycles, +dailyTokens, +startingTokens, +defaultBetOnSelf, gameType, resetDay);
        // navigation.navigate('GroupDetails', { groupID: groupID });

        router.replace('/(authenticated)/home');

        router.push({
            pathname: '/(authenticated)/home/bets/HeadToHead',
            params: { groupID: groupID },
        });
        // navigation.reset({
        //     index: 1,
        //     routes: [
        //         { name: 'HomeTab' }, // the first route in the stack
        //         { name: 'HeadToHeadTutorialPage', params: { groupID: groupID } } // the top route in the stack
        //     ],
        // });
    };

    const handleStartReminderPress = async () => {
        console.log('Remind creator to start button pressed');

        try {
            const nudgeMessage = "They're waiting for you to start the game!"
            const userRef = firestore().collection('users').doc(resolvedLeaderID);
            const userDoc = await userRef.get();
            const tokens = userDoc.data()?.tokens || [];

            createNudge(userID, resolvedGroupID, nudgeMessage, tokens);
            Alert.alert('Reminder sent', 'The creator has been reminded to start the game.');
        } catch (error) {
            console.error("Error sending nudge notification:", error);
            Alert.alert("Error", "Failed to send reminder.");
        }
    };

    const handleDeleteOrLeave = async () => {
        if (isDeleteModalVisible === 'delete') {
            deleteGroup(resolvedGroupID);
        } else if (isDeleteModalVisible === 'leave') {
            leaveGroup(resolvedGroupID, userID);
        }
        router.replace('/(authenticated)/home')
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

            addGroupImage(resolvedGroupID, manipulatedImage.uri);
            }
        }
    };

    const copyToClipboard = () => {
        Clipboard.setString(groups[resolvedGroupID]?.groupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.contentView}>
                <View style={styles.container}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Image
                            source={require('@components/back-icon.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>
                    {isFromCreate ? (
                        <Text style={styles.groupNameCreated}>
                            <Text style={styles.groupName}>{groups[resolvedGroupID]?.groupName}</Text> has been successfully created!
                        </Text>
                    ) : (
                        <View>
                            <View style={styles.titleContainer}>
                                <Text style={styles.groupNameStandalone}>{groups[resolvedGroupID]?.groupName}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.groupImageContainer}>
                        {groups[resolvedGroupID]?.groupImageUrl ? (
                            <Image source={{ uri: groups[resolvedGroupID]?.groupImageUrl }} style={styles.groupImage} />
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
                        <Text style={[styles.text, { textAlign: 'center' }]}>
                            If your group is ready, click the button below to start a new game.
                        </Text>
                    ) : (
                        <Text style={[styles.text, { textAlign: 'center' }]}>
                            You need three members to start a game. Share the group code below to invite others to join!
                        </Text>
                    )}

                    <Text style={[styles.text, { fontWeight: "bold", marginBottom: 10 }]}>
                        {groups[resolvedGroupID]?.userList.length} Member{groups[resolvedGroupID]?.userList.length === 1 ? '' : 's'}
                    </Text>
                    <ScrollView
                        style={styles.scrollContainer}
                    >
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
                    </ScrollView>

                    <View style={styles.centeredGroupCode}>
                        <Text style={styles.groupCode}>{groups[resolvedGroupID]?.groupCode}</Text>
                        <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardIcon}>
                            <MaterialIcons name="content-copy" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    {currentGroupUsersArray.length >= userStartRequirement && (
                        groups[resolvedGroupID]?.groupCreator === userID ? (
                            <TouchableOpacity
                                onPress={() => {setModalVisible(true);}}
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
                    {groups[resolvedGroupID]?.groupCreator === userID && (
                        <TouchableOpacity onPress={() => {setDeleteModalVisible('delete');}} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Delete Group</Text>
                        </TouchableOpacity>
                    )}
                    {groups[resolvedGroupID]?.groupCreator !== userID && (
                        <TouchableOpacity onPress={() => {setDeleteModalVisible('leave');}} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Leave Group</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {/* Settings Modal */}
                <Modal
                    transparent={true}
                    visible={isModalVisible}
                    animationType="slide"
                    onRequestClose={() => {setModalVisible(false);}}
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

                            <Text style={styles.settingText}>Amount of Cycles (Rounds):</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5"
                                value={cycles}
                                onChangeText={setCycles}
                                keyboardType="numeric"
                                placeholderTextColor="#888"
                            />

                            {/* <Text>Amount of Tokens You Get Each Day:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="100"
                                value={dailyTokens}
                                onChangeText={setDailyTokens}
                                keyboardType="numeric"
                                placeholderTextColor="#888"
                            /> */}

                            <Text style={styles.settingText}>Starting Tokens (Minimum 1000):</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1000"
                                value={startingTokens}
                                onChangeText={setStartingTokens}
                                keyboardType="numeric"
                                placeholderTextColor="#888"
                            />

                            {/* <Text>Default Bet on Yourself:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="100"
                                value={defaultBetOnSelf}
                                onChangeText={setDefaultBetOnSelf}
                                keyboardType="numeric"
                                placeholderTextColor="#888"
                            /> */}

                            <Text style={styles.settingText}>Game Type:</Text>
                            <DropDownPicker
                                open={gameTypeOpen}
                                value={gameType}
                                items={gameTypeItems}
                                setOpen={setGameTypeOpen}
                                setValue={setGameType}
                                setItems={() => {}}
                                containerStyle={[styles.dropdownContainer, {zIndex: 100}]}
                                dropDownContainerStyle={styles.dropdownStyle}
                                textStyle={styles.settingText}
                                style={{ borderColor: '#ccc', minHeight: 40, }}
                            /> 

                            <Text style={styles.settingText}>Reset Day:</Text>
                                <DropDownPicker
                                    open={resetDayOpen}
                                    value={resetDay}
                                    items={resetDayItems}
                                    setOpen={setResetDayOpen}
                                    setValue={setResetDay}
                                    setItems={() => {}}
                                    containerStyle={[styles.dropdownContainer, {zIndex: 99}]}
                                    dropDownContainerStyle={styles.dropdownStyle}
                                    textStyle={styles.settingText}
                                    style={{ borderColor: '#ccc', minHeight: 40, }}
                                /> 

                            {/* Buttons */}
                            <TouchableOpacity 
                                onPress={isFormValid ? handleStartPress : undefined} 
                                style={[styles.confirmButton, { backgroundColor: isFormValid ? '#28a745' : '#d3d3d3' }]}
                                disabled={!isFormValid}
                            >
                                <Text style={styles.confirmButtonText}>Confirm & Start</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => {setModalVisible(false);}} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
                <Modal
                    transparent={true}
                    visible={isDeleteModalVisible !== ''}
                    onRequestClose={() => {setDeleteModalVisible('');}}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={{ fontFamily: "Lexend", textAlign: 'center', marginTop: 10 }}>Are you sure you want to {isDeleteModalVisible} this group?</Text>
                            <TouchableOpacity style={styles.button}>
                                <Text style={{ fontFamily: "Lexend", textAlign: 'center', color: 'white', }} onPress={handleDeleteOrLeave}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setDeleteModalVisible('')}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    dropdownContainer: {
        marginVertical: 10,
        width: '100%',
    },
    dropdownStyle: {
        backgroundColor: '#fafafa',
        fontFamily: 'Lexend',
        borderColor: '#ccc',
    },
    contentView: {
        flex: 1,
        backgroundColor: 'white'
    },
    container: {
        // flex: 1,
        justifyContent: 'center',
        marginTop: 20,
        height: '100%',
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
    settingText: {
        fontFamily: "Lexend",
    },
    buttonText: {
        fontFamily: "Lexend",
        textAlign: 'center',
        color: 'blue',
    },
    backButton: {
        left: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    button: {
        marginTop: 10,
        padding: 10,
        borderRadius: 10,
        alignSelf: 'center',
        backgroundColor: '#f24646',
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
        // marginTop: -30,
        fontSize: 20,
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
    scrollContainer: {
        backgroundColor: "#f0f0f0",
        borderRadius: 5,
        marginHorizontal: 10,
        paddingTop: 10,
        maxHeight: '20%',
        flexGrow: 0,
    },
    groupNameStandalone: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        marginTop: -30,
    },
    text: {
        fontSize: 18,
        marginTop: 20,
        marginHorizontal: 20,
        fontFamily: "Lexend",
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
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
    centeredGroupCode: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    groupCode: {
        fontSize: 45,
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
        padding: 18,
        justifyContent: "center",
        backgroundColor: '#1976d2',
        alignSelf: "center",
        // width: 150,
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
        textAlign: 'center',
        fontFamily: 'Lexend-Bold',
        fontSize: 20,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
        fontFamily: 'Lexend',
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
