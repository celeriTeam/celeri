import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router'
import { useUser } from '../../../../UserProvider';
import { StyleSheet } from 'react-native-size-scaling';
import { collection, getDocs, getDoc, doc, getFirestore } from 'firebase/firestore'
import { app } from "@firebaseConfig";
import { TextInput } from 'react-native-gesture-handler';
import { requestFriend } from '@/backend/src/friends';

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
};

export default function FriendsAddPage() {
    const { userID, username } = useUser();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async (uid: string) => {
            try {
                // we want to exclude IDs from already requested, incoming requests, and already friends

                // 1) Grab the current user’s doc and pull out the three arrays
                const meRef = doc(db, 'users', uid)
                const meSnap = await getDoc(meRef)
                const meData = meSnap.data() || {}

                const outgoing: string[] = meData.outgoingRequests || []
                const incoming: string[] = meData.incomingRequests || []
                const friends: string[] = meData.friendsList || []

                // 2) Fetch *all* users
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersArray: User[] = [];

                // 3) Build the list, skipping self & anyone in those arrays
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (doc.id === uid) return                                 // skip yourself
                    if (outgoing.includes(doc.id)) return                       // skip already‐sent
                    if (incoming.includes(doc.id)) return                       // skip already‐received
                    if (friends.includes(doc.id)) return                        // skip already friends
                    usersArray.push({
                        id: doc.id,
                        name: data.name || 'Unknown',
                        username: data.username || 'Unknown',
                        pfp: data.profileImageUrl || '',
                    });
                });


                // for search functionality
                setCurrentGroupUsersArray(usersArray);
                setFilteredUsers(usersArray);
            } catch (error) {
                console.error('Error fetching users in Add page:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData(userID);
    }, [userID]);

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
        router.push(`/profile/publicProfile/${user.id}`);
    };

    const handleAddFriend = async (requestedID: string) => {
        try {
            await requestFriend(userID, requestedID);
            setRequestedIds(prev => [...prev, requestedID]);
        } catch (error) {
            console.error("handleAddFriend Error: ", error);
            Alert.alert('Error', 'Unable to send friend request.');
        }
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
                            <TouchableOpacity key={user.id} style={styles.memberItem} onPress={() => handleUserPress(user)} activeOpacity={0.7}>
                                <View style={styles.memberInfo}>
                                    {/* left side: avatar + name */}
                                    <View style={styles.memberLeft}>

                                        <Image
                                            source={
                                                user.pfp ?
                                                    { uri: user?.pfp }
                                                    : require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.profilePic}
                                        />
                                        <View>
                                            <View style={[styles.row, { justifyContent: 'space-between', width: '100%' }]}>
                                                <Text style={styles.memberName}>{user?.name}</Text>
                                            </View>
                                            <Text style={styles.memberUserName}>@{user?.username}</Text>
                                        </View>
                                    </View>

                                    {/* right side: Add Friend button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.addFriendButton,
                                            requestedIds.includes(user.id) && styles.addFriendButtonDisabled
                                        ]}
                                        onPress={() => handleAddFriend(user.id)}
                                        disabled={requestedIds.includes(user.id)}
                                    >
                                        <Text style={styles.addFriendText}>
                                            {requestedIds.includes(user.id) ? 'Requested' : 'Add Friend'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noUsersText}>No users found.</Text>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
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
    addFriendButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addFriendButtonDisabled: {
        opacity: 0.5,
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
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,                        // only take needed space
    },
    scrollContainer: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
        flex: 1,
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
        alignItems: 'flex-start',
    },
    memberInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
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
    addFriendText: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#fff',
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