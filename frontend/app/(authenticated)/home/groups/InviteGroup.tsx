import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet as RNStyleSheet, Pressable, Keyboard, Text, TouchableOpacity, Alert, Button, ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Touchable, } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup, addGroupImage, deleteGroup, leaveGroup, getGroupIsGameActive, getGroupProfilePic } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser, getAverageSteps, getBiweeklySteps, getWeeklySteps, getSteps, getName } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import { createNudge } from '@/backend/src/notifs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';

const db = getFirestore(app);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const InvitePage: React.FC = () => {
    const { userID } = useUser();
    const { leaderID, groupID, fromCreate } = useLocalSearchParams();
    const router = useRouter();

    // Convert `fromCreate` back to a boolean
    const isFromCreate = fromCreate === 'true';
    const resolvedLeaderID = Array.isArray(leaderID) ? leaderID[0] : leaderID;
    const resolvedGroupID = Array.isArray(groupID) ? groupID[0] : groupID;
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; username: string | undefined; pfp: string | undefined; name: string | undefined; }[]>([]);
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [cycles, setCycles] = useState('1');
    const [dailyTokens, setDailyTokens] = useState('100');
    const [startingTokens, setStartingTokens] = useState('2000');
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
                let groupUsersArray: { id: string; username: string | undefined; pfp: string | undefined; name: string | undefined; }[] = [];
                if (userList) {
                    await Promise.all(userList.map(async (selectedUserID) => {
                        const [profilePic, username, name, averageSteps, weeklySteps, biweeklySteps, steps] = await Promise.all([
                            getProfilePic(selectedUserID),
                            getUserName(selectedUserID),
                            getName(selectedUserID),
                            getAverageSteps(selectedUserID),
                            getWeeklySteps(resolvedGroupID, selectedUserID),
                            getBiweeklySteps(resolvedGroupID, selectedUserID),
                            getSteps(selectedUserID),
                        ]);

                        let newSteps;
                        if( gameType === "weekly") {
                            newSteps = Math.round(gameType === "weekly" ? weeklySteps : steps);
                        } else if (gameType === "biweekly") {
                            newSteps = Math.round(gameType === "biweekly" ? biweeklySteps : steps);
                        } else {
                            newSteps = steps;
                        }

                        users[selectedUserID] = {
                            profilePic,
                            username,
                            averageSteps,
                            steps: newSteps,
                        };
                        groupUsersArray.push({ id: selectedUserID, username: username, pfp: profilePic, name: name });
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
                    users,
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
            router.replace({
                pathname: '/(authenticated)/home/bets/Welcome',
                params: { groupIDTemp: resolvedGroupID },
            });
        }
    }, [groups, resolvedGroupID,]);

    const createMemberButtonHandle = (id: string) => {
        console.log('userid: ', id);
        console.log('groupid: ', resolvedGroupID);
        console.log('averagesteptemp: ', groups[resolvedGroupID]?.users[id]?.averageSteps ?? []);
        console.log('stepstemp: ', groups[resolvedGroupID]?.users[id]?.steps ?? 0);
        router.push({
            pathname: '/(authenticated)/home/bets/publicProfile',
            params: { 
                selectedUserIDTemp: id ?? '', 
                groupIDTemp: resolvedGroupID, 
                averageStepsTemp: groups[resolvedGroupID]?.users[id]?.averageSteps ?? [], 
                stepsTemp: groups[resolvedGroupID]?.users[id]?.steps ?? 0, 
            },
        });
    };

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

        router.replace({
            pathname: '/(authenticated)/home/bets/Welcome',
            params: { groupIDTemp: groupID },
        });
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
                [{ resize: { width: scale(800) } }], // Resize to 800px width
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
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity style={{ position: 'absolute', left: 0, padding: 16 }} onPress={() => router.back()}>
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
                    </View>
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

                    <Text style={[styles.text, { marginBottom: verticalScale(10) }]}>
                        Group Members ({groups[resolvedGroupID]?.userList.length}):
                    </Text>
                    <ScrollView style={styles.scrollContainer}>
                        {currentGroupUsersArray ? (
                            currentGroupUsersArray.map((user) => (
                                <TouchableOpacity key={user.id} style={styles.memberItem} onPress={() => createMemberButtonHandle(user.id)}>
                                    <View style={styles.row}>
                                        <Image
                                            source={
                                                user.pfp ? 
                                                { uri: user?.pfp }
                                                : require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.profilePic}
                                        />
                                        <Text style={styles.memberName}>{user?.name}</Text>
                                    </View>
                                    <Text style={styles.memberUserName}>@{user?.username}</Text>
                                </TouchableOpacity>
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
                                placeholder="1"
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
                                placeholder="2000"
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
                                style={{ borderColor: '#ccc', minHeight: scale(40), }}
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
                                    style={{ borderColor: '#ccc', minHeight: scale(40), }}
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
                            <Text style={{ fontFamily: "Lexend", textAlign: 'center', marginTop: verticalScale(10) }}>Are you sure you want to {isDeleteModalVisible} this group?</Text>
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
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
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
    container: {
        height: '100%',
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 5,
    },
    backImage: {
        width: 40,
        height: 40,
    },
    groupNameCreated: {
        fontSize: 20,
        fontFamily: 'Lexend',
    },
    groupName: {
        fontSize: 24,
        fontFamily: 'Lexend',
        color: '#fff',
    },
    titleContainer: {
        // flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupNameStandalone: {
        fontFamily: 'Lexend',
        fontSize: 30,
        color: '#fff',
    },
    groupImageContainer: {
        alignItems: 'center',
    },
    groupImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginVertical: 10,
        borderWidth: 2,
        borderColor: '#74FF6D'
    },
    settingText: {
        fontFamily: 'Lexend',
    },
    buttonText: {
        fontFamily: 'Lexend',
        textAlign: 'center',
        color: '#74FF6D',
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
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
    scrollContainer: {
        marginHorizontal: 10,
        maxHeight: '27%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
    },
    text: {
        fontSize: 18,
        marginTop: 20,
        marginHorizontal: 20,
        fontFamily: 'Lexend',
        color: '#fff',
    },
    bold_text: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 40,
        marginHorizontal: 20,
        fontFamily: 'Lexend-Bold',
        textAlign: 'center',
        alignSelf: 'center',
        color: '#fff',
    },
    username: {
        fontSize: 16,
        fontFamily: 'Lexend',
        color: '#fff',
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
        flexDirection: 'row',
        padding: 18,
        justifyContent: 'center',
        backgroundColor: '#1976d2',
        alignSelf: 'center',
    },
    startButtonText: {
        textAlign: 'center',
        fontSize: 15,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    // Modal styles
    dismissOverlay: {
        ...RNStyleSheet.absoluteFillObject,
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
