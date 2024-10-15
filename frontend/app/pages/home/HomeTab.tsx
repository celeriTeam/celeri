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
import { Pedometer } from 'expo-sensors';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { createGroup, getGroupIDFromGroupName, getGroupIsGameActive, getGroupProfilePic, getUsersInGroup } from '@backend/src/groups';
import { getUserGroups, getUserName, setSteps } from '@backend/src/users';
import { useUser } from '../../UserProvider';
import { auth } from '@/firebaseConfig';
import { checkFinishedBetting, checkFinishedRecap } from '@/backend/src/bets';
import { BlurView } from 'expo-blur';

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

    
    const { userID, username, groupNames, getGroupID, groups } = useUser();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [stepsSinceMidnight, setStepsSinceMidnight] = useState<number | null>(null);
    const [currentUserGroups, setCurrentUserGroups] = useState<GroupData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const currentUserName = username || '';
    const currentGroupNames = groupNames || [];
    
    useEffect(() => {
        const timeout = setTimeout(() => {
            const groupData = currentGroupNames.map((groupName: string) => {
                const groupID = getGroupID[groupName];
                if (!groupID) {
                    console.log("Error: groupID invalid");
                    return;
                }
                const GroupUsers = groups[groupID]?.userList;
                const numberOfUsers = GroupUsers ? Object.keys(GroupUsers).length : 0;
                const isGameActive = groups[groupID]?.isGameActive;
                const groupImageUrl = groups[groupID]?.groupImageUrl;
                return {
                    groupName,
                    numberOfUsers,
                    isGameActive,
                    groupImageUrl,
                };
            });
    
            // Filter out undefined values from groupData
            const filteredUserGroups = groupData.filter((group): group is GroupData => group !== undefined);
    
            // Set the current user groups after processing
            setCurrentUserGroups(filteredUserGroups);
            setIsLoading(false);
        }, 5000); // Delay by 5000 milliseconds (5 seconds)
    
        // Cleanup the timeout if the component unmounts before 5 seconds
        return () => clearTimeout(timeout);
    }, [currentGroupNames, getGroupID, groups]);  // Dependencies

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

    const getStepsSinceMidnight = async () => {
        const now = new Date();
        const midnight = new Date(now.setHours(0, 0, 0, 0)); // Get 12:00 AM of the current day
        try {
            const user = auth.currentUser;
            let userID = user?.uid || '';
			const result = await Pedometer.getStepCountAsync(midnight, new Date());
			setStepsSinceMidnight(result.steps);
			setSteps(userID, result.steps);
			console.log('Steps: ', result.steps);
			console.log('at time: ', now);
        } catch (error) {
			console.error("Error getting step count: ", error);
			setStepsSinceMidnight(null);
        }
	};

    useEffect(() => {
		getStepsSinceMidnight();

		const intervalId = setInterval(() => {
			getStepsSinceMidnight();
		}, 300000); // 5 minutes in milliseconds
	
		// Clean up the interval when the component unmounts
		return () => {
			clearInterval(intervalId);
		};
    }, [userID]);

    const createGroupButtonHandle = () => {
        navigation.navigate('CreateGroup');
    };

    const joinGroupButtonHandle = () => {
        navigation.navigate('JoinGroup');
    };

    const goToGroup = async (groupName: string) => {
        // get groupID and number of users in group;
        // if number of users in group < 3, then navigate to inviteGroup page
        // else navigate to BetsPage page
        const groupID: any = getGroupID[groupName];
        const GroupUsers = groups[groupID]?.userList;
        const numberOfUsers = GroupUsers ? Object.keys(GroupUsers).length : 0;
        console.log('groupusers: ', GroupUsers);
        const isGameActive = groups[groupID]?.isGameActive;
        if (GroupUsers === null || GroupUsers === undefined) {
            return;
        } else if (isGameActive) {
            const isFinishedBetting = groups[groupID]?.isFinishedBetting;
            if (!isFinishedBetting) {
                navigation.navigate('HeadToHeadPage', { groupID: groupID });
            } else {
                navigation.navigate('BetSummaryPage', { groupID: groupID });
            }
        } else {
            navigation.navigate('InviteGroup', { groupID: groupID, fromCreate: false });
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

    if (currentUserGroups === null || currentUserGroups === undefined) {
        return (
            <View style={styles.container}>
                <Text>Failed to fetch user groups</Text>
            </View>
        );
    } else if (currentUserGroups.length === 0) {
        return (
            <View style={styles.container}>
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
                {currentUserGroups.map((group) => (
                    <TouchableOpacity
                    key={group.groupName}
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
                            {group.numberOfUsers} members - {group.isGameActive ? 'Active' : 'Inactive'}
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