import React, { useEffect, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { getMoreWeeklyDuelsSummary, getWeeklyGainsSummary, getRacesSummary, getMorePropBets } from '@/backend/src/bets';
import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { useUser } from '../../../UserProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';


const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;


const BetsHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [betHistory, setBetHistory] = useState<any[]>([]);
    const [propBetHistory, setPropBetHistory] = useState<any[]>([]);
    const [duelsFilter, setDuelsFilter] = useState(true);
    const [propBetsFilter, setPropBetsFilter] = useState(true);
    const [duelsOffset, setDuelsOffset] = useState(1); // Weeks offset for duel bets
    const [propBetsOffset, setPropBetsOffset] = useState(1); // Days offset for prop bets
    
    const router = useRouter();

    interface BetItem {
        userID: string;
        wager: number;
        betOnUserID: string;
    }
    
    // Initial load for yesterday's duels
    useEffect(() => {
        const fetchInitialDuels = async () => {
            const lastWeekBets = groups[groupID]?.lastWeekDuels;
            const lastWeekPropBets = groups[groupID]?.lastWeekPropBets;
            console.log("lastWeekBets: ", lastWeekBets)
            if (lastWeekBets) {
                const initialDuels = lastWeekBets ? flattenDuels(lastWeekBets) : [];
                const initialPropBets = lastWeekPropBets ? flattenDuels(lastWeekPropBets) : [];
                setBetHistory(initialDuels);
                setPropBetHistory(initialPropBets);
            } else {
                await loadMoreDuels();
            }
        };
        fetchInitialDuels();
    }, [groupID, groups]);

    const formatCreatedAt = (date: Date) => {
        const now = new Date();
        const timeDifference = now.getTime() - date.getTime();
        const hoursSinceCreated = Math.floor(timeDifference / (1000 * 60 * 60));
        const daysSinceCreated = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const weeksSinceCreated = Math.floor(daysSinceCreated / 7);
        const monthsSinceCreated = Math.floor(daysSinceCreated / 30);

        if (hoursSinceCreated < 1) {
            return '< 1 hour ago';
        } else if (daysSinceCreated < 1) {
            return `${hoursSinceCreated} hour${hoursSinceCreated > 1 ? 's' : ''} ago`;
        } else if (daysSinceCreated === 1) {
            return `Yesterday`;
        } else if (daysSinceCreated < 7) {
            return `${daysSinceCreated} day${daysSinceCreated > 1 ? 's' : ''} ago`;
        } else if (weeksSinceCreated < 4) {
            return `${weeksSinceCreated} week${weeksSinceCreated > 1 ? 's' : ''} ago`;
        } else {
            return `${monthsSinceCreated} month${monthsSinceCreated > 1 ? 's' : ''} ago`;
        }
    }

    // Flatten the duels from the fetched data
    const flattenDuels = (duels: { [key: string]: any }) => Object.values(duels);


    // Function to fetch duels based on daysAgo
    const loadMoreDuels = async () => {
        console.log("WeeklyBethistory - Loading more duels & prop bets");
        const moreDuels = await getMoreWeeklyDuelsSummary(groupID, duelsOffset);
        const morePropBets = await getMorePropBets(groupID, userID, propBetsOffset);
        console.log('WeeklyBetHistory - loadMoreDuels: moreDuels', moreDuels)
        console.log('WeeklyBetHistory - loadMorePropBets: morePropBets', morePropBets)
        if (moreDuels) {
            // Flatten and merge new duel bets.
            const newDuels = flattenDuels(moreDuels);
            setBetHistory((prevBetHistory) => {
                // Merge existing and new bets, filtering duplicates based on duelID
                const merged = [...prevBetHistory, ...newDuels];
                return merged.filter(
                    (item, index, array) =>
                        index === array.findIndex((t) => t.duelID === item.duelID)
                );
            });
            // Increment weekly offset for the next load
            setDuelsOffset((prev) => prev + 1);
        }

        if (morePropBets) {
            // Flatten and merge new prop bets.
            const newPropBets = flattenDuels(morePropBets);
            setPropBetHistory((prevPropBetHistory) => {
                // Merge existing and new prop bets, filtering duplicates based on duelID
                const merged = [...prevPropBetHistory, ...newPropBets];
                return merged.filter(
                    (item, index, array) =>
                        index === array.findIndex((t) => t.duelID === item.duelID)
                );
            });
            // Increment daily offset for prop bets so that subsequent queries target a new day
            setPropBetsOffset((prev) => prev + 1);
        }
    };

    const currentDuelsBets = betHistory.map((bet) => {
        const player1 = groups[groupID]?.users[bet.player1]?.username;
        const player2 = groups[groupID]?.users[bet.player2]?.username;
        const player1pfp = groups[groupID]?.users[bet.player1]?.profilePic;
        const player2pfp = groups[groupID]?.users[bet.player2]?.profilePic;

        const timePast = formatCreatedAt(bet.createdAt.toDate());

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
                type: 'duel',
                player1: player1,
                player2: player2,
                player1pfp,
                player2pfp,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
                earnings,
                createdAt: bet.createdAt.toDate(),
                timePast: timePast,
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
                type: 'duel',
                player1: player1,
                player2: player2,
                player1pfp,
                player2pfp,
                player1Bets,
                player2Bets,
                winner,
                playerOneSteps: Math.floor(bet.playerOneSteps),
                playerTwoSteps: Math.floor(bet.playerTwoSteps),
                earnings,
                createdAt: bet.createdAt.toDate(),
                timePast: timePast,
            };
        }
    });

    const currentPropBets = propBetHistory?.map((propBet) => {
        const timePast = formatCreatedAt(propBet.createdAt.toDate());

        return {
            duelID: propBet.duelID,
            type: 'prop',
            // In prop bets, the first container shows the bettor's info and steps
            player1: groups[groupID]?.users[propBet.betOnUserID]?.username,
            player1pfp: groups[groupID]?.users[propBet.betOnUserID]?.profilePic,
            playerOneSteps: Math.floor(propBet.steps ?? 0),
            // The second container is a fixed "Your prop bet" area with your profile image
            player2: 'Your prop bet',
            player2pfp: groups[groupID]?.users[userID]?.profilePic,
            // Instead of steps, display over/under information (for example: "Over 3000 steps")
            overUnderText: `${propBet.overUnder === 'over' ? 'Over' : 'Under'} ${propBet.averageStepCount} steps`,
            // Earnings: win gives +1 diamond; lose gives 0; no "draw" option here.
            earnings: {
                hasBet: true,
                hasUserWon: propBet.win,
                earning: propBet.win ? 1 : 0,
            },
            createdAt: propBet.createdAt.toDate(),
            timePast: timePast,
        };
    });

    // Merge both recaps into one array, sorted by createdAt
    currentDuelsBets.sort((a, b) => b.createdAt - a.createdAt);
    currentPropBets?.sort((a, b) => b.createdAt - a.createdAt);
    const allRecapBets = [...currentDuelsBets, ...(currentPropBets || [])].sort((a, b) => b.createdAt - a.createdAt);

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
    

    const renderBetItem = ({ item }: { item: any }) => {
        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded

        if (item.type === "prop") {
            return (
                <View style={styles.flatList}>
                    <View style={{ flex: 1, alignItems: "flex-start", paddingLeft: 8, paddingVertical: 5 }}>
                        <Text style={styles.createdAtText}>{item.timePast}</Text>
                    </View>
                    <View style={styles.betsContainer}>
                        <TouchableOpacity activeOpacity={1}>
                            <View style={styles.row}>
                                <View
                                    style={[
                                        styles.statusBar,
                                        item.earnings.hasUserWon ? styles.winStatus : styles.loseStatus,
                                    ]}
                                >
                                    <Text style={styles.statusText}>
                                        {item.earnings.hasUserWon ? "Win" : "Loss"}
                                    </Text>
                                </View>
                                <View style={styles.earningsContainer}>
                                    <Text
                                        style={
                                            item.earnings.hasUserWon ? styles.wonEarningsText : styles.drawEarningsText
                                        }
                                    >
                                        {item.earnings.hasUserWon ? "+1" : "0"}
                                    </Text>
                                    <Image
                                        source={require("@assets/icons/diamonds.png")}
                                        style={{
                                            width: 20,
                                            height: 16,
                                            tintColor: item.earnings.hasUserWon ? "#74FF6D" : "#fff",
                                        }}
                                    />
                                </View>
                            </View>
                            <View style={styles.horizontalLine}></View>
                            {/* Player 1 container: shows the bettor’s info and steps */}
                            <View style={styles.playerContainer}>
                                <View style={styles.row}>
                                    <Image source={{ uri: item.player1pfp }} style={styles.profileImage} />
                                    <Text style={styles.player}>{item.player1}</Text>
                                    <Text style={styles.steps}>{item.playerOneSteps} steps</Text>
                                </View>
                            </View>
                            {/* Player 2 container: shows fixed text, your profile image, and over/under info */}
                            <View style={styles.playerContainer}>
                                <View style={styles.row}>
                                    <Image source={{ uri: item.player2pfp }} style={styles.profileImage} />
                                    <Text style={styles.player}>{item.player2}</Text>
                                    <Text style={styles.steps}>{item.overUnderText}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
    
        return (
            <View style={styles.flatList}>
                <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 8, paddingVertical: 5 }}>
                    <Text style={styles.createdAtText}>{item.timePast}</Text>
                </View>
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
                    <View style={[styles.row, { gap: 10, width: '95%' }]}>
                        <Text style={styles.createdAtText}>Filter By:</Text>
                        <TouchableOpacity style={[styles.filterButton, { backgroundColor: duelsFilter ? '#fff' : '#000' }]} onPress={() => setDuelsFilter(!duelsFilter)} activeOpacity={0.8}>
                            <Text style={[styles.createdAtText, { color: duelsFilter ? '#000' : '#fff' }]}>Weekly Duels</Text>
                            {duelsFilter ? 
                            <Image
                                source={require('@assets/icons/checkFilter.png')}
                                style={{ width: 12, height: 9 }}
                            /> : 
                            <Text style={{ fontFamily: 'Lexend', color: '#fff', fontSize: 13 }}>+</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterButton, { backgroundColor: propBetsFilter ? '#fff' : '#000' }]} onPress={() => setPropBetsFilter(!propBetsFilter)} activeOpacity={0.8}>
                            <Text style={[styles.createdAtText, { color: propBetsFilter ? '#000' : '#fff' }]}>Daily Prop Bets</Text>
                            {propBetsFilter ? 
                            <Image
                                source={require('@assets/icons/checkFilter.png')}
                                style={{ width: 12, height: 9 }}
                            /> : 
                            <Text style={{ fontFamily: 'Lexend', color: '#fff', fontSize: 13 }}>+</Text>}
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={
                            duelsFilter && propBetsFilter ? 
                            allRecapBets :
                            duelsFilter ? currentDuelsBets :
                            propBetsFilter ? currentPropBets : []
                        }
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
        height: '95%',
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
    filterButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fff',
        padding: 8,
        gap: 15,
        paddingHorizontal: 10,
    },
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    statusBar: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderRadius: 20,
    },
    statusText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
    winStatus: {
        backgroundColor: '#35B849', // Green color
    },
    loseStatus: {
        backgroundColor: '#FF6060', // Red color
    },
    drawStatus: {
        backgroundColor: '#808080', // Gray color
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
        marginTop: 10,
        width: screenWidth * 0.9,
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

export default BetsHistoryPage;