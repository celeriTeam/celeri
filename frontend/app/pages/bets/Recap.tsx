import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';

type betRecapPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type betRecapPageRouteProp = RouteProp<RootStackParamList, 'BetRecapPage'>;

type Props = {
    navigation: betRecapPageNavigationProp;
};

const BetRecapPage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups, loading } = useUser();
    const route = useRoute<betRecapPageRouteProp>();
    const { groupID } = route.params;
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

    const yesterdaysBets = groups[groupID]?.yesterdaysDuels;

    const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } }) => {
        return Object.values(duels);
    };

    const flattenedBets = yesterdaysBets ? flattenDuels(yesterdaysBets) : [];

    const currentRecapBets = flattenedBets.map((bet) => {
        const player1 = groups[groupID]?.users[bet.player1]?.username;
        const player2 = groups[groupID]?.users[bet.player2]?.username;
        let winner = 'draw';
        if (bet.winner != 'draw') {
            winner = groups[groupID]?.users[bet.winner]?.username;
        }

        // if there are no bets, return the duel with the player names
        if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
            };
        }

        else {
            // Separate bets for player1 and player2
            const player1Bets = bet.bets
                .filter((b) => b.betOnUserID === bet.player1)
                .map((b) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));
            const player2Bets = bet.bets
                .filter((b) => b.betOnUserID === bet.player2)
                .map((b) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));

            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1Bets,
                player2Bets,
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
            };
        }
    });

    if (loading) {
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

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } }) => {
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
								{/* Player1's Steps */}
								<Text><Text style={styles.stepTitle}>Steps: </Text>{item.playerOneSteps}</Text>
                                <Text style={[styles.stepTitle, styles.spacedText]}>Bets:</Text>
								{item.player1Bets.length === 0 ? (
                                    <View>
                                        <Text>(No bets placed)</Text>
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
								{/* Player2's Steps */}
								<Text><Text style={styles.stepTitle}>Steps: </Text>{item.playerTwoSteps}</Text>
                                <Text style={[styles.stepTitle, styles.spacedText]}>Bets:</Text>
								{item.player2Bets.length === 0 ? (
                                    <View>
                                        <Text>(No bets placed)</Text>
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

                        {/* No Winner Available */}
                        {item.winner === 'draw' && (
                            <View style={styles.spacedText}>
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
    stepTitle: {
        fontWeight: 'bold',
    },
	spacedText: {
		marginTop: 10,
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