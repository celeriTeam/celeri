import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, SafeAreaView, Pressable, Keyboard, Text, TouchableOpacity, Alert, Image, Button, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { getGroupCode, getGroupName, getGroupMembers, getUsersInGroup, getUserName, getProfilePic, setGroupIsGameActive } from '../../database';

type InviteGroupNavigationProp = StackNavigationProp<RootStackParamList, 'InviteGroup'>;
type InviteGroupRouteProp = RouteProp<RootStackParamList, 'InviteGroup'>;

type Props = {
    navigation: InviteGroupNavigationProp;
};

const InvitePage: React.FC<Props> = ({ navigation }) => {
    const route = useRoute<InviteGroupRouteProp>();
    const { groupID, fromCreate } = route.params;
    const [currentGroupName, setCurrentGroupName] = useState<string | undefined>(undefined);
    const [currentGroupCode, setCurrentGroupCode] = useState<string | undefined>(undefined);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userStartRequirement = 2;

    const fetchGroupData = async () => {
        try {
            const groupName = await getGroupName(groupID);
            setCurrentGroupName(groupName);
            const groupCode = await getGroupCode(groupID);
            setCurrentGroupCode(groupCode);
            const groupUsersIdArray = await getUsersInGroup(groupID); // array of user IDs
            let groupUsersArray = [];
            if (groupUsersIdArray) {
                // get user names & pfps from user IDs
                for (let i = 0; i < Object.keys(groupUsersIdArray).length; i++) {
                    const userID = Object.keys(groupUsersIdArray)[i];
                    const userName = await getUserName(userID);
                    const profilePic = await getProfilePic(userID);
                    groupUsersArray.push({ id: userID, name: userName, pfp: profilePic });
                }
                setCurrentGroupUsersArray(groupUsersArray);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

    const handleStartPress = async () => {
        console.log('Start game button pressed');
        await setGroupIsGameActive(groupID, true);
        navigation.navigate('GroupDetails', { groupID: groupID });
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
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Image
                                source={require('../../../components/back-icon.png')}
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
                    <TouchableOpacity
                        onPress={handleStartPress}
                        style={styles.startButton}
                    >
                        <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                )}
            </View>
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
        width: 40, // adjust width as needed
        height: 40, // adjust height as needed
        borderRadius: 20, // make it circular if it's a square
        marginRight: 10, // space between image and text
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
});

export default InvitePage;
