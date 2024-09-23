import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { addToFinishedRecap, getYesterdaysDuelsSummary } from '@/backend/src/bets';
import { getUserName } from '@/backend/src/users';

type betRecapPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type betRecapPageRouteProp = RouteProp<RootStackParamList, 'BetRecapPage'>;

type Props = {
    navigation: betRecapPageNavigationProp;
};

const BetRecapPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<betRecapPageRouteProp>();
    const { groupID } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [currentRecapBets, setCurrentRecapBets] = useState<{ duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string }[]>([]);
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});


    const fetchGroupData = async () => {
        try {
            const yesterdaysBets = await getYesterdaysDuelsSummary(groupID);

            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string } }) => {
                return Object.values(duels);
            };

            const flattenedBets = yesterdaysBets ? flattenDuels(yesterdaysBets) : [];

            const betsWithUsernames = await Promise.all(
                flattenedBets.map(async (bet) => {
                    const player1 = await getUserName(bet.player1);
                    const player2 = await getUserName(bet.player2);
                    let winner = 'empty';
                    if (bet.winner != 'empty') {
                        winner = await getUserName(bet.winner);
                    }

                    // if there are no bets, return the duel with the player names
                    console.log('...', bet.bets[0]?.wager);
                    if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
                        return {
                            duelID: bet.duelID,
                            player1,
                            player2,
                            player1Bets: [],
                            player2Bets: [],
                            winner,
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
                            winner,
                        };
                    }
                })
            );
            setCurrentRecapBets(betsWithUsernames);
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

    const toggleItemExpansion = (duelID: string) => {
        setExpandedItems((prevExpandedItems) => ({
            ...prevExpandedItems,
            [duelID]: !prevExpandedItems[duelID], // toggle the current duelID
        }));
    };

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string } }) => {
        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded
        return (
            <View style={styles.flatList}>
                {/* Players */}
                <TouchableOpacity onPress={() => toggleItemExpansion(item.duelID)}>
                    <View style={styles.row}>
                        <Text style={[
                            styles.player,
                            item.winner === item.player1 && styles.winner,
                            styles.playerLeft  // Additional style for player1
                        ]}>{item.player1}{item.winner === item.player1 && ' (winner)'}</Text>

                        <View style={styles.playerRightContainer}>
                            <Text style={[
                                styles.player,
                                item.winner === item.player2 && styles.winner,
                                styles.playerRight  // Additional style for player2
                            ]}>{item.player2}{item.winner === item.player2 && ' (winner)'}</Text>

                            {/* Carrot Icon */}
                            <MaterialIcons
                                name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                size={24}
                                style={styles.carrotIcon}
                            />
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <>
                        <View style={styles.row}>
                            {/* Player1's Bets */}
                            <View style={styles.betsListLeft}>
                                {item.player1Bets.map((bet, index) => (
                                    <Text key={index} style={{ textAlign: 'left' }}> {bet.user}: {bet.wager}</Text>
                                ))}
                            </View>

                            {/* Player2's Bets */}
                            <View style={styles.betsListRight}>
                                {item.player2Bets.map((bet, index) => (
                                    <Text key={index} style={{ textAlign: 'right' }}> {bet.user}: {bet.wager}</Text>
                                ))}
                            </View>
                        </View>

                        {/* No Winner Available */}
                        {item.winner === 'empty' && (
                            <View>
                                <Text style={styles.noWinner}>(No winner available)</Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recap</Text>
            <Text style={styles.header}>Here are the results of yesterday's bets:</Text>
            <FlatList
                data={currentRecapBets}
                keyExtractor={(item) => item.duelID}
                renderItem={renderBetItem}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    header: {
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    flatList: {
        padding: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    carrotIcon: {
        marginLeft: 10,
        color: '#888',  // Customize the color of the carrot
    },
    player: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    playerLeft: {
        flex: 1,   // This makes player1 take up the left space
        textAlign: 'left',
    },
    playerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end', // Ensures player2 and carrot are on the right
    },
    playerRight: {
        marginRight: 8, // Add some margin between player2 and the carrot icon
        textAlign: 'right',
    },
    winner: {
        fontWeight: 'bold',
        fontSize: 20,
        color: 'green',
    },
    noWinner: {
        textAlign: 'center',
        marginTop: 10,
    },
    betsListLeft: {
        marginTop: 10,
        paddingRight: 20,
    },
    betsListRight: {
        marginTop: 10,
        paddingLeft: 20,
    },
});

export default BetRecapPage;