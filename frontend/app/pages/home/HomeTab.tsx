// HomeTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { getGroupIDFromGroupName, getGroupIsGameActive, getUserGroups, getUserName, getUsersInGroup } from '../../../app/database';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTab'>;

type Props = {
    navigation: HomeScreenNavigationProp;
};

const HomeTab: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();
    const { userID } = route.params as { userID: string };
    const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
    const [currentUserGroups, setCurrentUserGroups] = useState<string[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [shouldReload, setShouldReload] = useState(false);

    const fetchUserData = async () => {
        try {
            // const user = auth.currentUser;
            // let userID = user?.uid || '';
            console.log('userid: ', userID)
            const name = await getUserName(userID);
            setCurrentUserName(name);
            const groups = await getUserGroups(userID);
            setCurrentUserGroups(groups);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [userID]);

    useFocusEffect(
        useCallback(() => {
            fetchUserData();
            // Check if the user came from the edit page
            if (shouldReload) {
                fetchUserData();
                setShouldReload(false);
            }
        }, [shouldReload])
    );

    const createGroupButtonHandle = () => {
        navigation.navigate('CreateGroup', { userID: userID });
    };

    const joinGroupButtonHandle = () => {
        navigation.navigate('JoinGroup', { userID: userID });
    };

    const goToGroup = async (groupName: string) => {
        // get groupID and number of users in group;
        // if number of users in group < 3, then navigate to inviteGroup page
        // else navigate to groupDetails page
        const groupID: any = await getGroupIDFromGroupName(groupName);
        const GroupUsers = await getUsersInGroup(groupID);
        const numberOfUsers = GroupUsers ? Object.keys(GroupUsers).length : 0;
        console.log('groupusers: ', GroupUsers);
        const isGameActive = await getGroupIsGameActive(groupID);
        if (GroupUsers === null || GroupUsers === undefined) {
            return;
        } else if (isGameActive) {
            navigation.navigate('GroupDetails', { groupID: groupID });
        } else {
            navigation.navigate('InviteGroup', { groupID: groupID, fromCreate: false });
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
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