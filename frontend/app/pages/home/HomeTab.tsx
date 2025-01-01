// HomeTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Button,
    Modal} from 'react-native';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { Pedometer } from 'expo-sensors';
import useHealthData from '../../../backend/src/hooks/useHealthData';
import fetchHealthData from '../../../backend/src/hooks/useHealthData';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { createGroup, getGroupCreator, getGroupIDFromGroupName, getGroupIsGameActive, getGroupName, getGroupProfilePic, getUsersInGroup } from '@backend/src/groups';
import { getUserGroups, getUserName, setSteps } from '@backend/src/users';
import { useUser } from '../../UserProvider';
import { checkFinishedBetting, checkFinishedRecap, checkFinishedTutorial } from '@/backend/src/bets';
import { BlurView } from 'expo-blur';
import { NativeEventEmitter, NativeModules } from 'react-native';

const auth = getAuth(app);
const db = getFirestore(app);

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTab'>;

type Props = {
    navigation: HomeScreenNavigationProp;
};

type GroupData = {
    groupName: string;
    numberOfUsers: number;
    isGameActive: boolean | undefined;
    groupImageUrl: string | undefined;
};

const HomeTab: React.FC<Props> = ({ navigation }) => {
    const { steps, averageSteps, weeklySteps, distance, flights } = useHealthData();
    const [stepsSinceMidnight, setStepsSinceMidnight] = useState<number | null>(null); // important for reupdating ui based on steps
    console.log("printing steps!!!");
    console.log(steps);
    console.log("printing average steps!!!");
    console.log(averageSteps);
    const [userID, setUserID] = useState<string>('');
    const [getGroupID, setGetGroupID] = useState<{ [groupName: string]: any }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [groupsState, setGroupsState] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Getting data because its the first page
    useEffect(() => {
        setIsLoading(true);
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
        setIsLoading(false);

        return () => {
            unsubscribe(); // Cleanup the auth state listener
            // Cleanup the user document snapshot listener
            if (typeof unsubscribeUser === 'function') {
                unsubscribeUser();
            }
        };
    }, []);

    const enableBackgroundDelivery = async (): Promise<void> => {
        try {
            await NativeModules.AppleHealthKit.enableBackgroundDeliveryForType(
                'StepCount',
                1, // Frequency in hours
                (error: string | null) => {
                    if (error) {
                        console.error('Error enabling background delivery:', error);
                    } else {
                        console.log('Background delivery enabled for StepCount');
                    }
                }
            );
        } catch (error) {
            console.error('Unexpected error while enabling background delivery:', error);
        }
    };
    
    useEffect(() => {
        enableBackgroundDelivery();
    }, []);
    

    useEffect(() => {
        console.log("HomeTab -- inside NativeEventEmitter useEffect")
        new NativeEventEmitter(NativeModules.AppleHealthKit).addListener(
          'healthKit:StepCount:setup:success',
          async () => {
            console.log('HomeTab -- Async StepCount Observer Setup Success');
          },
        );
        // new NativeEventEmitter(NativeModules.AppleHealthKit).addListener(
        //     'healthKit:StepCount:setup:failure',
        //     async () => {
        //       console.log('HomeTab -- Async StepCount Observer Setup Failure');
        //     },
        // );
        // new NativeEventEmitter(NativeModules.AppleHealthKit).addListener(
        //     'healthKit:StepCount:new',
        //     async () => {
        //       console.log('HomeTab -- StepCount Observer Triggered');
              
        //     },
        //   );
      });

    //HEALTHKIT
    const getStepsSinceMidnight = async() => {
        try {
            console.log("getStepsSinceMidnight - printing steps", steps);
            console.log("getStepsSinceMidnight - printing averageSteps", averageSteps);
            const result = steps;
            setStepsSinceMidnight(result);
			setSteps(userID, result, averageSteps);
        } catch (error) {
            console.error("Error getting step count: ", error);
            setStepsSinceMidnight(null);
        }
    }

    useEffect(() => {
        if (!hasInitialized && steps > 0 && averageSteps > 0) {
            // Update backend the first time valid steps are retrieved
            console.log("First-time backend update with steps:", steps);
            setStepsSinceMidnight(steps);
            setSteps(userID, steps, averageSteps); // Call your backend update here
            setHasInitialized(true); // Mark initialization as complete
        }
    }, [steps, hasInitialized, userID]);

    useEffect(() => {
        if(hasInitialized){
            getStepsSinceMidnight();
            const intervalId = setInterval(() => {
                console.log("Regular backend update with steps:", steps);
                getStepsSinceMidnight();
            }, 300000); // 5 minutes in milliseconds
        
            // Clean up the interval when the component unmounts
            return () => {
                clearInterval(intervalId);
            };
        } else {
            console.log("has not been initialized");
        }
    }, [userID]);

    const fetchGroupData = async (userGroups: string[], uid: string) => {
        const groups: { [groupID: string]: any } = {};
        const getGroupID: { [groupName: string]: any } = {};
        const loadingGroups = new Set(userGroups);
        if (userGroups) {
            setIsLoading(true);
            await Promise.all(userGroups.map(async (groupName) => {
                const groupID = await getGroupIDFromGroupName(groupName);
                const groupsRef = collection(db, "groups");
                const groupDocRef = doc(groupsRef, groupID);

                const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                    setIsLoading(true);
                    if (docSnapshot.exists() && groupID) {
                        const [groupImageUrl, groupName, isGameActive,  isFinishedBetting, isFinishedTutorial, groupCreator] = await Promise.all([
                            getGroupProfilePic(groupID),
                            getGroupName(groupID),
                            getGroupIsGameActive(groupID),
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
                            isFinishedBetting,
                            isFinishedTutorial,
                            userList,
                            groupCreator
                        };
                    }
                    // Ensures all groups show at first load
                    loadingGroups.delete(groupName);
                    setGetGroupID({...getGroupID});
                    setGroups({...groups});
                    
                    if (loadingGroups.size === 0) {
                        setIsLoading(false);
                    }
                });
                return unsubscribeGroup;
            }));
        }
        setGetGroupID(getGroupID);
        setGroups(groups);
    };

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

    const createGroupButtonHandle = () => {
        navigation.navigate('CreateGroup');
    };

    const joinGroupButtonHandle = () => {
        navigation.navigate('JoinGroup');
    };

    const goToGroup = async (groupName: string) => {
        // get groupID and number of users in group;
        const groupID: any = getGroupID[groupName];
        const GroupUsers = groups[groupID]?.userList;
        console.log('groupusers: ', GroupUsers);
        const isGameActive = groups[groupID]?.isGameActive;
        console.log(isGameActive);
        if (GroupUsers === null || GroupUsers === undefined) {
            console.log('Failed to fetch group data');
            return;
        } else if (isGameActive) {
            const isFinishedBetting = groups[groupID]?.isFinishedBetting;
            const isFirstDay = groups[groupID]?.isFirstDay;
            const isFinishedTutorial = groups[groupID]?.isFinishedTutorial;
            if (!isFinishedTutorial) {
                navigation.navigate('HeadToHeadTutorialPage', { groupID: groupID });
            }
            else if (!isFinishedBetting) {
                navigation.navigate('HeadToHeadPage', { groupID: groupID });
            } else {
                navigation.navigate('BetSummaryPage', { groupID: groupID });
            }
        } else {
            console.log('navigating to invite group page');
            navigation.navigate('InviteGroup', { leaderID: groups[groupID]?.groupLeader, groupID: groupID, fromCreate: false });
        }
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    if (groups === null || groups === undefined) {
        return (
            <View style={styles.container}>
                <Text>Failed to fetch user groups</Text>
            </View>
        );
    } else if (Object.keys(groups).length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <TouchableOpacity style={styles.button} onPress={createGroupButtonHandle}>
                    <Text style={styles.buttonText}>Create Group</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={joinGroupButtonHandle}>
                    <Text style={styles.buttonText}>Join Existing Group</Text>
                </TouchableOpacity>
            </View>
        );
    } else {
        return (
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Groups</Text>
                    </View>
                <Text style={styles.subTitle}>Your Groups:</Text>
                {Object.entries(groups).map(([groupID, group]) => (
                    <TouchableOpacity
                        key={groupID}
                        style={styles.groupButton}
                        onPress={() => goToGroup(group.groupName)}
                    >
                        {group.groupImageUrl ? (
                            <Image
                                source={{ uri: group.groupImageUrl }}
                                style={styles.groupImage}
                            />
                        ) : (
                            <Image 
                                source={require('@components/blank-profile-picture.png')}
                                style={styles.groupImage}
                            />
                        )}
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{group.groupName}</Text>
                            <Text style={styles.groupDetails}>
                                {group.userList ? Object.keys(group.userList).length : 0} members - {group.isGameActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={toggleModal}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

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
                            onPress={() => {}} // Prevent closing when clicking inside the modal content
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
            
            {/* testing headtohead tutorial */}
            {/* <TouchableOpacity onPress={() => { navigation.navigate('HeadToHeadTutorialPage', { groupID: 'ounAwWnZv7rFMOAWVSCy' }) }}>
                <Text style={[styles.buttonText, {color: 'blue'}]}>Tutorial</Text>
            </TouchableOpacity> */}
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#fff', 
    },
    username: {
        fontWeight: 'bold',
    },
    subTitle: {
        paddingTop: 20,
        paddingLeft: 20,
        textAlign: "left",
        fontSize: 20,
        fontFamily: 'Lexend',
        alignSelf: 'flex-start',
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
        color: 'white',
        fontFamily: 'Lexend',
    },
    spaceAboveButton: {
        marginTop: 30,
    },
    titleContainer: {
        justifyContent: "center",
    },
    titleText: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
    },
    groupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 15,
        borderRadius: 10,
        marginVertical: 10,
        width: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
    },
    groupImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Lexend',
    },
    groupDetails: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Lexend',
    },
    fab: {
        position: 'absolute',
        top: 75,
        right: 20,
        backgroundColor: '#1E90FF',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 5,
    },
    fabText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContentWrapper: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default HomeTab;