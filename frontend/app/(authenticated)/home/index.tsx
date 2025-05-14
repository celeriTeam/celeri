// HomeTab.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Button,
    Modal,
    ScrollView,
    Dimensions,
    Touchable,
    Platform,
    Linking
} from 'react-native';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, collection, query, where, onSnapshot } from "firebase/firestore";
import useHealthData from '../../../backend/src/hooks/useHealthData';
import { createGroup, getGroupCreator, getGroupIDFromGroupName, getGroupIsGameActive, getGroupIsResultAvailable, getGroupName, getGroupProfilePic, getUsersInGroup } from '@backend/src/groups';
import { getUserGroups, getUserName, setStepsFirebase } from '@backend/src/users';
import { checkFinishedBetting, checkFinishedRecap, checkFinishedTutorial } from '@/backend/src/bets';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';
import Store1v1Page from './1v1/Store';

const auth = getAuth(app);
const db = getFirestore(app);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const HomeTab: React.FC = () => {
    const { steps, averageSteps, stepsFromWeekBefore, distance, flights, fetchHealthData, isLoading, hasPermissions } = useHealthData();
    const [stepsSinceMidnight, setStepsSinceMidnight] = useState<number | null>(null); // important for reupdating ui based on steps
    const [needsUpdate, setNeedsUpdate] = useState<Boolean>(true);
    const sum = averageSteps.reduce((a: number, b: number) => a + b, 0);
    const averageStepsCount = sum / averageSteps.length;
    const [userID, setUserID] = useState<string>('');
    const [getGroupID, setGetGroupID] = useState<{ [groupName: string]: any }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoadingHome, setIsLoadingHome] = useState(true);
    const [selectedTab, setSelectedTab] = useState('Group');
    const [comingSoonModal, setComingSoonModal] = useState(false);
    const [storeModal, setStoreModal] = useState(false);
    const [showExtendedMessage, setShowExtendedMessage] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    
    const router = useRouter();

    const updateInProgress = useRef(false);
    const lastUpdateTime = useRef(0);
    const UPDATE_INTERVAL = 300000; // 5 minutes

    const strictUpdate = async () => {
        const now = Date.now();

        // Atomic check-and-lock
        if (updateInProgress.current || now - lastUpdateTime.current < UPDATE_INTERVAL) {
            return;
        }

        updateInProgress.current = true;
        try {
            await fetchHealthData();
            lastUpdateTime.current = Date.now();
        } catch (error) {
            console.error("Update failed:", error);
        } finally {
            updateInProgress.current = false;
        }
    };

    useEffect(() => {
        strictUpdate();
        const intervalId = setInterval(strictUpdate, 15000); // Check every 15s
        return () => clearInterval(intervalId);
    }, []);

    // Getting data because its the first page
    useEffect(() => {
        setIsLoadingHome(true);
        let unsubscribeUser: any;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserID(user.uid);
                const userGroups = await getUserGroups(user.uid);
                unsubscribeUser = fetchGroupData(userGroups || [], user.uid);
            } else {
                console.log('No user signed in');
            }
        });
        setIsLoadingHome(false);

        return () => {
            unsubscribe(); // Cleanup the auth state listener
            // Cleanup the user document snapshot listener
            if (typeof unsubscribeUser === 'function') {
                unsubscribeUser();
            }
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowExtendedMessage(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const fetchGroupData = async (userGroups: string[], uid: string) => {
        const groups: { [groupID: string]: any } = {};
        const getGroupID: { [groupName: string]: any } = {};
        const loadingGroups = new Set(userGroups);
        if (userGroups) {
            setIsLoadingHome(true);
            await Promise.all(userGroups.map(async (groupName) => {
                const groupID = await getGroupIDFromGroupName(groupName);
                const groupsRef = collection(db, "groups");
                const groupDocRef = doc(groupsRef, groupID);

                const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                    setIsLoadingHome(true);
                    if (docSnapshot.exists() && groupID) {
                        const [groupImageUrl, groupName, isGameActive, isResultAvailable, isFinishedBetting, isFinishedTutorial, groupCreator] = await Promise.all([
                            getGroupProfilePic(groupID),
                            getGroupName(groupID),
                            getGroupIsGameActive(groupID),
                            getGroupIsResultAvailable(groupID, uid),
                            checkFinishedBetting(groupID, uid),
                            checkFinishedTutorial(groupID, uid),
                            getGroupCreator(groupID),
                        ]);

                        const userList = await getUsersInGroup(groupID); // userIDs
                        if (groupName) {
                            getGroupID[groupName] = groupID;
                        }
                        groups[groupID] = {
                            groupImageUrl,
                            groupName,
                            isGameActive,
                            isResultAvailable,
                            isFinishedBetting,
                            isFinishedTutorial,
                            userList,
                            groupCreator
                        };
                    }
                    // Ensures all groups show at first load
                    loadingGroups.delete(groupName);
                    setGetGroupID({ ...getGroupID });
                    setGroups({ ...groups });

                    setIsLoadingHome(false);
                });
                return unsubscribeGroup;
            }));
            setIsLoadingHome(false);
        }
        setGetGroupID(getGroupID);
        setGroups(groups);
    };

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

    const createGroupButtonHandle = () => {
        router.push('/(authenticated)/home/groups/CreateGroup')
    };

    const joinGroupButtonHandle = () => {
        router.push('/(authenticated)/home/groups/JoinGroup')
    };

    const goToGroup = async (groupName: string) => {
        if (isPressed) return; // Prevent multiple presses
        setIsPressed(true);
        // get groupID and number of users in group;
        const groupID: any = getGroupID[groupName];
        const GroupUsers = groups[groupID]?.userList;
        // console.log('groupusers: ', GroupUsers);
        const isGameActive = groups[groupID]?.isGameActive;
        // console.log(isGameActive);
        if (GroupUsers === null || GroupUsers === undefined) {
            console.log('HOMETAB - Failed to fetch group data');
            return;
        } else if (isGameActive) {
            const isFinishedBetting = groups[groupID]?.isFinishedBetting;
            const isFirstDay = groups[groupID]?.isFirstDay;
            const isFinishedTutorial = groups[groupID]?.isFinishedTutorial;
            const groupIDTemp = groupID;
            if (!isFinishedTutorial) {
                router.push({
                    pathname: '/(authenticated)/home/bets/Welcome',
                    params: { groupIDTemp },
                });
            } else if (!isFinishedBetting) {
                router.push({
                    pathname: '/(authenticated)/home/bets/NewHeadToHead',
                    params: { groupIDTemp, showTutorialTemp: 'false' },
                });
            } else {
                router.push({
                    pathname: '/(authenticated)/home/bets/BetSummary',
                    params: { groupIDTemp, showTutorialTemp: 'false' },
                });
            }
        } else {
            // console.log('navigating to invite group page');
            router.push({
                pathname: '/(authenticated)/home/groups/InviteGroup',
                params: { leaderID: groups[groupID]?.groupLeader, groupID: groupID, fromCreate: 'false', isResultAvailable: groups[groupID].isResultAvailable },
            });
            //navigation.navigate('InviteGroup', { leaderID: groups[groupID]?.groupLeader, groupID: groupID, fromCreate: false });
        }
        setIsPressed(false); // Set the button as pressed
    }

    if (!hasPermissions) {
        if (Platform.OS === 'android' && Platform.Version < 34) {
            Linking.openURL('market://details?id=com.google.android.apps.healthdata');
        }
        return (
            <SafeAreaView style={styles.safeView} edges={['top']}>
                <View style={styles.container}>
                    <Text>Health data permissions are required to use this app.</Text>
                    <Text>Go to Settings to enable this.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isLoading || isLoadingHome) {
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
                    <Text style={{ color: '#fff' }}>Loading...</Text>
                    {isLoading && <Text style={{ color: '#fff' }}>Grabbing health data...</Text>}
                    {showExtendedMessage && (
                    <Text style={{ color: '#fff' }}>You've walked a lot.. telling all your friends right now</Text>
                    )}
                </View>
            </LinearGradient>
        );
    }

    if (groups === null || groups === undefined) {
        return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <SafeAreaView style={styles.safeView} edges={['top']}>
                    <View style={styles.container}>
                        <Text>Failed to fetch user groups</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    } else if (Object.keys(groups).length === 0) {
        return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <SafeAreaView style={styles.safeView} edges={['top']}>
                    <View style={[styles.container, { justifyContent: 'center' }]}>
                        <TouchableOpacity style={styles.button} onPress={createGroupButtonHandle}>
                            <Text style={styles.buttonText}>Create Group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={joinGroupButtonHandle}>
                            <Text style={styles.buttonText}>Join Existing Group</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    } else {
        return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <SafeAreaView style={styles.safeView} edges={['top']}>
                    <View style={styles.container}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>Home</Text>
                        </View>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Group' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => setSelectedTab('Group')}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Group' ? '#74FF6D' : '#fff', }]}>Group Mode</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, { borderBottomColor: selectedTab === 'Solo' ? '#74FF6D' : 'transparent', }]}
                                onPress={() => setSelectedTab('Solo')}
                                activeOpacity={1}
                            >
                                <Text style={[styles.tabText, { color: selectedTab === 'Solo' ? '#74FF6D' : '#fff', }]}>Solo Mode</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Line for showing selected tab */}
                        <View style={[{ borderBottomWidth: 1, borderBottomColor: '#74FF6D', width: '47%', top: -1, },
                        selectedTab === 'Solo' ?
                            { alignSelf: 'flex-end', right: scale(10) } :
                            { alignSelf: 'flex-start', left: scale(10), }]}
                        />
                        {selectedTab === 'Group' ? (
                            <>
                                <Text style={styles.subTitle}>Your Groups:</Text>
                                <ScrollView style={styles.scrollContainer}>

                                    {Object.entries(groups).map(([groupID, group]) => {
                                        const memberCount = group.userList ? Object.keys(group.userList).length : 0;
    
                                        let statusText = group.isGameActive ? 'Active' : 'Inactive';
                                        let statusColor = group.isGameActive ? '#74FF6D' : '#a7a7a7';
    
                                        console.log("tea2", groupID, group.isResultAvailable);
    
                                        if (!group.isGameActive && group.isResultAvailable) {
                                            statusText = 'Game Ended - See Results';
                                            statusColor = 'orange';
                                        }
    
                                        return (
                                        <TouchableOpacity
                                            key={groupID}
                                            style={styles.groupButton}
                                            onPress={() => goToGroup(group.groupName)}
                                        >
                                            <Image
                                            source={
                                                group.groupImageUrl
                                                ? { uri: group.groupImageUrl }
                                                : require('@components/blank-profile-picture.png')
                                            }
                                            style={[styles.groupImage, { borderColor: statusColor }]}
                                            />
                                            <View style={styles.groupInfo}>
                                            <Text style={styles.groupName}>{group.groupName}</Text>
                                            <Text style={[styles.groupDetails, { color: statusColor }]}>
                                                {!group.isGameActive && group.isResultAvailable
                                                ? statusText
                                                : `${memberCount} members - ${statusText}`}
                                            </Text>
                                            </View>
                                        </TouchableOpacity>
                                        );
                                    })}
                                    <View style={{ marginTop: 10, }} />
                                </ScrollView>

                                {/* Floating Action Button */}
                                <TouchableOpacity style={styles.fab} onPress={toggleModal} activeOpacity={1}>
                                    <Text style={styles.fabText}>+</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.row}>
                                    <TouchableOpacity onPress={() => setStoreModal(true)}>
                                        <Image
                                            source={require('@assets/icons/store.png')}
                                            style={styles.storeIcon}
                                        />
                                    </TouchableOpacity>
                                    <Image
                                        source={require('@assets/icons/history.png')}
                                        style={styles.historyIcon}
                                    />
                                    <Image
                                        source={require('@assets/icons/trophy.png')}
                                        style={styles.trophyIcon}
                                    />
                                </View>
                                <Image
                                    source={require('@assets/icons/magnify.png')}
                                    style={styles.magifyIcon}
                                />
                                <Text style={styles.noMatchText}>No match in progress.</Text>
                                <TouchableOpacity style={styles.challengeButton} onPress={() => setComingSoonModal(true)}>
                                    <Text style={styles.challengeText}>Challenge a friend</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.randomButton} onPress={() => setComingSoonModal(true)}>
                                    <Text style={styles.randomText}>Find Random Match</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Modal */}
                        <Modal
                            animationType="fade"
                            transparent={true}
                            visible={isModalVisible}
                            onRequestClose={toggleModal}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={toggleModal} // Closes the modal when clicked outside the content
                            >
                                <BlurView intensity={50} style={styles.blurView}>
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        style={styles.modalContentWrapper}
                                        onPress={() => { }} // Prevent closing when clicking inside the modal content
                                    >
                                        <View style={styles.modalContent}>
                                            <Text style={styles.modalTitle}>Group Options</Text>
                                            <TouchableOpacity style={styles.button} onPress={() => {
                                                toggleModal();
                                                joinGroupButtonHandle();
                                            }}
                                            >
                                                <Text style={styles.buttonText}>Join Group</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.button} onPress={() => {
                                                toggleModal();
                                                createGroupButtonHandle();
                                            }}
                                            >
                                                <Text style={styles.buttonText}>Create Group</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                </BlurView>
                            </TouchableOpacity>
                        </Modal>

                        {/* Coming Soon Modal */}
                        <Modal
                            animationType="fade"
                            transparent={true}
                            visible={comingSoonModal}
                            onRequestClose={() => setComingSoonModal(false)}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setComingSoonModal(false)} // Close dropdown when overlay is pressed
                            >
                                <View style={[styles.modalContainer, { height: '41%', }]}>
                                    {/* Close button */}
                                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setComingSoonModal(false)}>
                                        <Image
                                            source={require('@assets/icons/x.png')}
                                            style={styles.closeButtonIcon}
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.modalText}>Coming soon</Text>
                                </View>
                            </TouchableOpacity>
                        </Modal>

                        {/* Store modal */}
                        <Modal
                            animationType="fade"
                            transparent={true}
                            visible={storeModal}
                            onRequestClose={() => setStoreModal(false)}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setStoreModal(false)} // Close dropdown when overlay is pressed
                            >
                                <View style={[styles.modalContainer, { height: '80%', }]}>
                                    {/* Close button */}
                                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setStoreModal(false)}>
                                        <Image
                                            source={require('@assets/icons/x.png')}
                                            style={styles.closeButtonIcon}
                                        />
                                    </TouchableOpacity>
                                    <Store1v1Page
                                        userDiamonds={3}
                                        setStoreModalVisible={setStoreModal}
                                    />
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }
};

