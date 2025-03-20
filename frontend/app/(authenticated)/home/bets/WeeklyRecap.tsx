import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import Svg, { Circle, G } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';

const WeeklyBetRecapPage: React.FC = () => {
    console.log("in weeklyBetRecapPage");
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

    const lastWeekBets = groups[groupID]?.lastWeekDuels;

    const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } }) => {
        return Object.values(duels);
    };

    const flattenedBets = lastWeekBets ? flattenDuels(lastWeekBets) : [];

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
        if (bet.bets[0]?.wager == null || (bet.bets.length === 0)) {
            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1pfp,
                player2pfp,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
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
                let percentage = 0.0;
                let amountWon = 0.0;
                // if they are the winner and there were no bets on them, they get 100%
                if(userID == bet.winner && totalWagersOnWinner == 0){
                    percentage = 1.0;
                    amountWon = totalWagers;
                    return Math.floor(amountWon);
                } else if (userID == bet.winner){
                    percentage = 0.5;
                    amountWon = percentage * (totalWagers - totalWagersOnWinner)
                    return Math.floor(amountWon - userBet.wager);
                } else {

                //changed because now winner gets 50% by default
                    percentage = (userBet.wager / totalWagersOnWinner) / 2;
                    console.log("percentage", percentage);
                    amountWon = percentage * (totalWagers - totalWagersOnWinner);
                    console.log("amountWon", amountWon);
                    //console.log("minus wager: ", Math.floor(amountWon - userBet.wager));
                    return Math.floor(amountWon);
                    //return Math.floor(amountWon - userBet.wager);
                }

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
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
                earnings,
            };
        }
    });

    if (loading) {
        return (
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ color: '#fff' }}>Loading...</Text>
                </View>
            </LinearGradient>
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
                {/* <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 8, paddingVertical: 5 }}>
                    <Text style={styles.createdAtText}>{item.timePast}</Text>
                </View> */}
                <View style={styles.betsContainer}>
                    {/* Players */}
                    <TouchableOpacity onPress={() => (item.player2Bets.length > 1 || item.player1Bets.length > 1) ? toggleItemExpansion(item.duelID) : null}
                        activeOpacity={(item.player2Bets.length > 1 || item.player1Bets.length > 1) ? 0.2 : 1}
                    >
                        <View style={styles.row}>
                        
                            <View style={[
                                styles.statusBar,
                                (!item.earnings.hasBet || item.winner === 'draw' || item.earnings.earning === 0) ? styles.drawStatus :
                                (item.earnings.hasUserWon) ? styles.winStatus : styles.loseStatus,
                            ]}>
                                <Text style={styles.statusText}>
                                    {!item.earnings.hasBet ? 'No bet' :
                                    item.winner === 'draw' ? 'Draw' :
                                    item.earnings.earning === 0 ? 'No winnings' :
                                    item.earnings.hasUserWon ? 'Win' : 'Loss'}
                                </Text>
                            </View>
                            
                            {/* earnings */}
                            {item.earnings.hasBet && item.winner !== 'draw' && (
                                <View style={styles.earningsContainer}>
                                    <Text style={[
                                        item.earnings.earning > 0 ? styles.wonEarningsText : 
                                        item.earnings.earning === 0 ? styles.drawEarningsText : 
                                        styles.lostEarningsText,
                                    ]}>
                                        {item.earnings.earning > 0 && <Text>+ </Text>}
                                        {item.earnings.earning < 0 && <Text>- </Text>}
                                        {Math.abs(item.earnings.earning)}
                                    </Text>
                                    <Image
                                        source={require('@assets/icons/tokens.png')}
                                        style={{ width: 18, height: 18, tintColor: item.earnings.earning > 0 ? '#74FF6D' : item.earnings.earning === 0 ? '#fff' : '#FF6060' }}
                                    />
                                </View>
                            )}
                        </View>
                        <View style={styles.horizontalLine}></View>
                        {/* player 1 */}
                        <View style={styles.playerContainer}>
                            <View style={styles.row}>
                                {item.playerOneSteps > item.playerTwoSteps && (
                                    <Image
                                        source={require('@assets/icons/winnerHistory.png')}
                                        style={styles.winnerIcon}
                                    />
                                )}
                                <Image
                                    source={{ uri: item.player1pfp }}
                                    style={[
                                        styles.profileImage,
                                        item.playerOneSteps < item.playerTwoSteps && styles.loserImage,
                                    ]}
                                />
                                <Text style={[
                                    styles.player,
                                    item.playerOneSteps < item.playerTwoSteps && styles.loserText,
                                ]}>{item.player1}</Text>
                                <Text style={[
                                    styles.steps,
                                    item.playerOneSteps < item.playerTwoSteps && styles.loserText,
                                ]}>{item.playerOneSteps} steps</Text>
                            </View>
                        </View>
                        {isExpanded && (
                            <View style={{ paddingBottom: 5, }}>
                                {item.player1Bets.map((bet: { user: string, wager: number }, index: number) => (
                                    (bet.user !== item.player1) && (
                                        <Text key={index} style={{fontFamily: "Lexend", color: '#fff', fontSize: 11, }}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                        {/* player 2 */}
                        <View style={styles.playerContainer}>
                            <View style={styles.row}>
                                {item.playerOneSteps < item.playerTwoSteps && (
                                    <Image
                                        source={require('@assets/icons/winnerHistory.png')}
                                        style={styles.winnerIcon}
                                    />
                                )}
                                <Image
                                    source={{ uri: item.player2pfp }}
                                    style={[
                                        styles.profileImage,
                                        item.playerOneSteps > item.playerTwoSteps && styles.loserImage,
                                    ]}
                                />
                                <Text style={[
                                    styles.player,
                                    item.playerOneSteps > item.playerTwoSteps && styles.loserText,
                                ]}>{item.player2}</Text>
                                <Text style={[
                                    styles.steps,
                                    item.playerOneSteps > item.playerTwoSteps && styles.loserText,
                                ]}>{item.playerTwoSteps} steps</Text>
                            </View>
                        </View>
                        {isExpanded && (
                            <View style={{ paddingBottom: 5, }}>
                                {item.player2Bets.map((bet: { user: string, wager: number }, index: number) => (
                                    (bet.user !== item.player2) && (
                                        <Text key={index} style={{ fontFamily: "Lexend", color: '#fff', fontSize: 11, }}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recap</Text>
            <Text style={styles.header}>Here are the results of last week's bets:</Text>
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
        fontFamily: 'Lexend',
        textAlign: "center",
        color: '#fff',
        fontSize: 30,
        paddingBottom: 20,
    },
    header: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 15,
        marginBottom: 10,
        textAlign: 'center',
    },
    flatList: {
        marginTop: 10,
        width: '100%',
    },
    betsContainer: {
        backgroundColor: '#5BE35C32',
        borderRadius: 15,
        padding: 10,
    },
    wonEarningsText: {
        fontFamily: "Lexend",
        color: '#74FF6D',
        fontSize: 15,
        marginRight: 5,
    },
    lostEarningsText: {
        fontFamily: "Lexend",
        color: '#FF6060',
        fontSize: 15,
        marginRight: 5,
    },
    drawEarningsText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 15,
        marginRight: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        borderBottomColor: '#ffffff80',
        borderBottomWidth: 1,
        marginVertical: 10,
        width: '100%',
        alignSelf: 'center',
    },
    winnerIcon: {
        width: 7, 
        height: 33,
        position: 'absolute',
        left: -20,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
        paddingHorizontal: 20,
    },
    player: {
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
        textAlign: 'right',
    },
    createdAtText: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#fff',
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    earningsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default WeeklyBetRecapPage;