import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import { StyleSheet } from 'react-native-size-scaling';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { app } from "@firebaseConfig";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TextInput } from 'react-native-gesture-handler';
import { create1v1Request } from '@/backend/src/1v1Requests';
import { getFunctions, httpsCallable } from 'firebase/functions';

dayjs.extend(relativeTime);

const db = getFirestore(app);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type User = {
    id: string;
    name: string;
    username: string;
    pfp: string;
    lastLogin: string;
    isIn1v1: boolean;
};

type Props = {
    setUserSearchModalVisible: (visible: boolean) => void;
};

const UserSearchPage: React.FC<Props> = ({ setUserSearchModalVisible }) => {
    const { userID, username } = useUser();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userExpanded, setUserExpanded] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async (uid: string) => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersArray: User[] = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const createdAt = data.lastLogin?.toDate() || new Date();
                    if (userID === doc.id) return; // Skip the current user
                    usersArray.push({
                        id: doc.id,
                        name: data.name || 'Unknown',
                        username: data.username || 'Unknown',
                        pfp: data.profileImageUrl || '',
                        lastLogin: data.lastLogin ? formatRelativeTime(createdAt) : 'over 1 month ago',
                        isIn1v1: data.isIn1v1 || false,
                    });
                });


                // for search functionality
                setCurrentGroupUsersArray(usersArray);
                setFilteredUsers(usersArray);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData(userID);
    }, [userID]);
    

    const handleChallenge = async (id: string) => {
        console.log('Pressed user:', id);
        await create1v1Request(userID, id)
            .then(async (requestId) => {
                console.log('1v1 request created with ID:', requestId);
                const functions = getFunctions();
                const sendNotification = httpsCallable(functions, 'send1v1RequestNotification');
                await sendNotification({ receiverID: id, senderName: username });
                Alert.alert('Challenge Sent', 'Your challenge has been sent successfully!');
                setUserSearchModalVisible(false); // Close the modal after sending the challenge
            })
            .catch((error) => {
                console.error('Error creating 1v1 request:', error);
                Alert.alert('Error', error.message || 'Failed to send challenge. Please try again later.');
            })
    };

    const formatRelativeTime = (timestamp: Date): string => {
        const now = dayjs();
        const then = dayjs(timestamp);

        const diffMinutes = now.diff(then, 'minute');
        const diffHours = now.diff(then, 'hour');
        const diffDays = now.diff(then, 'day');
        const diffMonths = now.diff(then, 'month');

        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return `over ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    };

    const handleSearch = (text: string) => {
        const query = text.toLowerCase();

        const filtered = currentGroupUsersArray.filter(user => {
            const nameMatch = user.name?.toLowerCase().includes(query);
            const usernameMatch = user.username?.toLowerCase().includes(query);
            return nameMatch || usernameMatch;
        });

        setFilteredUsers(filtered);
    };

    const handleUserPress = (user: User) => {
        if (user.isIn1v1) {
            Alert.alert('User is currently in a 1v1 duel', 'You cannot challenge a user who is already in a duel.');
            return;
        }
        setUserExpanded(userExpanded === user.id ? null : user.id);
    };

    return (
        <View style={styles.container}>
            <View style={styles.scrollContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search users..."
                    placeholderTextColor="#ffffffaa"
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <ScrollView>
                    {filteredUsers.length > 0 || currentGroupUsersArray.length === 0 ? (
                        filteredUsers.map((user) => (
                            <TouchableOpacity key={user.id} style={[styles.memberItem, { backgroundColor: user.isIn1v1 ? '#00000050' : '#00000080' }]} onPress={() => handleUserPress(user)} activeOpacity={0.7}>
                                <View style={styles.memberInfo}>
                                    <Image
                                        source={
                                            user.pfp ?
                                                { uri: user?.pfp }
                                                : require('@components/blank-profile-picture.png')
                                        }
                                        style={styles.profilePic}
                                    />
                                    <View>
                                        <View style={[styles.row, { justifyContent: 'space-between', width: '92%' }]}>
                                            <Text style={styles.memberName}>{user?.name}</Text>
                                            <Text style={styles.memberLastLogin}>{user?.lastLogin}</Text>
                                        </View>
                                        <Text style={styles.memberUserName}>@{user?.username}</Text>
                                    </View>
                                </View>
                                {userExpanded === user.id && (
                                    <TouchableOpacity style={styles.challengeButton} onPress={() => handleChallenge(user.id)}>
                                        <Text style={styles.text}>Send challenge</Text>
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noUsersText}>No users found.</Text>
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 30,
    },
    title: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 20,
        textAlign: 'center',
    },
    text: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
    },
    diamonds: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: 10,
        gap: 5,
    },
    diamondIcon: {
        width: 14,
        height: 12,
    },
    itemContainer: {
        backgroundColor: '#5BE35C33',
        justifyContent: 'center',
        marginVertical: 10,
        borderRadius: 15,
        paddingVertical: 10,
        paddingLeft: 20,
        paddingTop: 30,
    },
    buyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    buyButton: {
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 7,
        width: '50%',
        alignItems: 'center',
    },
    buyButtonText: {
        fontFamily: 'Lexend',
        color: '#000',
        fontSize: 13,
    },
    scrollContainer: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
        height: '102%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBar: {
        paddingHorizontal: 5,
        paddingBottom: 5,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    memberItem: {
        padding: 10,
        paddingLeft: 20,
        paddingRight: 5,
        backgroundColor: '#00000080',
        marginVertical: 3,
        borderRadius: 10,
        alignItems: 'center',
    },
    memberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        fontSize: 8,
        color: '#74FF6D',
        marginLeft: 10,
    },
    memberLastLogin: {
        fontFamily: "Lexend",
        fontSize: 8,
        color: '#ffffffaa',
    },
    noUsersText: {
        fontFamily: 'Lexend',
        color: '#ffffffaa',
        fontSize: 13,
        paddingLeft: 5,
    },
    challengeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5BE35C80',
        padding: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginTop: 5,
    },
});

export default UserSearchPage;