const styles = StyleSheet.create({
    safeView: {
        flex: 1,
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 10,
        height: '100%',
        width: '90%',
        alignSelf: 'center',
    },
    username: {
        fontFamily: 'Lexend',
        color: '#fff',
    },
    subTitle: {
        fontFamily: 'Lexend',
        color: '#fff',
        paddingLeft: 10,
        paddingTop: 20,
        textAlign: "left",
        fontSize: 16,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#1976d2', // Blue background color
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30, // Oval shape
        marginVertical: 10,
        width: 175,
    },
    buttonText: {
        textAlign: "center",
        fontSize: 15,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    spaceAboveButton: {
        marginTop: 30,
    },
    titleContainer: {
        justifyContent: "center",
    },
    titleText: {
        fontFamily: 'Lexend',
        textAlign: "center",
        fontSize: 20,
        color: '#fff',
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: 10,
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
    },
    tabText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    scrollContainer: {
        flex: 1,
        width: '100%',
    },
    groupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5BE35C32',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        width: '100%',
        // shadowColor: '#000',
        // shadowOpacity: 0.1,
        // shadowOffset: { width: 0, height: 2 },
        // shadowRadius: 5,
        // elevation: 6,
        alignSelf: 'center',
    },
    groupImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 1.5,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 15,
        fontFamily: 'Lexend',
        color: '#fff',
    },
    groupDetails: {
        fontSize: 11,
        fontFamily: 'Lexend',
    },
    fab: {
        position: 'absolute',
        top: 110,
        right: 10,
        backgroundColor: '#74FF6D',
        width: 35,
        height: 35,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    fabText: {
        fontFamily: 'Lexend',
        color: '#000',
        fontSize: 24,
        top: Platform.OS === 'ios' ? 0 : -2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '98%',
        gap: 5,
        margin: 20,
    },
    storeIcon: {
        width: 21,
        height: 21,
    },
    historyIcon: {
        width: 27,
        height: 27,
    },
    trophyIcon: {
        width: 21,
        height: 21,
    },
    magifyIcon: {
        width: 86,
        height: 86,
        alignSelf: 'center',
        marginVertical: 40,
    },
    noMatchText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
    },
    challengeButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#74FF6D',
        borderRadius: 20,
        marginVertical: 20,
    },
    challengeText: {
        fontFamily: 'Lexend',
        color: '#74FF6D',
        fontSize: 13,
        padding: 10,
    },
    randomButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 30,
    },
    randomText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
        padding: 10,
    },
    blurView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 30,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        fontFamily: "Lexend"
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#1E90FF',
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'black',
        position: 'relative',
        borderWidth: moderateScale(1),
        borderColor: '#4A4A4A',
        borderRadius: moderateScale(15),
    },
    modalCloseButton: {
        position: 'absolute',
        top: verticalScale(10),
        right: scale(10),
        zIndex: 1,
    },
    closeButtonIcon: {
        width: scale(20),
        height: scale(20),
    },
    modalText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 20,
    },
    modalContentWrapper: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default HomeTab;