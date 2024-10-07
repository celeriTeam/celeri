import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Image, Button, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser } from '@backend/src/users';
import { useUser } from '../../UserProvider';

type InviteGroupNavigationProp = StackNavigationProp<RootStackParamList, 'InviteGroup'>;
type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

type Props = {
    navigation: InviteGroupNavigationProp;
};

const InvitePage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<InviteGroupRouteProp>();
    const { groupID, fromCreate } = route.params;
    const [currentGroupName, setCurrentGroupName] = useState<string | undefined>(undefined);
    const [currentGroupCode, setCurrentGroupCode] = useState<string | undefined>(undefined);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; }[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [cycles, setCycles] = useState('5');
    const [dailyTokens, setDailyTokens] = useState('100');
    const [startingTokens, setStartingTokens] = useState('1000');
    const [defaultBetOnSelf, setDefaultBetOnSelf] = useState('100');
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('');
    const [isCreator, setIsCreator] = useState(false);
    const userStartRequirement = 3;

    const fetchGroupData = async () => {
        try {
            setLoadingText('Getting group data...');
            const groupName = await getGroupName(groupID);
            setCurrentGroupName(groupName);
            const groupCode = await getGroupCode(groupID);
            setCurrentGroupCode(groupCode);
            setLoadingText('Finding group members...');
            const groupUsersIdArray = await getUsersInGroup(groupID); // array of user IDs
            let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; }[] = [];
            if (groupUsersIdArray) {
                // get user names & pfps from user IDs
                for (let i = 0; i < groupUsersIdArray.length; i++) {
                    const userID = groupUsersIdArray[i];
                    const userName = await getUserName(userID);
                    const profilePic = await getProfilePic(userID);
                    groupUsersArray.push({ id: userID, name: userName, pfp: profilePic });
                }
                setCurrentGroupUsersArray(groupUsersArray);
            }
            const groupCreator = await getGroupCreator(groupID);
            if (groupCreator === userID) {
                setIsCreator(true);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

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
        await startGame(groupID, +cycles, +dailyTokens, +startingTokens, +defaultBetOnSelf);
        // navigation.navigate('GroupDetails', { groupID: groupID });
        navigation.reset({
            index: 1,
            routes: [
                { name: 'HomeTab' }, // the first route in the stack
                { name: 'HeadToHeadPage', params: { groupID: groupID, isFinishedRecap: false } } // the top route in the stack
            ],
        });
    };

    const handleStartReminderPress = async () => {
        console.log('Remind creator to start button pressed');

        Alert.alert('Reminder sent', 'The creator has been reminded to start the game.');
    };

    const copyToClipboard = () => {
        Clipboard.setString(currentGroupCode || '');
        Alert.alert('Copied to Clipboard', 'Group code has been copied to your clipboard!');
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
                <Text>{loadingText}</Text>
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
                    <View style={styles.row}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Image
                                source={require('@components/back-icon.png')}
                                style={styles.backImage}
                            />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.groupNameStandalone}>{currentGroupName}</Text>
                        </View>
                    </View>
                )}
                {currentGroupUsersArray.length >= userStartRequirement ? (
                    <Text style={styles.text}>
                        You have enough members in your group! Click the button below to start a new game.
                    </Text>
                ) : (
                    <Text style={styles.text}>
                        You don't have enough members in your group yet. Share the group code below to invite others to join!
                    </Text>
                )}
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
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        left: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    backImage: {
        width: 24,
        height: 24,
    },
    groupNameCreated: {
        marginTop: 40,
        fontSize: 20,
        marginBottom: 40,
    },
    groupName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    groupNameStandalone: {
        marginTop: 40,
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    text: {
        fontSize: 18,
        marginBottom: 40,
    },
    username: {
        fontSize: 18,
    },
    centeredGroupCode: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupCode: {
        fontSize: 45,
        color: '#a34395',
        backgroundColor: '#cccacc',
        fontWeight: 'bold',
        padding: 15,
        borderRadius: 5,
    },
    clipboardIcon: {
        marginLeft: 10,
    },
    startButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: '#4CAF50',
        borderRadius: 5,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        borderRadius: 5,
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
