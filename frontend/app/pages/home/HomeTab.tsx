// HomeTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { getGroupIDFromGroupName, getUserGroups, getUserName, getUsersInGroup } from '../../../app/database';

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

    const handlePressButton1 = () => {
        navigation.navigate('CreateGroup', { userID: userID });
    };

    const handlePressButton2 = () => {
        navigation.navigate('JoinGroup');
    };

    const goToGroup = async (groupName: string) => {
        // get groupID and number of users in group;
        // if number of users in group < 3, then navigate to inviteGroup page
        // else navigate to groupDetails page
        const groupID: any = await getGroupIDFromGroupName(groupName);
        const GroupUsers = await getUsersInGroup(groupID);
        const numberOfUsers = GroupUsers ? Object.keys(GroupUsers).length : 0;
        console.log('groupusers: ', GroupUsers);
        if (GroupUsers === null || GroupUsers === undefined) {
            return;
        } else if (numberOfUsers < 3) {
            navigation.navigate('InviteGroup', { groupID: groupID, fromCreate: false });
        } else {
            navigation.navigate('GroupDetails', { GroupName: groupName });
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
                <TouchableOpacity style={styles.button} onPress={handlePressButton1}>
                    <Text style={styles.buttonText}>Create Group</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handlePressButton2}>
                    <Text style={styles.buttonText}>Join Group</Text>
                </TouchableOpacity>
            </View>
        );
    } else {
        return (
            <View style={styles.container}>
                <Text>Welcome back, {currentUserName}</Text>
                {currentUserGroups.map((groupName: string) => (
                    <Button
                        key={groupName}
                        title={String(groupName)}
                        onPress={() => goToGroup(groupName)}
                    />
                ))}
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
    title: {
        fontSize: 24,
        marginBottom: 20,
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
});

export default HomeTab;