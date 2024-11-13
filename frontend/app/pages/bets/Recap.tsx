import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import Svg, { Circle, G } from 'react-native-svg';

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
        const player1pfp = groups[groupID]?.users[bet.player1]?.profilePic;
        const player2pfp = groups[groupID]?.users[bet.player2]?.profilePic;
        let winner = 'draw';
        if (bet.winner != 'draw') {
            winner = groups[groupID]?.users[bet.winner]?.username;
        }

        let earnings = {
            hasBet: false,
            hasUserWon: false,
            earning: 0,
        }

        // if there are no bets, return the duel with the player names
        if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1pfp,
                player2pfp,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
                earnings,
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
            const hasBet = bet.bets.some(betItem =>
                betItem.userID === userID,
            );
            const hasUserWon = bet.bets.some(betItem =>
                betItem.userID === userID && betItem.betOnUserID === bet.winner,
            );
            const calculateEarnings = () => {
                const userBet = bet.bets.find(betItem => betItem.userID === userID);

                // No bet
                if (!userBet) return 0;

                // User lost bet
                if (userBet.betOnUserID !== bet.winner) {
                    return -userBet.wager;
                }

                // User won bet
                let totalWagers = 0;
                let totalWagersOnWinner = 0;
                bet.bets.forEach(betItem => {
                    totalWagers += betItem.wager;
                    if (betItem.betOnUserID === bet.winner) {
                        totalWagersOnWinner += betItem.wager;
                    }
                });
                const percentage = userBet.wager / totalWagersOnWinner;
                const amountWon = percentage * totalWagers;
            
                return Math.floor(amountWon - userBet.wager);

            }
            const earning = calculateEarnings();

            earnings = {
                hasBet,
                hasUserWon,
                earning,
            }

            console.log(bet.bets);
            console.log('player1 bets: ', player1Bets);
            console.log('player2 bets: ', player2Bets);

            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1pfp,
                player2pfp,
                player1Bets,
                player2Bets,
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
                earnings,
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

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1pfp: string, player2pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, earnings: { hasBet: boolean, hasUserWon: boolean, earning: number } } }) => {
        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded
    
        return (
            <View style={styles.flatList}>
                {/* Players */}
                <TouchableOpacity onPress={() => (item.player2Bets.length > 1 || item.player1Bets.length > 1) ? toggleItemExpansion(item.duelID) : null}
                    activeOpacity={(item.player2Bets.length > 1 || item.player1Bets.length > 1) ? 0.2 : 1}><View style={styles.row}>
                    <View style={styles.spacer} />
                        <View style={[
                            styles.statusBar,
                            (!item.earnings.hasBet || item.winner === 'draw') ? styles.drawStatus :
                            (item.earnings.hasUserWon) ? styles.winStatus : styles.loseStatus,
                        ]}>
                            <Text style={styles.statusText}>
                                {!item.earnings.hasBet ? 'No bet' :
                                item.winner === 'draw' ? 'Draw' :
                                item.earnings.hasUserWon ? 'Win' : 'Lose'}
                            </Text>
                        </View>
                        {/* Carrot Icon */}
                        <View style={styles.spacer}>
                            {(item.player2Bets.length > 1 || item.player1Bets.length > 1) && (
                                <MaterialIcons
                                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                    size={24}
                                    style={styles.carrotIcon}
                                />
                            )}
                        </View>
                    </View>
                    {/* player 1 */}
                    <View style={styles.playerContainer}>
                        <View style={[styles.row, { marginTop: 10 }]}>
                            <Image
                                source={{ uri: item.player1pfp }}
                                style={styles.profileImage}
                            />
                            <Text style={[
                                styles.player,
                                item.winner === item.player2 && styles.loserText,
                            ]}>{item.player1}</Text>
                            {item.winner === item.player1 && <Text style={styles.triangleText}>▶</Text>}
                            <Text style={styles.steps}>{item.playerOneSteps}</Text>
                        </View>
                        {isExpanded && (
                            <View>
                                {item.player1Bets.map((bet, index) => (
                                    (bet.user !== item.player1) && (
                                        <Text key={index} style={{fontFamily: "Lexend"}}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                    </View>
                    {/* player 2 */}
                    <View style={styles.playerContainer}>
                        <View style={[styles.row, { marginTop: 10 }]}>
                            <Image
                                source={{ uri: item.player2pfp }}
                                style={[
                                    styles.profileImage,
                                    item.winner === item.player1 && styles.loserImage,
                                ]}
                            />
                            <Text style={[
                                styles.player,
                                item.winner === item.player1 && styles.loserText,
                            ]}>{item.player2}</Text>
                            {item.winner === item.player2 && (
                                <Text style={styles.triangleText}>▶</Text>
                            )}
                            <Text style={[
                                styles.steps,
                                item.winner === item.player1 && styles.loserText,
                            ]}>{item.playerTwoSteps}</Text>
                        </View>
                        {isExpanded && (
                            <View>
                                {item.player2Bets.map((bet, index) => (
                                    (bet.user !== item.player2) && (
                                        <Text key={index} style={{fontFamily: "Lexend"}}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                    </View>
                    {/* earnings */}
                    {item.earnings.hasBet && item.winner !== 'draw' && (
                        <>
                            <View style={styles.horizontalLine}></View>
                            <View style={styles.centeredColumn}>
                                <Text style={[
                                    item.earnings.earning > 0 ? styles.wonEarningsText : styles.lostEarningsText,
                                ]}>{item.earnings.earning > 0 && <Text>+</Text>}{item.earnings.earning}</Text>
                            </View>
                        </>
                    )}
                </TouchableOpacity>
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
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    statusBar: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    statusText: {
        fontFamily: "Lexend",
        color: 'white',
        fontWeight: '500',
        fontSize: 14,
    },
    winStatus: {
        backgroundColor: '#4CAF50', // Green color
    },
    loseStatus: {
        backgroundColor: '#f44336', // Red color
    },
    drawStatus: {
        backgroundColor: '#9e9e9e', // Gray color
    },
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
    },
    header: {
        fontFamily: "Lexend",
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    flatList: {
        borderWidth: 1.5,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
    },
    wonEarningsText: {
        fontFamily: "Lexend",
		marginTop: 10,
        color: 'green',
        fontSize: 30,
    },
    lostEarningsText: {
        fontFamily: "Lexend",
		marginTop: 10,
        color: 'red',
        fontSize: 30,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    carrotIcon: {
        textAlign: 'right',
        color: '#888',
    },
    triangleText: {
        marginHorizontal: 8,
        fontSize: 14,
        opacity: 0.8,
    },
    horizontalLine: {
        borderBottomColor: '#ccc',
        borderBottomWidth: 1.5,
        marginVertical: 10,
        width: '90%',
        alignSelf: 'center',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    playerContainer: {
        paddingLeft: 25,
        paddingRight: 25,
    },
    player: {
        fontFamily: "Lexend-Bold",
        fontSize: 18,
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        fontFamily: "Lexend",
        marginRight: 30,
        textAlign: 'right',
        fontSize: 28,
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    centeredColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
});

export default BetRecapPage;