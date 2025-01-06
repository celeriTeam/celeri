import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Button, ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup, addGroupImage, deleteGroup, leaveGroup } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser } from '@backend/src/users';
import { useUser } from '../../UserProvider';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import { createNudge } from '@/backend/src/notifs';

type InviteGroupNavigationProp = StackNavigationProp<RootStackParamList, 'InviteGroup'>;
type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

type Props = {
    navigation: InviteGroupNavigationProp;
};

const InvitePage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups, loading } = useUser();
    const route = useRoute<InviteGroupRouteProp>();
    const { leaderID, groupID, fromCreate } = route.params;
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [cycles, setCycles] = useState('5');
    const [dailyTokens, setDailyTokens] = useState('100');
    const [startingTokens, setStartingTokens] = useState('1000');
    const [gameType, setGameType] = useState("weekly");
    const [resetDay, setResetDay] = useState(0);
    const [defaultBetOnSelf, setDefaultBetOnSelf] = useState('100');
    const userStartRequirement = 3;

    // if groups[groupID]?.isGameActive is true, then nav to headtohead page
    useEffect(() => {
        if (groups && groupID && groups[groupID]?.isGameActive) {
            navigation.navigate('HeadToHeadPage', { groupID });
        }
    }, [groups, groupID, navigation]);


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
        await startGame(groupID, +cycles, +dailyTokens, +startingTokens, +defaultBetOnSelf, gameType, resetDay);
        // navigation.navigate('GroupDetails', { groupID: groupID });
        navigation.reset({
            index: 1,
            routes: [
                { name: 'HomeTab' }, // the first route in the stack
                { name: 'HeadToHeadTutorialPage', params: { groupID: groupID } } // the top route in the stack
            ],
        });
    };

    const handleStartReminderPress = async () => {
        console.log('Remind creator to start button pressed');

        try {
            const nudgeMessage = "They're waiting for you to start the game!"
            const userRef = firestore().collection('users').doc(leaderID);
            const userDoc = await userRef.get();
            const tokens = userDoc.data()?.tokens || [];

            createNudge(userID, groupID, nudgeMessage, tokens);
            Alert.alert('Reminder sent', 'The creator has been reminded to start the game.');
        } catch (error) {
            console.error("Error sending nudge notification:", error);
            Alert.alert("Error", "Failed to send reminder.");
        }
    };

    const handleDeleteOrLeave = async () => {
        if (isDeleteModalVisible === 'delete') {
            deleteGroup(groupID);
        } else if (isDeleteModalVisible === 'leave') {
            leaveGroup(groupID, userID);
        }
        navigation.reset({
            index: 0,
            routes: [{ name: 'HomeTab' }],
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

            addGroupImage(groupID, manipulatedImage.uri);
            }
        }
    };

    const copyToClipboard = () => {
        Clipboard.setString(groups[groupID]?.groupCode || '');
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
                        <Text style={styles.groupName}>{groups[groupID]?.groupName}</Text> has been successfully created!
                    </Text>
                ) : (
                    <View>
                        <View style={styles.titleContainer}>
                            <Text style={styles.groupNameStandalone}>{groups[groupID]?.groupName}</Text>
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
                    <Text style={[styles.text, { textAlign: 'center' }]}>
                        If your group is ready, click the button below to start a new game.
                    </Text>
                ) : (
                    <Text style={[styles.text, { textAlign: 'center' }]}>
                        You need three members to start a game. Share the group code below to invite others to join!
                    </Text>
                )}

                <Text style={[styles.text, { fontWeight: "bold", marginBottom: 10 }]}>
                    Group Members ({groups[groupID]?.userList.length}):
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
                    <Text style={styles.groupCode}>{groups[groupID]?.groupCode}</Text>
                    <TouchableOpacity onPress={copyToClipboard} style={styles.clipboardIcon}>
                        <MaterialIcons name="content-copy" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                {currentGroupUsersArray.length >= userStartRequirement && (
                    groups[groupID]?.groupCreator === userID ? (
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
                {groups[groupID]?.groupCreator === userID && (
                    <TouchableOpacity onPress={() => {setDeleteModalVisible('delete');}} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Delete Group</Text>
                    </TouchableOpacity>
                )}
                {groups[groupID]?.groupCreator !== userID && (
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
    );
};

const styles = StyleSheet.create({
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
    settingText: {
        fontFamily: "Lexend",
    },
    buttonText: {
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
    scrollContainer: {
        backgroundColor: "#f0f0f0",
        borderRadius: 5,
        marginHorizontal: 10,
        paddingTop: 10,
        maxHeight: '30%',
        flexGrow: 0,
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
