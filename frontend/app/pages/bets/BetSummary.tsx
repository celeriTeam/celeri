import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, ActivityIndicator, FlatList, Modal, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { getTodaysDuelsSummary } from '@/backend/src/bets';
import { getProfilePic, getSteps, getUserName } from '@/backend/src/users';
import BetRecapPage from './Recap';
import { text } from 'body-parser';
import { getGroupIsFirstDay, getUsersInGroup, getUserTokens } from '@/backend/src/groups';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[], player1Steps: number, player2Steps: number }[]>([]);
    const [currentUserTokens, setCurrentUserTokens] = useState<number | undefined>(undefined);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; }[]>([]);
    const [isFirstDay, setIsFirstDay] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
  
    const closeModal = async () => {
      setModalVisible(false);
    };
  
    const openModal = async () => {
      setModalVisible(true);
    };

    const createMemberButtonHandle = (id: string) => {
        navigation.navigate('ProfilePage', { selectedUserID: id ?? '', groupID: groupID });
    };

    const fetchGroupData = async () => {
        try {
            const todaysBets = await getTodaysDuelsSummary(groupID);

            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } }) => {
                return Object.values(duels);
            };
        
            const flattenedBets = todaysBets ? flattenDuels(todaysBets) : [];

            const betsWithUsernames = await Promise.all(
                flattenedBets.map(async (bet) => {
                    const player1 = await getUserName(bet.player1);
                    const player2 = await getUserName(bet.player2);
                    const player1Steps = await getSteps(bet.player1);
                    const player2Steps = await getSteps(bet.player2);

                    // if there are no bets, return the duel with the player names
                    console.log('...', bet.bets[0]?.wager);
                    if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
                        return {
                            duelID: bet.duelID,
                            player1,
                            player2,
                            player1Bets: [],
                            player2Bets: [],
                            player1Steps,
                            player2Steps,
                        };
                    }

                    else {
                        // Separate bets for player1 and player2
                        const player1Bets = await Promise.all(
                            bet.bets
                                .filter((b) => b.betOnUserID === bet.player1)
                                .map(async (b) => ({
                                    user: await getUserName(b.userID),
                                    wager: b.wager,
                                }))
                        );

                        const player2Bets = await Promise.all(
                            bet.bets
                                .filter((b) => b.betOnUserID === bet.player2)
                                .map(async (b) => ({
                                    user: await getUserName(b.userID),
                                    wager: b.wager,
                                }))
                        );
                        return {
                            duelID: bet.duelID,
                            player1,
                            player2,
                            player1Bets,
                            player2Bets,
                            player1Steps,
                            player2Steps,
                        };
                    }
                })
            );
            
            setCurrentBets(betsWithUsernames);

            // Check if it's the first day
            const firstDay = await getGroupIsFirstDay(groupID);
            setIsFirstDay(firstDay || true);

            // Get group users
            const groupUsersIdArray = await getUsersInGroup(groupID); // array of user IDs
            let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; }[] = [];
            if (groupUsersIdArray) {
                // get user names & pfps from user IDs
                for (let i = 0; i < groupUsersIdArray.length; i++) {
                    const userID = groupUsersIdArray[i];
                    const userName = await getUserName(userID);
                    const profilePic = await getProfilePic(userID);
                    groupUsersArray.push({ id: userID, name: userName, pfp: profilePic });
                }
                setCurrentGroupUsersArray(groupUsersArray);
            }

            // Get user's tokens
            const userTokens = await getUserTokens(userID, groupID);
            setCurrentUserTokens(userTokens);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[], player1Steps: number, player2Steps: number } }) => (
        <View style={styles.flatList}>
            {/* Players */}
            <View style={styles.row}>
                <Text style={styles.player}>{item.player1}</Text>
                <Text style={styles.player}>{item.player2}</Text>
            </View>

            {/* Steps */}
            <View style={styles.row}>
                <Text><Text style={styles.stepTitle}>Steps: </Text>{item.player1Steps}</Text>
                <Text><Text style={styles.stepTitle}>Steps: </Text>{item.player2Steps}</Text>
            </View>

            
            <View style={styles.row}>
                {/* Player1's Bets */}
                <View style={styles.betsListLeft}>
                    <Text style={styles.stepTitle}>Bets:</Text>
                    {item.player1Bets.length === 0 ? (
                        <View>
                            <Text>(No bets placed yet)</Text>
                        </View>
                    ) : (
                        <View>
                            {item.player1Bets.map((bet, index) => (
                                <Text key={index} style={{ textAlign: 'left' }}> {bet.user}: {bet.wager}</Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Player2's Bets */}
                <View style={styles.betsListRight}>
                    <Text style={styles.stepTitle}>Bets:</Text>
                    {item.player2Bets.length === 0 ? (
                        <View>
                            <Text>(No bets placed yet)</Text>
                        </View>
                    ) : (
                        <View>
                            {item.player2Bets.map((bet, index) => (
                                <Text key={index} style={{ textAlign: 'right' }}> {bet.user}: {bet.wager}</Text>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.tokens}>
                <Text>Your Tokens: {currentUserTokens}</Text>
            </View>
            {currentGroupUsersArray ? (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userRow}>
                    {currentGroupUsersArray.map((user) => (
                    <TouchableOpacity
                        key={user.id}
                        style={styles.userContainer}
                        onPress={() => createMemberButtonHandle(user.id)}
                    >
                        <Image source={{ uri: user.pfp }} style={styles.profileImage} />
                        <Text style={styles.username}>{user.name}</Text>
                    </TouchableOpacity>
                    ))}
                </ScrollView>
                ) : (
                <Text>No users found.</Text>
                )}
            <FlatList
                data={currentBets}
                keyExtractor={(item) => item.duelID}
                renderItem={renderBetItem}
            />

            {/* Modal */}
            {!isFirstDay && (
                <View style={styles.button}>
                    <Button title="See yesterday's bets" onPress={openModal} />
                </View>
            )}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Close button */}
                    <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                        <Text style={styles.closeButtonText}>X</Text>
                    </TouchableOpacity>

                    {/* BetRecapPage as the modal content */}
                    <BetRecapPage navigation={navigation} />
                </View>
                </View>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20,
    },
    tokens: {
        position: 'absolute',
        right: 20,
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderColor: '#FF8C00',
        borderWidth: 2,
    },
    userRow: {
      flexDirection: 'row', 
      alignItems: 'center',
      padding: 10,
    },
    userContainer: {
      marginRight: 15,
      marginTop: 15,
      alignItems: 'center',
    },
    profileImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    username: {
      marginTop: 5,
      fontSize: 18,
      textAlign: 'center',
    },
    flatList: {
        padding: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginTop: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    player: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    stepTitle: {
        fontWeight: 'bold',
    },
    betsListLeft: {
        marginTop: 10,
        paddingRight: 20,
    },
    betsListRight: {
        marginTop: 10,
        paddingLeft: 20,
    },
    // MODAL
    button: {
        marginTop: 20,
        marginBottom: 20,
        width: '50%',
        alignSelf: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
      },
      modalContainer: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        position: 'relative',
      },
      closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
      },
      closeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
      },
});

export default BetSummaryPage;