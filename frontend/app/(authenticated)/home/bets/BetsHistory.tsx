import React, { useEffect, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { getMoreWeeklyDuelsSummary, getWeeklyGainsSummary, getRacesSummary } from '@/backend/src/bets';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { useUser } from '../../../UserProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';


const BetsHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [betHistory, setBetHistory] = useState<any[]>([]); // Holds all fetched duels
    const [weeksAgo, setWeeksAgo] = useState(2); // Initial daysAgo for yesterday's duels
    
    const router = useRouter();
    const screenWidth = Dimensions.get('window').width;

    interface BetItem {
        userID: string;
        wager: number;
        betOnUserID: string;
    }
    
    // Initial load for yesterday's duels
    useEffect(() => {
        const fetchInitialDuels = async () => {
            const lastWeekBets = groups[groupID]?.lastWeekDuels;
            console.log("lastWeekBets: ", lastWeekBets)
            if (lastWeekBets) {
                const initialDuels = lastWeekBets ? flattenDuels(lastWeekBets) : [];
                setBetHistory(initialDuels);
            } else {
                await loadMoreDuels(); // Load if yesterdaysDuels not available
            }
        };
        fetchInitialDuels();
    }, [groupID, groups]);

    // Flatten the duels from the fetched data
    const flattenDuels = (duels: { [key: string]: any }) => Object.values(duels);


    // Function to fetch duels based on daysAgo
    const loadMoreDuels = async () => {
        console.log("WeeklyBethistory - Loading more duels");
        const moreDuels = await getMoreWeeklyDuelsSummary(groupID, weeksAgo);
        console.log('WeeklyBetHistory - loadMoreDuels: moreDuels', moreDuels)
        if (moreDuels) {
            // Flatten and append new duels
            const newDuels = flattenDuels(moreDuels);
            setBetHistory((prevBetHistory) => [...prevBetHistory, ...newDuels]);
            setWeeksAgo((prevWeeksAgo) => prevWeeksAgo + 1); // Increment daysAgo for the next load
        }
    };

    const truncateString = (str: string, maxLength: number) => {
        return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    };

    const currentRecapBets = betHistory.map((bet) => {
        const player1 = groups[groupID]?.users[bet.player1]?.username;
        const player1Truncated = truncateString(player1, 8);
        const player2 = groups[groupID]?.users[bet.player2]?.username;
        const player2Truncated = truncateString(player2, 8);
        const player1pfp = groups[groupID]?.users[bet.player1]?.profilePic;
        const player2pfp = groups[groupID]?.users[bet.player2]?.profilePic;

        // Calculate days since createdAt
        const now = new Date();
        const createdAtDate = bet.createdAt.toDate();  // Convert Firestore Timestamp to JavaScript Date
        const timeDifference = now.getTime() - createdAtDate.getTime();
        const daysSinceCreated = Math.floor(timeDifference / (1000 * 60 * 60 * 24));  // Convert ms to days and floor it
        const weeks = Math.floor(daysSinceCreated / 7);

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
        if (bet.bets[0]?.wager == null || (bet.bets !== undefined && bet.bets.length === 0)) {
            return {
                duelID: bet.duelID,
                player1: player1Truncated,
                player2: player2Truncated,
                player1pfp,
                player2pfp,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
                earnings,
                createdAt: `${weeks}w ago`,
            };
        }

        else {
            // Separate bets for player1 and player2
            const player1Bets = bet.bets
                .filter((b: BetItem) => b.betOnUserID === bet.player1)
                .map((b: BetItem) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));
            const player2Bets = bet.bets
                .filter((b: BetItem) => b.betOnUserID === bet.player2)
                .map((b: BetItem) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));
            const hasBet = bet.bets.some((betItem: BetItem)=>
                betItem.userID === userID,
            );
            const hasUserWon = bet.bets.some((betItem: BetItem) =>
                betItem.userID === userID && betItem.betOnUserID === bet.winner,
            );
            const calculateEarnings = () => {
                const userBet = bet.bets.find((betItem: BetItem) => betItem.userID === userID);

                // No bet
                if (!userBet) return 0;

                // draw
                if(bet.winner == "draw") return 0;

                // User lost bet
                if (userBet.betOnUserID !== bet.winner) {
                    return -userBet.wager;
                }

                // User won bet
                let totalWagers = 0;
                let totalWagersOnWinner = 0;
                bet.bets.forEach((betItem: BetItem) => {
                    totalWagers += betItem.wager;
                    if (betItem.betOnUserID === bet.winner) {
                        totalWagersOnWinner += betItem.wager;
                    }
                });
                console.log("totalWagersOnWinner", totalWagersOnWinner);

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
            console.log(earnings);
            console.log('player1 bets: ', player1Bets);
            console.log('player2 bets: ', player2Bets);

            return {
                duelID: bet.duelID,
                player1: player1Truncated,
                player2: player2Truncated,
                player1pfp,
                player2pfp,
                player1Bets,
                player2Bets,
                winner,
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
                earnings,
                createdAt: `${weeks}w ago`,
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
    

    const renderBetItem = ({ item }: { item: { duelID: string, createdAt: string, player1: string, player2: string, player1pfp: string, player2pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string, playerOneSteps: number,  playerTwoSteps: number, earnings: { hasBet: boolean, hasUserWon: boolean, earning: number } } }) => {
        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded
    
        return (
            <View style={[styles.flatList, { width: screenWidth * 0.9 }]}>
                {/* Players */}
                <TouchableOpacity onPress={() => (item.player2Bets.length > 1 || item.player1Bets.length > 1) ? toggleItemExpansion(item.duelID) : null}
                    activeOpacity={(item.player2Bets.length > 1 || item.player1Bets.length > 1) ? 0.2 : 1}>
                        <View style={styles.row}>
                    {/* Created At timestamp on the left */}
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 8, paddingTop: 3 }}>
                        <Text style={styles.createdAtText}>{item.createdAt}</Text>
                    </View>
                    {/* <View style={styles.spacer} /> */}
                    
                        <View style={[
                            styles.statusBar,
                            (!item.earnings.hasBet || item.winner === 'draw' || item.earnings.earning === 0) ? styles.drawStatus :
                            (item.earnings.hasUserWon) ? styles.winStatus : styles.loseStatus,
                        ]}>
                            <Text style={styles.statusText}>
                                {!item.earnings.hasBet ? 'No bet' :
                                item.winner === 'draw' ? 'Draw' :
                                item.earnings.earning === 0 ? 'No winnings' :
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
                            {item.winner === item.player1 && (
                                <Text style={styles.triangleText}>▶</Text>
                            )}
                            <Text style={[
                                styles.steps,
                                item.winner === item.player2 && styles.loserText,
                            ]}>{item.playerOneSteps}</Text>
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
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>
                    <Text style={styles.title}>Bets History</Text>
                    <FlatList
                        data={currentRecapBets}
                        keyExtractor={(item) => item.duelID}
                        renderItem={renderBetItem}
                        onEndReached={loadMoreDuels} // Load more duels when reaching the end
                        onEndReachedThreshold={0.5} // Trigger when scrolled 50% from the bottom
                    />
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        marginTop: 50,
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
    },
    backImage: {
        width: 19,
        height: 19,
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
        fontSize: 20,
        fontWeight: "200",
        fontFamily: 'Lexend',
        color: '#fff',
        paddingTop: 20,
        marginBottom: 20,
    },
    flatList: {
        borderWidth: 3,
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
    createdAtText: {
        color: '#808080',
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

export default BetsHistoryPage;