// HomeTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { getGroupIDFromGroupName, getGroupIsGameActive, getUsersInGroup } from '@backend/src/groups';
import { getUserGroups, getUserName, setSteps } from '@backend/src/users';
import { useUser } from '../../UserProvider';
import { auth } from '@/firebaseConfig';
import { checkFinishedBetting, checkFinishedRecap } from '@/backend/src/bets';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTab'>;

type Props = {
    navigation: HomeScreenNavigationProp;
};

const HomeTab: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = useState<string[] | undefined>(undefined);
    const [stepsSinceMidnight, setStepsSinceMidnight] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldReload, setShouldReload] = useState(false);

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            let userID = user?.uid || '';
            console.log('userid: ', userID)
            const name = await getUserName(userID);
            setCurrentUserName(name);
            const groups = await getUserGroups(userID);
            setCurrentUserGroups(groups);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
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
        fetchUserData();
		getStepsSinceMidnight();

		const intervalId = setInterval(() => {
			getStepsSinceMidnight();
		}, 300000); // 5 minutes in milliseconds
	
		// Clean up the interval when the component unmounts
		return () => {
			clearInterval(intervalId);
		};
    }, [userID]);

    useFocusEffect(
        useCallback(() => {
            fetchUserData();
            if (shouldReload) {
                fetchUserData();
                setShouldReload(false);
            }
        }, [shouldReload])
    );

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
        const groupID: any = await getGroupIDFromGroupName(groupName);
        const GroupUsers = await getUsersInGroup(groupID);
        const numberOfUsers = GroupUsers ? Object.keys(GroupUsers).length : 0;
        console.log('groupusers: ', GroupUsers);
        const isGameActive = await getGroupIsGameActive(groupID);
        if (GroupUsers === null || GroupUsers === undefined) {
            return;
        } else if (isGameActive) {
            const isFinishedBetting = await checkFinishedBetting(groupID, userID);
            const isFinishedRecap = await checkFinishedRecap(groupID, userID);
            // if (!isFinishedRecap) {
            //     navigation.navigate('BetRecapPage', { groupID: groupID });
            if (!isFinishedBetting) {
                navigation.navigate('HeadToHeadPage', { groupID: groupID, isFinishedRecap: isFinishedRecap });
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
                <Text style={styles.welcome}>
                    Welcome back, <Text style={styles.username}>{currentUserName}</Text>
                </Text>
                <Text style={styles.title}>Your Groups:</Text>
                {currentUserGroups.map((groupName: string) => (
                    <Button
                        key={groupName}
                        title={String(groupName)}
                        onPress={() => goToGroup(groupName)}
                    />
                ))}
                <View style={styles.spaceAboveButton}>
                    <TouchableOpacity style={styles.button} onPress={joinGroupButtonHandle}>
                        <Text style={styles.buttonText}>Join Another Group</Text>
                    </TouchableOpacity>
                </View>
                    <TouchableOpacity style={styles.button} onPress={createGroupButtonHandle}>
                        <Text style={styles.buttonText}>Create Group</Text>
                    </TouchableOpacity>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcome: {
        fontSize: 24,
        marginBottom: 40,
    },
    username: {
        fontWeight: 'bold',
    },
    title: {
        fontSize: 20,
    },
    button: {
        backgroundColor: '#1E90FF', // Blue background color
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25, // Oval shape
        marginVertical: 10,
    },
    buttonText: {
        color: '#FFFFFF', // White text color
        fontSize: 16,
        fontWeight: 'bold',
    },
    spaceAboveButton: {
        marginTop: 30,
    },
});

export default HomeTab;