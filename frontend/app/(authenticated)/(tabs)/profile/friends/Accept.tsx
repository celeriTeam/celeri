import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router'
import { useUser } from '../../../../UserProvider';
import { StyleSheet } from 'react-native-size-scaling';
import { getDoc, doc, getFirestore } from 'firebase/firestore'
import { app } from "@firebaseConfig";
import { acceptRequest, cancelRequest } from '@/backend/src/friends';

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

export default function FriendsAcceptPage() {
    const { userID, username } = useUser();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [acceptedIDs, setAcceptedIDs] = useState<string[]>([]);
    const [cancelledIDs, setCancelledIDs] = useState<string[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<User[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<User[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async (uid: string) => {
            if (!uid || typeof uid !== 'string' || uid.trim() === '') {
                setIsLoading(false);
                return;
            }
            try {
                const meRef = doc(db, 'users', uid);
                const meSnap = await getDoc(meRef);
                const meData = meSnap.data() || {};

                // 1) grab the ID arrays
                const outgoingIDs = meData.outgoingRequests || [];
                const incomingIDs = meData.incomingRequests || [];

                // 2) helper to turn an ID into a User object
                const fetchUserByID = async (id: string): Promise<User> => {
                    const snap = await getDoc(doc(db, 'users', id));
                    const data = snap.exists() ? snap.data() : {};
                    return {
                        id,
                        name: data.name || 'Unknown',
                        username: data.username || 'Unknown',
                        pfp: data.profileImageUrl || '',
                    };
                };

                // 3) fetch all outgoing / incoming users in parallel
                const outgoingUsers = await Promise.all(outgoingIDs.map(fetchUserByID));
                const incomingUsers = await Promise.all(incomingIDs.map(fetchUserByID));


                // 4) update your state
                setOutgoingRequests(outgoingUsers);
                setIncomingRequests(incomingUsers);

            } catch (error) {
                console.error('Error fetching users in Accept page:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData(userID);
    }, [userID]);

    const handleUserPress = (user: User) => {
        router.push(`/profile/publicProfile/${user.id}`);
    };

    const handleAcceptRequest = async (acceptedID: string) => {
        try {
            await acceptRequest(userID, acceptedID); // bit confusing, but you are the one who accepted. acceptedID is the one who sent the request
            setAcceptedIDs(prev => [...prev, acceptedID]);
        } catch (error) {
            console.error("handleAddFriend Error: ", error);
            Alert.alert('Error', 'Unable to send friend request.');
        }
    };

    const handleCancelRequest = async (cancelledID: string) => {
        try {
            await cancelRequest(userID, cancelledID);
            setCancelledIDs(prev => [...prev, cancelledID]);
        } catch (error) {
            console.error("handleAddFriend Error: ", error);
            Alert.alert('Error', 'Unable to send friend request.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.subtitleText}> {`Incoming Requests (${incomingRequests.length})`}</Text>
            <View style={styles.scrollContainer}>
                <ScrollView>
                    {incomingRequests.length > 0 ? (
                        incomingRequests.map((user) => (
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

                                    {/* right side: Accept Friend button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.addFriendButton,
                                            acceptedIDs.includes(user.id) && styles.addFriendButtonDisabled
                                        ]}
                                        onPress={() => handleAcceptRequest(user.id)}
                                        disabled={acceptedIDs.includes(user.id)}
                                    >
                                        <Text style={styles.addFriendText}>
                                            {acceptedIDs.includes(user.id) ? 'Accepted' : 'Accept'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noUsersText}>Nobody wants to be friends with you.</Text>
                    )}
                </ScrollView>
            </View>

            {/* ─── spacer between Incoming & Outgoing ─── */}
            <View style={{ height: 20 }} />

            <Text style={styles.subtitleText}> {`Outgoing Requests (${outgoingRequests.length})`}</Text>
            <View style={styles.scrollContainer}>
                <ScrollView>
                    {outgoingRequests.length > 0 ? (
                        outgoingRequests.map((user) => (
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


                                    {/* right side: Cancel Requeest button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.addFriendButton,
                                            cancelledIDs.includes(user.id) && styles.addFriendButtonDisabled
                                        ]}
                                        onPress={() => handleCancelRequest(user.id)}
                                        disabled={cancelledIDs.includes(user.id)}
                                    >
                                        <Text style={styles.addFriendText}>
                                            {cancelledIDs.includes(user.id) ? 'Cancelled' : 'Cancel'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noUsersText}>Seems like you don't want friends. Add them.</Text>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // height: '45%',
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
    subtitleText: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 15,
        paddingBottom: 10,
        paddingLeft: 5,
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
        // height: '40%',
        flex: 1,
        // height: '95%',
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